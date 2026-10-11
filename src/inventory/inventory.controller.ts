import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { InventoryService } from './inventory.service.js';
import { StockDto } from './dto/stock.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
  ) {}

  @Post('stock-in')
  stockIn(
    @Body() stockDto: StockDto,
    @Req() req: any,
  ) {
    return this.inventoryService.stockIn(
      stockDto,
      req.user.shopId,
    );
  }

  @Post('stock-out')
  stockOut(
    @Body() stockDto: StockDto,
    @Req() req: any,
  ) {
    return this.inventoryService.stockOut(
      stockDto,
      req.user.shopId,
    );
  }

  @Get('history/:productId')
  getHistory(
    @Param('productId') productId: string,
    @Req() req: any,
  ) {
    return this.inventoryService.getHistory(
      productId,
      req.user.shopId,
    );
  }
}
