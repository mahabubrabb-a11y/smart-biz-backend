import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

import { schema, users, shops } from '../db/schema.js';
import { CreateUserDto } from './dto/create-user.dto.js';

@Injectable()
export class UsersService {
  constructor(
    @Inject('DRIZZLE_DB')
    private readonly database: NodePgDatabase<typeof schema>,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const { name, email, password, role, shopId } = createUserDto;

    // 1. Check if email already exists
    const [existingUser] = await this.database
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // 2. Check if shop exists
    const [shop] = await this.database
      .select()
      .from(shops)
      .where(eq(shops.id, shopId));

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // 4. Create user
    const [user] = await this.database
      .insert(users)
      .values({
        name,
        email,
        password: hashedPassword,
        role,
        shopId,
      })
      .returning();

    // 5. Never return password
    const { password: _, ...safeUser } = user;

    return safeUser;
  }
}
