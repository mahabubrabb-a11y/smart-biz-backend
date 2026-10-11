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

import { SuppliersService } from './suppliers.service.js';
import { CreateSupplierDto } from './dto/create-supplier.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller('suppliers')
@UseGuards(JwtAuthGuard)
export class SuppliersController {
  constructor(
    private readonly suppliersService: SuppliersService,
  ) {}

  @Post()
  create(
    @Body() dto: CreateSupplierDto,
    @Req() req: any,
  ) {
    return this.suppliersService.create(
      dto,
      req.user.shopId,
    );
  }

  @Get()
  findAll(@Req() req: any) {
    return this.suppliersService.findAll(
      req.user.shopId,
    );
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.suppliersService.findOne(
      id,
      req.user.shopId,
    );
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.suppliersService.remove(
      id,
      req.user.shopId,
    );
  }
}