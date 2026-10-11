import { Inject, Injectable,NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { UpdateShopDto } from './dto/update-shop.dto/update-shop.dto.js';
import { schema } from '../db/schema.js';
import { shops } from '../db/schema.js';
import { CreateShopDto } from './dto/create-shop.dto.js';
import { eq } from 'drizzle-orm';

@Injectable()
export class ShopsService {
  constructor(
    @Inject('DRIZZLE_DB')
    private readonly database: NodePgDatabase<typeof schema>,
  ) {}

  async create(createShopDto: CreateShopDto) {
    const [shop] = await this.database
      .insert(shops)
      .values({
        name: createShopDto.name,
        phone: createShopDto.phone,
        address: createShopDto.address,
      })
      .returning();

    return shop;
  }

  async findAll() {
  return this.database
    .select()
    .from(shops);
}

   async findOne(id: string) {
  const [shop] = await this.database
    .select()
    .from(shops)
    .where(eq(shops.id, id));

  if (!shop) {
    throw new NotFoundException('Shop not found');
  }

  return shop;
}

async update(id: string, updateShopDto: UpdateShopDto) {
  const [shop] = await this.database
    .update(shops)
    .set(updateShopDto)
    .where(eq(shops.id, id))
    .returning();

  if (!shop) {
    throw new NotFoundException('Shop not found');
  }

  return shop;
}


 async remove(id: string) {
  const [shop] = await this.database
    .delete(shops)
    .where(eq(shops.id, id))
    .returning();

  if (!shop) {
    throw new NotFoundException('Shop not found');
  }

  return shop;
}
}