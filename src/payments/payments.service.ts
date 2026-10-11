import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, eq } from 'drizzle-orm';

import { randomUUID } from 'crypto';

import {
  schema,
  sales,
  payments,
  paymentTransactions,
} from '../db/schema.js';

import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { InitSslcommerzPaymentDto } from './dto/init-sslcommerz-payment.dto.js';
import { SslcommerzService } from './sslcommerz.service.js';

@Injectable()
export class PaymentsService {
  constructor(
    @Inject('DRIZZLE_DB')
    private readonly database: NodePgDatabase<typeof schema>,

    private readonly sslcommerzService: SslcommerzService,
  ) {}

  // =====================================================
  // Manual Payment
  // =====================================================

  async create(
    dto: CreatePaymentDto,
    shopId: string,
  ) {
    return this.database.transaction(async (tx) => {
      // Find sale belonging to this shop
      const [sale] = await tx
        .select()
        .from(sales)
        .where(
          and(
            eq(sales.id, dto.saleId),
            eq(sales.shopId, shopId),
          ),
        );

      if (!sale) {
        throw new NotFoundException(
          'Sale not found',
        );
      }

      // No due means nothing to pay
      if (sale.dueAmount === 0) {
        throw new BadRequestException(
          'This sale has no due amount',
        );
      }

      // Payment cannot be greater than due
      if (dto.amount > sale.dueAmount) {
        throw new BadRequestException(
          'Payment cannot be greater than due amount',
        );
      }

      const newPaidAmount =
        sale.paidAmount + dto.amount;

      const newDueAmount =
        sale.totalAmount - newPaidAmount;

      let paymentStatus:
        | 'paid'
        | 'partial'
        | 'unpaid' = 'partial';

      if (newDueAmount === 0) {
        paymentStatus = 'paid';
      }

      // Save manual payment
      const [payment] = await tx
        .insert(payments)
        .values({
          shopId,
          saleId: dto.saleId,
          amount: dto.amount,
          paymentMethod: dto.paymentMethod,
        })
        .returning();

      // Update sale
      const [updatedSale] = await tx
        .update(sales)
        .set({
          paidAmount: newPaidAmount,
          dueAmount: newDueAmount,
          paymentStatus,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(sales.id, dto.saleId),
            eq(sales.shopId, shopId),
          ),
        )
        .returning();

      return {
        payment,
        sale: updatedSale,
      };
    });
  }

  // =====================================================
  // SSLCommerz Payment Init
  // =====================================================

  async initSslcommerzPayment(
    dto: InitSslcommerzPaymentDto,
    shopId: string,
  ) {
    // Find sale
    const [sale] = await this.database
      .select()
      .from(sales)
      .where(
        and(
          eq(sales.id, dto.saleId),
          eq(sales.shopId, shopId),
        ),
      );

    if (!sale) {
      throw new NotFoundException(
        'Sale not found',
      );
    }

    // Check due
    if (sale.dueAmount === 0) {
      throw new BadRequestException(
        'This sale has no due amount',
      );
    }

    /*
     * IMPORTANT:
     *
     * We NEVER trust amount from frontend.
     *
     * Actual amount always comes from
     * the sale stored in PostgreSQL.
     */

    const amount = sale.dueAmount;

    /*
     * SSLCommerz tran_id has a length limit.
     *
     * So we generate a short unique transaction ID.
     *
     * Example:
     *
     * SBXXX123ABC456DEF
     */

    const tranId =
      `SB${Date.now().toString(36).toUpperCase()}${randomUUID()
        .replaceAll('-', '')
        .slice(0, 10)
        .toUpperCase()}`;

    const customerName =
      dto.customerName ??
      'SmartBiz Customer';

    const customerEmail =
      dto.customerEmail ??
      'customer@example.com';

    // ===================================================
    // 1. Create pending transaction
    // ===================================================

    const [transaction] =
      await this.database
        .insert(paymentTransactions)
        .values({
          shopId,
          saleId: sale.id,
          transactionId: tranId,
          amount,
          status: 'pending',
        })
        .returning();

    try {
      // =================================================
      // 2. Initialize SSLCommerz
      // =================================================

      const result =
        await this.sslcommerzService.initiatePayment({
          tranId,
          amount,
          customerName,
          customerEmail,
          customerPhone:
            dto.customerPhone,
          customerAddress:
            dto.customerAddress,
        });

      // =================================================
      // 3. Send gateway URL to frontend
      // =================================================

      return {
        success: true,
        saleId: sale.id,
        transactionId:
          transaction.transactionId,
        amount,
        gatewayPageURL:
          result.gatewayPageURL,
        sessionKey:
          result.sessionKey,
      };
    } catch (error) {
      // =================================================
      // 4. SSLCommerz initialization failed
      // =================================================

      await this.database
        .update(paymentTransactions)
        .set({
          status: 'failed',
          updatedAt: new Date(),
        })
        .where(
          eq(
            paymentTransactions.id,
            transaction.id,
          ),
        );

      throw error;
    }
  }

  // =====================================================
  // SSLCommerz Success
  // =====================================================

  async handleSslcommerzSuccess(
    data: {
      tran_id?: string;
      val_id?: string;
      amount?: string;
      status?: string;
    },
  ) {
    const tranId = data.tran_id;
    const valId = data.val_id;

    if (!tranId || !valId) {
      throw new BadRequestException(
        'Invalid SSLCommerz response',
      );
    }

    // Find transaction
    const [transaction] =
      await this.database
        .select()
        .from(paymentTransactions)
        .where(
          eq(
            paymentTransactions.transactionId,
            tranId,
          ),
        );

    if (!transaction) {
      throw new NotFoundException(
        'Payment transaction not found',
      );
    }

    // Prevent duplicate payment
    if (transaction.status === 'success') {
      return {
        success: true,
        message: 'Payment already processed',
        transactionId:
          transaction.transactionId,
      };
    }

    // Validate directly with SSLCommerz
    const validation =
      await this.sslcommerzService.validatePayment(
        valId,
      );

    if (
      validation?.status !== 'VALID' &&
      validation?.status !== 'VALIDATED'
    ) {
      await this.database
        .update(paymentTransactions)
        .set({
          status: 'failed',
          validationId: valId,
          gatewayResponse:
            JSON.stringify(validation),
          updatedAt: new Date(),
        })
        .where(
          eq(
            paymentTransactions.id,
            transaction.id,
          ),
        );

      throw new BadRequestException(
        'SSLCommerz payment validation failed',
      );
    }

    // Verify transaction ID
    if (
      validation.tran_id !==
      transaction.transactionId
    ) {
      await this.database
        .update(paymentTransactions)
        .set({
          status: 'failed',
          validationId: valId,
          gatewayResponse:
            JSON.stringify(validation),
          updatedAt: new Date(),
        })
        .where(
          eq(
            paymentTransactions.id,
            transaction.id,
          ),
        );

      throw new BadRequestException(
        'Payment transaction ID mismatch',
      );
    }

    // Verify currency
    if (validation.currency !== 'BDT') {
      await this.database
        .update(paymentTransactions)
        .set({
          status: 'failed',
          validationId: valId,
          gatewayResponse:
            JSON.stringify(validation),
          updatedAt: new Date(),
        })
        .where(
          eq(
            paymentTransactions.id,
            transaction.id,
          ),
        );

      throw new BadRequestException(
        'Payment currency mismatch',
      );
    }

    // Verify gateway amount
    const gatewayAmount = Number(
      validation.amount,
    );

    if (
      !Number.isFinite(gatewayAmount) ||
      gatewayAmount !== transaction.amount
    ) {
      await this.database
        .update(paymentTransactions)
        .set({
          status: 'failed',
          validationId: valId,
          gatewayResponse:
            JSON.stringify(validation),
          updatedAt: new Date(),
        })
        .where(
          eq(
            paymentTransactions.id,
            transaction.id,
          ),
        );

      throw new BadRequestException(
        'Payment amount mismatch',
      );
    }

    // Update payment + sale + transaction together
    return this.database.transaction(
      async (tx) => {
        const [sale] = await tx
          .select()
          .from(sales)
          .where(
            and(
              eq(
                sales.id,
                transaction.saleId,
              ),
              eq(
                sales.shopId,
                transaction.shopId,
              ),
            ),
          );

        if (!sale) {
          throw new NotFoundException(
            'Sale not found',
          );
        }

        if (
          transaction.amount >
          sale.dueAmount
        ) {
          throw new BadRequestException(
            'Payment amount is greater than sale due',
          );
        }

        const newPaidAmount =
          sale.paidAmount +
          transaction.amount;

        const newDueAmount =
          sale.totalAmount -
          newPaidAmount;

        const paymentStatus =
          newDueAmount === 0
            ? 'paid'
            : 'partial';

        // Create final payment
        const [payment] = await tx
          .insert(payments)
          .values({
            shopId:
              transaction.shopId,
            saleId:
              transaction.saleId,
            amount:
              transaction.amount,
            paymentMethod:
              'sslcommerz',
          })
          .returning();

        // Update sale
        const [updatedSale] =
          await tx
            .update(sales)
            .set({
              paidAmount:
                newPaidAmount,
              dueAmount:
                newDueAmount,
              paymentStatus,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(
                  sales.id,
                  transaction.saleId,
                ),
                eq(
                  sales.shopId,
                  transaction.shopId,
                ),
              ),
            )
            .returning();

        // Mark transaction successful
        const [
          updatedTransaction,
        ] = await tx
          .update(
            paymentTransactions,
          )
          .set({
            status: 'success',
            validationId: valId,
            gatewayResponse:
              JSON.stringify(validation),
            updatedAt: new Date(),
          })
          .where(
            eq(
              paymentTransactions.id,
              transaction.id,
            ),
          )
          .returning();

        return {
          success: true,
          payment,
          sale: updatedSale,
          transaction:
            updatedTransaction,
        };
      },
    );
  }

  // =====================================================
  // SSLCommerz Failed / Cancelled
  // =====================================================

  async handleSslcommerzFailed(
    tranId: string | undefined,
    status:
      | 'failed'
      | 'cancelled',
  ) {
    if (!tranId) {
      throw new BadRequestException(
        'Transaction ID is missing',
      );
    }

    const [transaction] =
      await this.database
        .select()
        .from(paymentTransactions)
        .where(
          eq(
            paymentTransactions.transactionId,
            tranId,
          ),
        );

    if (!transaction) {
      throw new NotFoundException(
        'Payment transaction not found',
      );
    }

    // Do not overwrite successful payment
    if (transaction.status === 'success') {
      return {
        success: true,
        message:
          'Payment was already successful',
      };
    }

    const [
      updatedTransaction,
    ] = await this.database
      .update(paymentTransactions)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(
        eq(
          paymentTransactions.id,
          transaction.id,
        ),
      )
      .returning();

    return {
      success: false,
      transaction:
        updatedTransaction,
    };
  }

  // =====================================================
  // Payment List
  // =====================================================

  async findAll(shopId: string) {
    return this.database
      .select()
      .from(payments)
      .where(
        eq(
          payments.shopId,
          shopId,
        ),
      );
  }

  // =====================================================
  // Payments By Sale
  // =====================================================

  async findBySale(
    saleId: string,
    shopId: string,
  ) {
    // First verify sale belongs to shop
    const [sale] =
      await this.database
        .select()
        .from(sales)
        .where(
          and(
            eq(sales.id, saleId),
            eq(sales.shopId, shopId),
          ),
        );

    if (!sale) {
      throw new NotFoundException(
        'Sale not found',
      );
    }

    // Return payments
    return this.database
      .select()
      .from(payments)
      .where(
        and(
          eq(
            payments.saleId,
            saleId,
          ),
          eq(
            payments.shopId,
            shopId,
          ),
        ),
      );
  }
}