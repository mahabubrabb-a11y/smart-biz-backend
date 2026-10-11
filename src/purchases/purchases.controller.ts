import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { PurchasesService } from './purchases.service.js';

import { CreatePurchaseDto } from './dto/create-purchase.dto.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('purchases')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchasesController {
  constructor(
    private readonly purchasesService: PurchasesService,
  ) {}

  @Post()
  @Roles('owner', 'manager')
  create(
    @Body() dto: CreatePurchaseDto,
    @Req() req: any,
  ) {
    return this.purchasesService.create(
      dto,
      req.user.shopId,
    );
  }

  @Get()
  findAll(@Req() req: any) {
    return this.purchasesService.findAll(
      req.user.shopId,
    );
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.purchasesService.findOne(
      id,
      req.user.shopId,
    );
  }
}
