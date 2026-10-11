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
  suppliers,
  purchases,
  purchaseItems,
  inventoryMovements,
} from '../db/schema.js';

import { CreatePurchaseDto } from './dto/create-purchase.dto.js';

@Injectable()
export class PurchasesService {
  constructor(
    @Inject('DRIZZLE_DB')
    private readonly database: NodePgDatabase<typeof schema>,
  ) {}

  async create(
    dto: CreatePurchaseDto,
    shopId: string,
  ) {
    const [supplier] = await this.database
      .select()
      .from(suppliers)
      .where(
        and(
          eq(suppliers.id, dto.supplierId),
          eq(suppliers.shopId, shopId),
          eq(suppliers.isActive, true),
        ),
      );

    if (!supplier) {
      throw new NotFoundException(
        'Supplier not found',
      );
    }

    if (!dto.items.length) {
      throw new BadRequestException(
        'Purchase must contain at least one product',
      );
    }

    const totalAmount = dto.items.reduce(
      (sum, item) =>
        sum + item.quantity * item.costPrice,
      0,
    );

    const paidAmount = dto.paidAmount ?? 0;

    if (paidAmount > totalAmount) {
      throw new BadRequestException(
        'Paid amount cannot be greater than total amount',
      );
    }

    const dueAmount = totalAmount - paidAmount;

    let status = 'unpaid';

    if (paidAmount === totalAmount) {
      status = 'paid';
    } else if (paidAmount > 0) {
      status = 'partial';
    }

    return this.database.transaction(async (tx) => {
      const [purchase] = await tx
        .insert(purchases)
        .values({
          shopId,
          supplierId: dto.supplierId,
          totalAmount,
          paidAmount,
          dueAmount,
          status,
        })
        .returning();

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

        const itemTotal =
          item.quantity * item.costPrice;

        await tx.insert(purchaseItems).values({
          purchaseId: purchase.id,
          productId: item.productId,
          quantity: item.quantity,
          costPrice: item.costPrice,
          total: itemTotal,
        });

        await tx
          .update(products)
          .set({
            stock: sql`${products.stock} + ${item.quantity}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(products.id, item.productId),
              eq(products.shopId, shopId),
              eq(products.isActive, true),
            ),
          );

        await tx
          .insert(inventoryMovements)
          .values({
            shopId,
            productId: item.productId,
            type: 'stock_in',
            quantity: item.quantity,
            note: `Purchase ${purchase.id}`,
          });
      }

      return {
        purchase,
        items: dto.items,
      };
    });
  }

  async findAll(shopId: string) {
    return this.database
      .select()
      .from(purchases)
      .where(eq(purchases.shopId, shopId));
  }

  async findOne(id: string, shopId: string) {
    const [purchase] = await this.database
      .select()
      .from(purchases)
      .where(
        and(
          eq(purchases.id, id),
          eq(purchases.shopId, shopId),
        ),
      );

    if (!purchase) {
      throw new NotFoundException(
        'Purchase not found',
      );
    }

    const items = await this.database
      .select()
      .from(purchaseItems)
      .where(
        eq(purchaseItems.purchaseId, id),
      );

    return {
      purchase,
      items,
    };
  }
}