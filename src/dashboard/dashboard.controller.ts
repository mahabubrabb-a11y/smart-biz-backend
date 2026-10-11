import {
  Controller,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';

import { DashboardService } from './dashboard.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
  ) {}

  @Get('summary')
  getSummary(@Req() req: any) {
    return this.dashboardService.getSummary(
      req.user.shopId,
    );
  }

  @Get('daily-sales')
getDailySales(@Req() req: any) {
  return this.dashboardService.getDailySales(
    req.user.shopId,
  );
}

@Get('top-products')
getTopProducts(@Req() req: any) {
  return this.dashboardService.getTopProducts(
    req.user.shopId,
  );
}

@Get('monthly-sales')
getMonthlySales(@Req() req: any) {
  return this.dashboardService.getMonthlySales(
    req.user.shopId,
  );
}

@Get('profit-trend')
getProfitTrend(@Req() req: any) {
  return this.dashboardService.getProfitTrend(
    req.user.shopId,
  );
}

@Get('low-stock')
getLowStockProducts(@Req() req: any) {
  return this.dashboardService.getLowStockProducts(
    req.user.shopId,
  );
}

@Get('customer-due')
getCustomerDue(@Req() req: any) {
  return this.dashboardService.getCustomerDue(
    req.user.shopId,
  );
}
}
