import { Module } from '@nestjs/common';

import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';
import { SslcommerzService } from './sslcommerz.service.js';
import { SslcommerzController } from './sslcommerz.controller.js';
@Module({
  controllers: [PaymentsController,SslcommerzController,],
  providers: [PaymentsService, SslcommerzService,],
})
export class PaymentsModule {}
