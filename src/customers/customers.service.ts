import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { eq, and, sql } from 'drizzle-orm';

import { schema } from '../db/schema.js';

import { CreateCustomerDto } from './dto/create-customer.dto.js';

@Injectable()
export class CustomersService {
  constructor(
    @Inject('DRIZZLE_DB')
    private readonly db: any,
  ) {}

  async create(
    shopId: string,
    dto: CreateCustomerDto,
  ) {
    const [customer] = await this.db
      .insert(schema.customers)
      .values({
        shopId,
        name: dto.name,
        phone: dto.phone,
        address: dto.address,
      })
      .returning();

    return customer;
  }

  async findAll(shopId: string) {
    return this.db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.shopId, shopId));
  }

  async findOne(
    shopId: string,
    id: string,
  ) {
    const [customer] = await this.db
      .select()
      .from(schema.customers)
      .where(
        and(
          eq(schema.customers.id, id),
          eq(schema.customers.shopId, shopId),
        ),
      );

    if (!customer) {
      throw new NotFoundException(
        'Customer not found',
      );
    }

    return customer;
  }


  async getSummary(
  shopId: string,
  id: string,
) {
  // 1. Check customer exists
  const customer = await this.findOne(shopId, id);

  // 2. Calculate customer sales summary
  const [summary] = await this.db
    .select({
      totalSales: sql<number>`coalesce(sum(${schema.sales.totalAmount}), 0)`,
      totalPaid: sql<number>`coalesce(sum(${schema.sales.paidAmount}), 0)`,
      totalDue: sql<number>`coalesce(sum(${schema.sales.dueAmount}), 0)`,
      totalOrders: sql<number>`count(${schema.sales.id})`,
    })
    .from(schema.sales)
    .where(
      and(
        eq(schema.sales.shopId, shopId),
        eq(schema.sales.customerId, id),
      ),
    );

  return {
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
    },
    summary: {
      totalSales: Number(summary.totalSales),
      totalPaid: Number(summary.totalPaid),
      totalDue: Number(summary.totalDue),
      totalOrders: Number(summary.totalOrders),
    },
  };
}

  async getSales(
  shopId: string,
  customerId: string,
) {
  // Check customer exists
  await this.findOne(shopId, customerId);

  // Get all sales of this customer
  const customerSales = await this.db
    .select()
    .from(schema.sales)
    .where(
      and(
        eq(schema.sales.shopId, shopId),
        eq(schema.sales.customerId, customerId),
      ),
    );

  return customerSales;
}

  async remove(
    shopId: string,
    id: string,
  ) {
    const customer = await this.findOne(
      shopId,
      id,
    );

    await this.db
      .update(schema.customers)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.customers.id, id),
          eq(schema.customers.shopId, shopId),
        ),
      );

    return {
      message: 'Customer deleted successfully',
      customerId: customer.id,
    };
  }
}
