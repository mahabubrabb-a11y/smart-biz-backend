import {
  boolean,
  pgEnum,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
  text,
} from 'drizzle-orm/pg-core';

// =====================================================
// User Role
// =====================================================

export const userRoleEnum = pgEnum('user_role', [
  'owner',
  'manager',
  'staff',
]);

// =====================================================
// Shops
// =====================================================

export const shops = pgTable('shops', {
  id: uuid('id').defaultRandom().primaryKey(),

  name: varchar('name', { length: 150 }).notNull(),

  phone: varchar('phone', { length: 20 }),

  address: varchar('address', { length: 255 }),

  isActive: boolean('is_active').default(true).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),

  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// =====================================================
// Users
// =====================================================

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),

  name: varchar('name', { length: 100 }).notNull(),

  email: varchar('email', { length: 150 })
    .notNull()
    .unique(),

  password: varchar('password', {
    length: 255,
  }).notNull(),

  role: userRoleEnum('role')
    .default('staff')
    .notNull(),

  shopId: uuid('shop_id')
    .notNull()
    .references(() => shops.id),

  isActive: boolean('is_active')
    .default(true)
    .notNull(),

  createdAt: timestamp('created_at')
    .defaultNow()
    .notNull(),

  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull(),
});

// =====================================================
// Products
// =====================================================

 
export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),

  shopId: uuid('shop_id')
    .notNull()
    .references(() => shops.id),

  name: varchar('name', {
    length: 150,
  }).notNull(),

  sku: varchar('sku', {
    length: 50,
  }).notNull(),

  price: integer('price').notNull(),

  costPrice: integer('cost_price')
    .notNull(),

  // Product image URL (Cloudinary)
  imageUrl: text('image_url'),

  stock: integer('stock')
    .default(0)
    .notNull(),

  isActive: boolean('is_active')
    .default(true)
    .notNull(),

  createdAt: timestamp('created_at')
    .defaultNow()
    .notNull(),

  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull(),
});
// =====================================================
// Inventory
// =====================================================

export const inventoryMovementTypeEnum =
  pgEnum(
    'inventory_movement_type',
    [
      'stock_in',
      'stock_out',
    ],
  );

export const inventoryMovements =
  pgTable(
    'inventory_movements',
    {
      id: uuid('id')
        .defaultRandom()
        .primaryKey(),

      shopId: uuid('shop_id')
        .notNull()
        .references(() => shops.id),

      productId: uuid('product_id')
        .notNull()
        .references(() => products.id),

      type:
        inventoryMovementTypeEnum(
          'type',
        ).notNull(),

      quantity: integer('quantity')
        .notNull(),

      note: varchar('note', {
        length: 255,
      }),

      createdAt: timestamp(
        'created_at',
      )
        .defaultNow()
        .notNull(),
    },
  );

// =====================================================
// Suppliers
// =====================================================

export const suppliers = pgTable(
  'suppliers',
  {
    id: uuid('id')
      .defaultRandom()
      .primaryKey(),

    shopId: uuid('shop_id')
      .notNull()
      .references(() => shops.id),

    name: varchar('name', {
      length: 150,
    }).notNull(),

    phone: varchar('phone', {
      length: 20,
    }),

    address: varchar('address', {
      length: 255,
    }),

    isActive: boolean('is_active')
      .default(true)
      .notNull(),

    createdAt: timestamp(
      'created_at',
    )
      .defaultNow()
      .notNull(),

    updatedAt: timestamp(
      'updated_at',
    )
      .defaultNow()
      .notNull(),
  },
);

// =====================================================
// Purchases
// =====================================================

export const purchases = pgTable(
  'purchases',
  {
    id: uuid('id')
      .defaultRandom()
      .primaryKey(),

    shopId: uuid('shop_id')
      .notNull()
      .references(() => shops.id),

    supplierId: uuid('supplier_id')
      .notNull()
      .references(() => suppliers.id),

    totalAmount: integer(
      'total_amount',
    ).notNull(),

    paidAmount: integer(
      'paid_amount',
    )
      .default(0)
      .notNull(),

    dueAmount: integer(
      'due_amount',
    )
      .default(0)
      .notNull(),

    status: varchar('status', {
      length: 20,
    })
      .default('unpaid')
      .notNull(),

    createdAt: timestamp(
      'created_at',
    )
      .defaultNow()
      .notNull(),

    updatedAt: timestamp(
      'updated_at',
    )
      .defaultNow()
      .notNull(),
  },
);

// =====================================================
// Purchase Items
// =====================================================

export const purchaseItems =
  pgTable(
    'purchase_items',
    {
      id: uuid('id')
        .defaultRandom()
        .primaryKey(),

      purchaseId: uuid('purchase_id')
        .notNull()
        .references(() => purchases.id),

      productId: uuid('product_id')
        .notNull()
        .references(() => products.id),

      quantity: integer('quantity')
        .notNull(),

      costPrice: integer(
        'cost_price',
      ).notNull(),

      total: integer('total')
        .notNull(),
    },
  );

// =====================================================
// Payment Status
// =====================================================

export const paymentStatusEnum =
  pgEnum(
    'payment_status',
    [
      'paid',
      'partial',
      'unpaid',
    ],
  );

// =====================================================
// Customers
// =====================================================

export const customers = pgTable(
  'customers',
  {
    id: uuid('id')
      .defaultRandom()
      .primaryKey(),

    shopId: uuid('shop_id')
      .notNull()
      .references(() => shops.id),

    name: varchar('name', {
      length: 150,
    }).notNull(),

    phone: varchar('phone', {
      length: 20,
    }),

    address: varchar('address', {
      length: 255,
    }),

    isActive: boolean('is_active')
      .default(true)
      .notNull(),

    createdAt: timestamp(
      'created_at',
    )
      .defaultNow()
      .notNull(),

    updatedAt: timestamp(
      'updated_at',
    )
      .defaultNow()
      .notNull(),
  },
);

// =====================================================
// Sales
// =====================================================

export const sales = pgTable('sales', {
  id: uuid('id')
    .defaultRandom()
    .primaryKey(),

  shopId: uuid('shop_id')
    .notNull()
    .references(() => shops.id),

  customerId: uuid('customer_id')
    .references(() => customers.id),

  totalAmount: integer(
    'total_amount',
  ).notNull(),

  paidAmount: integer(
    'paid_amount',
  )
    .default(0)
    .notNull(),

  dueAmount: integer(
    'due_amount',
  )
    .default(0)
    .notNull(),

  paymentStatus:
    paymentStatusEnum(
      'payment_status',
    )
      .default('unpaid')
      .notNull(),

  createdAt: timestamp(
    'created_at',
  )
    .defaultNow()
    .notNull(),

  updatedAt: timestamp(
    'updated_at',
  )
    .defaultNow()
    .notNull(),
});

// =====================================================
// Sale Items
// =====================================================

export const saleItems =
  pgTable('sale_items', {
    id: uuid('id')
      .defaultRandom()
      .primaryKey(),

    saleId: uuid('sale_id')
      .notNull()
      .references(() => sales.id),

    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),

    quantity: integer('quantity')
      .notNull(),

    price: integer('price')
      .notNull(),

    costPrice: integer(
      'cost_price',
    ).notNull(),

    total: integer('total')
      .notNull(),
  });

// =====================================================
// Payment Method
// =====================================================

export const paymentMethodEnum =
  pgEnum(
    'payment_method',
    [
      'cash',
      'card',
      'bkash',
      'nagad',
      'bank',
      'other',

      // Online payment gateway
      'sslcommerz',
    ],
  );

// =====================================================
// Payments
// =====================================================

export const payments = pgTable(
  'payments',
  {
    id: uuid('id')
      .defaultRandom()
      .primaryKey(),

    shopId: uuid('shop_id')
      .notNull()
      .references(() => shops.id),

    saleId: uuid('sale_id')
      .notNull()
      .references(() => sales.id),

    amount: integer('amount')
      .notNull(),

    paymentMethod:
      paymentMethodEnum(
        'payment_method',
      ).notNull(),

    createdAt: timestamp(
      'created_at',
    )
      .defaultNow()
      .notNull(),
  },
);

// =====================================================
// SSLCommerz Transaction Status
// =====================================================

export const paymentTransactionStatusEnum =
  pgEnum(
    'payment_transaction_status',
    [
      'pending',
      'success',
      'failed',
      'cancelled',
    ],
  );

// =====================================================
// SSLCommerz Payment Transactions
// =====================================================

export const paymentTransactions =
  pgTable(
    'payment_transactions',
    {
      id: uuid('id')
        .defaultRandom()
        .primaryKey(),

      shopId: uuid('shop_id')
        .notNull()
        .references(() => shops.id),

      saleId: uuid('sale_id')
        .notNull()
        .references(() => sales.id),

      transactionId: varchar(
        'transaction_id',
        {
          length: 100,
        },
      )
        .notNull()
        .unique(),

      amount: integer('amount')
        .notNull(),

      status:
        paymentTransactionStatusEnum(
          'status',
        )
          .notNull()
          .default('pending'),

      validationId: varchar(
        'validation_id',
        {
          length: 255,
        },
      ),

      gatewayResponse: text(
        'gateway_response',
      ),

      createdAt: timestamp(
        'created_at',
      )
        .defaultNow()
        .notNull(),

      updatedAt: timestamp(
        'updated_at',
      )
        .defaultNow()
        .notNull(),
    },
  );

// =====================================================
// Complete Schema
// =====================================================

export const schema = {
  shops,
  users,
  products,
  inventoryMovements,
  suppliers,
  purchases,
  purchaseItems,
  sales,
  saleItems,
  payments,
  paymentTransactions,
  customers,
};