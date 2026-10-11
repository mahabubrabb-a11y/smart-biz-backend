import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, eq } from 'drizzle-orm';

import {
  schema,
  suppliers,
} from '../db/schema.js';

import { CreateSupplierDto } from './dto/create-supplier.dto.js';

@Injectable()
export class SuppliersService {
  constructor(
    @Inject('DRIZZLE_DB')
    private readonly database: NodePgDatabase<typeof schema>,
  ) {}

  async create(
    createSupplierDto: CreateSupplierDto,
    shopId: string,
  ) {
    const [existingSupplier] = await this.database
      .select()
      .from(suppliers)
      .where(
        and(
          eq(suppliers.shopId, shopId),
          eq(suppliers.name, createSupplierDto.name),
        ),
      );

    if (existingSupplier) {
      throw new ConflictException(
        'Supplier already exists',
      );
    }

    const [supplier] = await this.database
      .insert(suppliers)
      .values({
        shopId,
        name: createSupplierDto.name,
        phone: createSupplierDto.phone,
        address: createSupplierDto.address,
      })
      .returning();

    return supplier;
  }

  async findAll(shopId: string) {
    return this.database
      .select()
      .from(suppliers)
      .where(
        and(
          eq(suppliers.shopId, shopId),
          eq(suppliers.isActive, true),
        ),
      );
  }

  async findOne(id: string, shopId: string) {
    const [supplier] = await this.database
      .select()
      .from(suppliers)
      .where(
        and(
          eq(suppliers.id, id),
          eq(suppliers.shopId, shopId),
          eq(suppliers.isActive, true),
        ),
      );

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return supplier;
  }

  async remove(id: string, shopId: string) {
    const [supplier] = await this.database
      .update(suppliers)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(suppliers.id, id),
          eq(suppliers.shopId, shopId),
          eq(suppliers.isActive, true),
        ),
      )
      .returning();

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return {
      message: 'Supplier deleted successfully',
      supplier,
    };
  }
}
