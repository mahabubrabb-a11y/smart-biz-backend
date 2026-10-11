
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';

@Module({
  imports: [ConfigModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}

