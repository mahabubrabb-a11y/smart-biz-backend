import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { PaymentsService } from './payments.service.js';

import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { InitSslcommerzPaymentDto } from './dto/init-sslcommerz-payment.dto.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
  ) {}

  // Manual Payment
  @Post()
  @Roles('owner', 'manager')
  create(
    @Body() dto: CreatePaymentDto,
    @Req() req: any,
  ) {
    return this.paymentsService.create(
      dto,
      req.user.shopId,
    );
  }

  // Payment List
  @Get()
  @Roles('owner', 'manager')
  findAll(@Req() req: any) {
    return this.paymentsService.findAll(
      req.user.shopId,
    );
  }

  // Payments By Sale
  @Get('sale/:saleId')
  @Roles('owner', 'manager')
  findBySale(
    @Param('saleId') saleId: string,
    @Req() req: any,
  ) {
    return this.paymentsService.findBySale(
      saleId,
      req.user.shopId,
    );
  }

  // SSLCommerz Payment Init
  @Post('sslcommerz/init')
  @Roles('owner', 'manager')
  initSslcommerzPayment(
    @Body() dto: InitSslcommerzPaymentDto,
    @Req() req: any,
  ) {
    return this.paymentsService.initSslcommerzPayment(
      dto,
      req.user.shopId,
    );
  }
}
