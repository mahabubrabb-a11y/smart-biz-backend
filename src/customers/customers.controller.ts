import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { CustomersService } from './customers.service.js';

import { CreateCustomerDto } from './dto/create-customer.dto.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
  ) {}

  @Post()
  create(
    @Req() req: any,
    @Body() dto: CreateCustomerDto,
  ) {
    return this.customersService.create(
      req.user.shopId,
      dto,
    );
  }

  @Get()
  findAll(@Req() req: any) {
    return this.customersService.findAll(
      req.user.shopId,
    );
  }

  @Get(':id/sales')
getSales(
  @Req() req: any,
  @Param('id') id: string,
) {
  return this.customersService.getSales(
    req.user.shopId,
    id,
  );
}

  @Get(':id/summary')
getSummary(
  @Req() req: any,
  @Param('id') id: string,
) {
  return this.customersService.getSummary(
    req.user.shopId,
    id,
  );
}

  @Get(':id')
  findOne(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.customersService.findOne(
      req.user.shopId,
      id,
    );
  }

  @Delete(':id')
  remove(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.customersService.remove(
      req.user.shopId,
      id,
    );
  }
}
