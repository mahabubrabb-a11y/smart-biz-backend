import {
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

import { schema, users } from '../db/schema.js';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    @Inject('DRIZZLE_DB')
    private readonly database: NodePgDatabase<typeof schema>,

    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    // 1. Find user by email
    const [user] = await this.database
      .select()
      .from(users)
      .where(eq(users.email, email));

    // 2. User not found
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 3. Compare password
    const passwordMatched = await bcrypt.compare(
      password,
      user.password,
    );

    if (!passwordMatched) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 4. Create JWT
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
      shopId: user.shopId,
    });

    // 5. Return safe response
    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        shopId: user.shopId,
      },
    };
  }
}