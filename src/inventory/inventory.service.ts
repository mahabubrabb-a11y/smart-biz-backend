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
  inventoryMovements,
} from '../db/schema.js';

import { StockDto } from './dto/stock.dto.js';

@Injectable()
export class InventoryService {
  constructor(
    @Inject('DRIZZLE_DB')
    private readonly database: NodePgDatabase<typeof schema>,
  ) {}

  async stockIn(stockDto: StockDto, shopId: string) {
    const { productId, quantity, note } = stockDto;

    const [product] = await this.database
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, productId),
          eq(products.shopId, shopId),
          eq(products.isActive, true),
        ),
      );

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const result = await this.database.transaction(
      async (tx) => {
        const [updatedProduct] = await tx
          .update(products)
          .set({
            stock: sql`${products.stock} + ${quantity}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(products.id, productId),
              eq(products.shopId, shopId),
              eq(products.isActive, true),
            ),
          )
          .returning();

        const [movement] = await tx
          .insert(inventoryMovements)
          .values({
            shopId,
            productId,
            type: 'stock_in',
            quantity,
            note,
          })
          .returning();

        return {
          product: updatedProduct,
          movement,
        };
      },
    );

    return result;
  }

  async stockOut(stockDto: StockDto, shopId: string) {
    const { productId, quantity, note } = stockDto;

    const [product] = await this.database
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, productId),
          eq(products.shopId, shopId),
          eq(products.isActive, true),
        ),
      );

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.stock < quantity) {
      throw new BadRequestException(
        'Insufficient stock',
      );
    }

    const result = await this.database.transaction(
      async (tx) => {
        const [updatedProduct] = await tx
          .update(products)
          .set({
            stock: sql`${products.stock} - ${quantity}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(products.id, productId),
              eq(products.shopId, shopId),
              eq(products.isActive, true),
              sql`${products.stock} >= ${quantity}`,
            ),
          )
          .returning();

        if (!updatedProduct) {
          throw new BadRequestException(
            'Insufficient stock',
          );
        }

        const [movement] = await tx
          .insert(inventoryMovements)
          .values({
            shopId,
            productId,
            type: 'stock_out',
            quantity,
            note,
          })
          .returning();

        return {
          product: updatedProduct,
          movement,
        };
      },
    );

    return result;
  }

  async getHistory(productId: string, shopId: string) {
    const [product] = await this.database
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, productId),
          eq(products.shopId, shopId),
        ),
      );

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.database
      .select()
      .from(inventoryMovements)
      .where(
        and(
          eq(inventoryMovements.productId, productId),
          eq(inventoryMovements.shopId, shopId),
        ),
      );
  }
}
