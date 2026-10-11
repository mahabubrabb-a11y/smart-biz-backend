import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { schema } from './schema.js';

export const createDb = (databaseUrl: string) => {
  const pool = new Pool({
    connectionString: databaseUrl,
  });

  return drizzle(pool, {
    schema,
  });
};