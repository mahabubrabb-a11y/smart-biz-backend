import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, eq, sql } from 'drizzle-orm';

import {
  schema,
  products,
  sales,
  saleItems,
  inventoryMovements,
  payments,
 
} from '../db/schema.js';

import { CreateSaleDto } from './dto/create-sale.dto.js';

@Injectable()
export class SalesService {
  constructor(
    @Inject('DRIZZLE_DB')
    private readonly database: NodePgDatabase<typeof schema>,
  ) {}

  async create(
    dto: CreateSaleDto,
    shopId: string,
  ) {
    if (!dto.items.length) {
      throw new BadRequestException(
        'Sale must contain at least one product',
      );
    }

    return this.database.transaction(async (tx) => {
      // 1. Check customer if provided
      if (dto.customerId) {
        const [customer] = await tx
          .select()
          .from(schema.customers)
          .where(
            and(
              eq(schema.customers.id, dto.customerId),
              eq(schema.customers.shopId, shopId),
              eq(schema.customers.isActive, true),
            ),
          );

        if (!customer) {
          throw new NotFoundException(
            `Customer ${dto.customerId} not found`,
          );
        }
      }

      let totalAmount = 0;

      const saleItemsData: {
        productId: string;
        quantity: number;
        price: number;
        total: number;
         costPrice: number;
      }[] = [];

      // 2. Check products and calculate total
      for (const item of dto.items) {
        const [product] = await tx
          .select()
          .from(products)
          .where(
            and(
              eq(products.id, item.productId),
              eq(products.shopId, shopId),
              eq(products.isActive, true),
            ),
          );

        if (!product) {
          throw new NotFoundException(
            `Product ${item.productId} not found`,
          );
        }

        // Check stock
        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for ${product.name}`,
          );
        }

        const itemTotal =
          product.price * item.quantity;

        totalAmount += itemTotal;

        saleItemsData.push({
          productId: product.id,
          quantity: item.quantity,
          price: product.price,
          total: itemTotal,
            costPrice: product.costPrice,
        });
      }

      // 3. Calculate payment
      const paidAmount = dto.paidAmount ?? 0;

      if (paidAmount > totalAmount) {
        throw new BadRequestException(
          'Paid amount cannot be greater than total amount',
        );
      }

      // Payment method required when customer pays
      if (paidAmount > 0 && !dto.paymentMethod) {
        throw new BadRequestException(
          'Payment method is required when paid amount is greater than 0',
        );
      }

      const dueAmount =
        totalAmount - paidAmount;

      // 4. Determine payment status
      let paymentStatus:
        | 'paid'
        | 'partial'
        | 'unpaid' = 'unpaid';

      if (paidAmount === totalAmount) {
        paymentStatus = 'paid';
      } else if (paidAmount > 0) {
        paymentStatus = 'partial';
      }

      // 5. Create sale
      const [sale] = await tx
        .insert(sales)
        .values({
          shopId,
          customerId: dto.customerId,
          totalAmount,
          paidAmount,
          dueAmount,
          paymentStatus,
        })
        .returning();

      // 6. Save initial payment
      if (paidAmount > 0 && dto.paymentMethod) {
        await tx.insert(payments).values({
          shopId,
          saleId: sale.id,
          amount: paidAmount,
          paymentMethod: dto.paymentMethod,
        });
      }

      // 7. Reduce stock + create sale items
      for (const item of saleItemsData) {
        const [updatedProduct] = await tx
          .update(products)
          .set({
            stock: sql`${products.stock} - ${item.quantity}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(products.id, item.productId),
              eq(products.shopId, shopId),
              eq(products.isActive, true),
              sql`${products.stock} >= ${item.quantity}`,
            ),
          )
          .returning();

        if (!updatedProduct) {
          throw new BadRequestException(
            `Insufficient stock for product ${item.productId}`,
          );
        }

        // Create sale item
        await tx.insert(saleItems).values({
          saleId: sale.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
           costPrice: item.costPrice,
        });

        // Create inventory movement
        await tx
          .insert(inventoryMovements)
          .values({
            shopId,
            productId: item.productId,
            type: 'stock_out',
            quantity: item.quantity,
            note: `Sale ${sale.id}`,
          });
      }

      // 8. Return result
      return {
        sale,
        items: saleItemsData,
      };
    });
  }

  async findAll(shopId: string) {
    return this.database
      .select()
      .from(sales)
      .where(eq(sales.shopId, shopId));
  }

  async findOne(
    id: string,
    shopId: string,
  ) {
    const [sale] = await this.database
      .select()
      .from(sales)
      .where(
        and(
          eq(sales.id, id),
          eq(sales.shopId, shopId),
        ),
      );

    if (!sale) {
      throw new NotFoundException(
        'Sale not found',
      );
    }

    const items = await this.database
      .select()
      .from(saleItems)
      .where(eq(saleItems.saleId, id));

    return {
      sale,
      items,
    };
  }
}
