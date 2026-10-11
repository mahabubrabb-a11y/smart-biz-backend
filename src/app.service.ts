import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema } from './db/schema.js';
import { shops } from './db/schema.js';

@Injectable()
export class AppService {
  constructor(
    @Inject('DRIZZLE_DB')
    private readonly database: NodePgDatabase<typeof schema>,
  ) {}

  async getHello() {
    const result = await this.database
      .select()
      .from(shops);

    return result;
  }
}
