import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { SalesService } from './sales.service.js';
import { CreateSaleDto } from './dto/create-sale.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalesController {
  constructor(
    private readonly salesService: SalesService,
  ) {}

  @Post()
  @Roles('owner', 'manager', 'staff')
  create(
    @Body() dto: CreateSaleDto,
    @Req() req: any,
  ) {
    return this.salesService.create(
      dto,
      req.user.shopId,
    );
  }

  @Get()
  findAll(@Req() req: any) {
    return this.salesService.findAll(
      req.user.shopId,
    );
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.salesService.findOne(
      id,
      req.user.shopId,
    );
  }
}