import {
  Inject,
  Injectable,
} from '@nestjs/common';

import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, sql } from 'drizzle-orm';

import {
  schema,
  products,
  sales,
  purchases,
  saleItems,
  customers,
} from '../db/schema.js';

@Injectable()
export class DashboardService {
  constructor(
    @Inject('DRIZZLE_DB')
    private readonly database: NodePgDatabase<typeof schema>,
  ) {}

  // =========================
  // DASHBOARD SUMMARY
  // =========================
  async getSummary(shopId: string) {
    // =========================
    // SALES SUMMARY
    // =========================
    const [salesSummary] = await this.database
      .select({
        totalSales: sql<number>`
          coalesce(sum(${sales.totalAmount}), 0)
        `,
        totalPaid: sql<number>`
          coalesce(sum(${sales.paidAmount}), 0)
        `,
        totalCustomerDue: sql<number>`
          coalesce(sum(${sales.dueAmount}), 0)
        `,
      })
      .from(sales)
      .where(eq(sales.shopId, shopId));

    // =========================
    // PURCHASE SUMMARY
    // =========================
    const [purchaseSummary] = await this.database
      .select({
        totalPurchases: sql<number>`
          coalesce(sum(${purchases.totalAmount}), 0)
        `,
        totalPurchasePaid: sql<number>`
          coalesce(sum(${purchases.paidAmount}), 0)
        `,
        totalSupplierDue: sql<number>`
          coalesce(sum(${purchases.dueAmount}), 0)
        `,
      })
      .from(purchases)
      .where(eq(purchases.shopId, shopId));

    // =========================
    // STOCK SUMMARY
    // =========================
    const [stockSummary] = await this.database
      .select({
        totalProducts: sql<number>`
          count(*)
        `,
        totalStock: sql<number>`
          coalesce(sum(${products.stock}), 0)
        `,
        lowStockProducts: sql<number>`
          count(*) filter (
            where ${products.stock} <= 5
          )
        `,
      })
      .from(products)
      .where(
        sql`
          ${products.shopId} = ${shopId}
          and ${products.isActive} = true
        `,
      );

    // =========================
    // TODAY SALES
    // =========================
    const [todaySales] = await this.database
      .select({
        total: sql<number>`
          coalesce(sum(${sales.totalAmount}), 0)
        `,
      })
      .from(sales)
      .where(
        sql`
          ${sales.shopId} = ${shopId}
          and ${sales.createdAt} >= current_date
        `,
      );

    // =========================
    // PROFIT SUMMARY
    // =========================
    const [profitSummary] = await this.database
      .select({
        revenue: sql<number>`
          coalesce(sum(${saleItems.total}), 0)
        `,
        cost: sql<number>`
          coalesce(
            sum(
              ${saleItems.costPrice} *
              ${saleItems.quantity}
            ),
            0
          )
        `,
      })
      .from(saleItems)
      .innerJoin(
        sales,
        eq(saleItems.saleId, sales.id),
      )
      .where(eq(sales.shopId, shopId));

    const revenue = Number(profitSummary.revenue);
    const cost = Number(profitSummary.cost);
    const grossProfit = revenue - cost;

    // =========================
    // FINAL RESPONSE
    // =========================
    return {
      sales: {
        total: Number(salesSummary.totalSales),
        paid: Number(salesSummary.totalPaid),
        customerDue: Number(
          salesSummary.totalCustomerDue,
        ),
        today: Number(todaySales.total),
      },

      purchases: {
        total: Number(
          purchaseSummary.totalPurchases,
        ),
        paid: Number(
          purchaseSummary.totalPurchasePaid,
        ),
        supplierDue: Number(
          purchaseSummary.totalSupplierDue,
        ),
      },

      profit: {
        revenue,
        cost,
        grossProfit,
      },

      inventory: {
        totalProducts: Number(
          stockSummary.totalProducts,
        ),
        totalStock: Number(
          stockSummary.totalStock,
        ),
        lowStockProducts: Number(
          stockSummary.lowStockProducts,
        ),
      },
    };
  }

  // =========================
  // DAILY SALES
  // =========================
  async getDailySales(shopId: string) {
    const dailySales = await this.database
      .select({
        date: sql<string>`
          to_char(
            ${sales.createdAt},
            'YYYY-MM-DD'
          )
        `,
        totalSales: sql<number>`
          coalesce(
            sum(${sales.totalAmount}),
            0
          )
        `,
      })
      .from(sales)
      .where(eq(sales.shopId, shopId))
      .groupBy(
        sql`
          to_char(
            ${sales.createdAt},
            'YYYY-MM-DD'
          )
        `,
      )
      .orderBy(
        sql`
          min(${sales.createdAt})
        `,
      );

    return dailySales.map((item) => ({
      date: item.date,
      sales: Number(item.totalSales),
    }));
  }

  // =========================
  // TOP SELLING PRODUCTS
  // =========================
  async getTopProducts(shopId: string) {
    const topProducts = await this.database
      .select({
        productId: products.id,
        productName: products.name,

        totalQuantity: sql<number>`
          coalesce(
            sum(${saleItems.quantity}),
            0
          )
        `,

        totalRevenue: sql<number>`
          coalesce(
            sum(${saleItems.total}),
            0
          )
        `,
      })
      .from(saleItems)
      .innerJoin(
        sales,
        eq(saleItems.saleId, sales.id),
      )
      .innerJoin(
        products,
        eq(saleItems.productId, products.id),
      )
      .where(
        eq(sales.shopId, shopId),
      )
      .groupBy(
        products.id,
        products.name,
      )
      .orderBy(
        sql`
          sum(${saleItems.quantity}) DESC
        `,
      )
      .limit(5);

    return topProducts.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      totalQuantity: Number(
        item.totalQuantity,
      ),
      totalRevenue: Number(
        item.totalRevenue,
      ),
    }));
  }

  // =========================
  // MONTHLY SALES
  // =========================
  async getMonthlySales(shopId: string) {
    const monthlySales = await this.database
      .select({
        month: sql<string>`
          to_char(
            ${sales.createdAt},
            'YYYY-MM'
          )
        `,

        totalSales: sql<number>`
          coalesce(
            sum(${sales.totalAmount}),
            0
          )
        `,
      })
      .from(sales)
      .where(eq(sales.shopId, shopId))
      .groupBy(
        sql`
          to_char(
            ${sales.createdAt},
            'YYYY-MM'
          )
        `,
      )
      .orderBy(
        sql`
          min(${sales.createdAt})
        `,
      );

    return monthlySales.map((item) => ({
      month: item.month,
      sales: Number(item.totalSales),
    }));
  }

  // =========================
  // PROFIT TREND
  // =========================
  async getProfitTrend(shopId: string) {
    const profitTrend = await this.database
      .select({
        date: sql<string>`
          to_char(
            ${sales.createdAt},
            'YYYY-MM-DD'
          )
        `,

        revenue: sql<number>`
          coalesce(
            sum(${saleItems.total}),
            0
          )
        `,

        cost: sql<number>`
          coalesce(
            sum(
              ${saleItems.costPrice} *
              ${saleItems.quantity}
            ),
            0
          )
        `,
      })
      .from(saleItems)
      .innerJoin(
        sales,
        eq(saleItems.saleId, sales.id),
      )
      .where(eq(sales.shopId, shopId))
      .groupBy(
        sql`
          to_char(
            ${sales.createdAt},
            'YYYY-MM-DD'
          )
        `,
      )
      .orderBy(
        sql`
          min(${sales.createdAt})
        `,
      );

    return profitTrend.map((item) => {
      const revenue = Number(item.revenue);
      const cost = Number(item.cost);

      return {
        date: item.date,
        revenue,
        cost,
        grossProfit: revenue - cost,
      };
    });
  }

  // =========================
  // LOW STOCK PRODUCTS
  // =========================
  async getLowStockProducts(shopId: string) {
    const lowStockProducts = await this.database
      .select({
        productId: products.id,
        productName: products.name,
        sku: products.sku,
        stock: products.stock,
      })
      .from(products)
      .where(
        sql`
          ${products.shopId} = ${shopId}
          and ${products.isActive} = true
          and ${products.stock} <= 5
        `,
      )
      .orderBy(
        sql`${products.stock} ASC`,
      );

    return lowStockProducts.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      stock: Number(item.stock),
    }));
  }

  // =========================
  // CUSTOMER DUE
  // =========================
  async getCustomerDue(shopId: string) {
    const customerDue = await this.database
      .select({
        customerId: customers.id,
        customerName: customers.name,

        totalSales: sql<number>`
          coalesce(
            sum(${sales.totalAmount}),
            0
          )
        `,

        paid: sql<number>`
          coalesce(
            sum(${sales.paidAmount}),
            0
          )
        `,

        due: sql<number>`
          coalesce(
            sum(${sales.dueAmount}),
            0
          )
        `,
      })
      .from(sales)
      .innerJoin(
        customers,
        eq(sales.customerId, customers.id),
      )
      .where(
        sql`
          ${sales.shopId} = ${shopId}
          and ${sales.dueAmount} > 0
        `,
      )
      .groupBy(
        customers.id,
        customers.name,
      )
      .orderBy(
        sql`
          sum(${sales.dueAmount}) DESC
        `,
      );

    return customerDue.map((item) => ({
      customerId: item.customerId,
      customerName: item.customerName,
      totalSales: Number(item.totalSales),
      paid: Number(item.paid),
      due: Number(item.due),
    }));
  }
}
