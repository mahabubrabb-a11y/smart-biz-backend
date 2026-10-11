import {
  Body,
  Controller,
  Post,
  Res,
} from '@nestjs/common';

import type { Response } from 'express';

import { PaymentsService } from './payments.service.js';

@Controller('payments/sslcommerz')
export class SslcommerzController {
  constructor(
    private readonly paymentsService: PaymentsService,
  ) {}

  // =====================================================
  // SUCCESS
  // =====================================================

  @Post('success')
  async success(
    @Body() body: any,
    @Res() res: Response,
  ) {
    try {
      await this.paymentsService.handleSslcommerzSuccess({
        tran_id: body.tran_id,
        val_id: body.val_id,
        amount: body.amount,
        status: body.status,
      });

      return res.redirect(
        `${process.env.FRONTEND_URL}/payments/success?tran_id=${encodeURIComponent(
          body.tran_id ?? '',
        )}`,
      );
    } catch (error) {
      console.error(
        'SSLCommerz success error:',
        error,
      );

      return res.redirect(
        `${process.env.FRONTEND_URL}/payments/failed?tran_id=${encodeURIComponent(
          body.tran_id ?? '',
        )}`,
      );
    }
  }

  // =====================================================
  // FAILED
  // =====================================================

  @Post('fail')
  async fail(
    @Body() body: any,
    @Res() res: Response,
  ) {
    try {
      await this.paymentsService.handleSslcommerzFailed(
        body.tran_id,
        'failed',
      );
    } catch (error) {
      console.error(
        'SSLCommerz fail error:',
        error,
      );
    }

    return res.redirect(
      `${process.env.FRONTEND_URL}/payments/failed?tran_id=${encodeURIComponent(
        body.tran_id ?? '',
      )}`,
    );
  }

  // =====================================================
  // CANCELLED
  // =====================================================

  @Post('cancel')
  async cancel(
    @Body() body: any,
    @Res() res: Response,
  ) {
    try {
      await this.paymentsService.handleSslcommerzFailed(
        body.tran_id,
        'cancelled',
      );
    } catch (error) {
      console.error(
        'SSLCommerz cancel error:',
        error,
      );
    }

    return res.redirect(
      `${process.env.FRONTEND_URL}/payments/cancelled?tran_id=${encodeURIComponent(
        body.tran_id ?? '',
      )}`,
    );
  }

  // =====================================================
  // IPN
  // =====================================================

  @Post('ipn')
  async ipn(@Body() body: any) {
    try {
      if (!body.tran_id) {
        return {
          success: false,
          message: 'Transaction ID is missing',
        };
      }

      if (body.status !== 'VALID') {
        return {
          success: false,
          message: `Payment status: ${
            body.status ?? 'unknown'
          }`,
        };
      }

      if (!body.val_id) {
        return {
          success: false,
          message: 'Validation ID is missing',
        };
      }

      return await this.paymentsService.handleSslcommerzSuccess({
        tran_id: body.tran_id,
        val_id: body.val_id,
        amount: body.amount,
        status: body.status,
      });
    } catch (error) {
      console.error(
        'SSLCommerz IPN error:',
        error,
      );

      return {
        success: false,
        message: 'IPN processing failed',
      };
    }
  }
}