import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import axios from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SslcommerzService {
  constructor(
    private readonly configService: ConfigService,
  ) {}

  private get storeId(): string {
    const value =
      this.configService.get<string>(
        'SSLCOMMERZ_STORE_ID',
      );

    if (!value) {
      throw new Error(
        'SSLCOMMERZ_STORE_ID is not configured',
      );
    }

    return value;
  }

  private get storePassword(): string {
    const value =
      this.configService.get<string>(
        'SSLCOMMERZ_STORE_PASSWORD',
      );

    if (!value) {
      throw new Error(
        'SSLCOMMERZ_STORE_PASSWORD is not configured',
      );
    }

    return value;
  }

  private get isLive(): boolean {
    return (
      this.configService.get<string>(
        'SSLCOMMERZ_IS_LIVE',
      ) === 'true'
    );
  }

  private get baseUrl(): string {
    return this.isLive
      ? 'https://securepay.sslcommerz.com'
      : 'https://sandbox.sslcommerz.com';
  }

  async initiatePayment(data: {
    tranId: string;
    amount: number;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    customerAddress?: string;
  }) {
    const frontendUrl =
      this.configService.get<string>(
        'FRONTEND_URL',
      );

    const backendUrl =
      this.configService.get<string>(
        'BACKEND_URL',
      );

    if (!frontendUrl || !backendUrl) {
      throw new Error(
        'FRONTEND_URL or BACKEND_URL is not configured',
      );
    }

    if (data.amount < 10) {
      throw new BadRequestException(
        'SSLCommerz payment amount must be at least ৳10',
      );
    }

    const customerEmail =
      data.customerEmail?.trim() ||
      'customer@example.com';

    const customerPhone =
      data.customerPhone?.trim() ||
      '01711111111';

    const customerAddress =
      data.customerAddress?.trim() ||
      'Dhaka';

    const payload = {
      store_id: this.storeId,
      store_passwd: this.storePassword,

      total_amount: data.amount,
      currency: 'BDT',
      tran_id: data.tranId,

      product_category: 'shop_management',

      success_url:
        `${backendUrl}/payments/sslcommerz/success`,

      fail_url:
        `${backendUrl}/payments/sslcommerz/fail`,

      cancel_url:
        `${backendUrl}/payments/sslcommerz/cancel`,

      ipn_url:
        `${backendUrl}/payments/sslcommerz/ipn`,

      cus_name:
        data.customerName?.trim() ||
        'SmartBiz Customer',

      cus_email: customerEmail,

      cus_phone: customerPhone,

      cus_add1: customerAddress,

      cus_city: 'Dhaka',

      cus_postcode: '1216',

      cus_country: 'Bangladesh',

      shipping_method: 'NO',

      num_of_item: 1,

      product_name: 'SmartBiz Sale',

      product_profile: 'general',

      value_a: data.tranId,
    };

    console.log(
      '========== SSLCommerz INIT =========='
    );

    console.log(
      'Base URL:',
      this.baseUrl,
    );

    console.log(
      'Transaction ID:',
      data.tranId,
    );

    console.log(
      'Amount:',
      data.amount,
    );

    console.log(
      'Customer:',
      payload.cus_name,
    );

    console.log(
      'Customer Email:',
      payload.cus_email,
    );

    console.log(
      'Customer Phone:',
      payload.cus_phone,
    );

    console.log(
      '======================================'
    );

    let response;

    try {
      response = await axios.post(
        `${this.baseUrl}/gwprocess/v4/api.php`,

        new URLSearchParams({
          store_id: payload.store_id,

          store_passwd: payload.store_passwd,

          total_amount:
            String(payload.total_amount),

          currency: payload.currency,

          tran_id: payload.tran_id,

          product_category:
            payload.product_category,

          success_url:
            payload.success_url,

          fail_url:
            payload.fail_url,

          cancel_url:
            payload.cancel_url,

          ipn_url:
            payload.ipn_url,

          cus_name:
            payload.cus_name,

          cus_email:
            payload.cus_email,

          cus_phone:
            payload.cus_phone,

          cus_add1:
            payload.cus_add1,

          cus_city:
            payload.cus_city,

          cus_postcode:
            payload.cus_postcode,

          cus_country:
            payload.cus_country,

          shipping_method:
            payload.shipping_method,

          num_of_item:
            String(payload.num_of_item),

          product_name:
            payload.product_name,

          product_profile:
            payload.product_profile,

          value_a:
            payload.value_a,
        }).toString(),

        {
          headers: {
            'Content-Type':
              'application/x-www-form-urlencoded',
          },

          timeout: 30000,
        },
      );
    } catch (error: any) {
      console.error(
        '========== SSLCommerz API ERROR =========='
      );

      console.error(
        'HTTP Status:',
        error.response?.status,
      );

      console.error(
        'Response:',
        error.response?.data,
      );

      console.error(
        'Message:',
        error.message,
      );

      console.error(
        '=========================================='
      );

      throw new BadRequestException(
        error.response?.data?.failedreason ||
          error.response?.data?.message ||
          'SSLCommerz API request failed',
      );
    }

    console.log(
      '========== SSLCommerz API RESPONSE =========='
    );

    console.log(
      response.data,
    );

    console.log(
      '=============================================='
    );

    if (
      response.data?.status !== 'SUCCESS' ||
      !response.data?.GatewayPageURL
    ) {
      console.error(
        'SSLCommerz failed reason:',
        response.data?.failedreason,
      );

      throw new BadRequestException(
        response.data?.failedreason ??
          'Failed to initialize SSLCommerz payment',
      );
    }

    return {
      sessionKey:
        response.data.sessionkey,

      gatewayPageURL:
        response.data.GatewayPageURL,

      tranId:
        data.tranId,
    };
  }

  async validatePayment(
    valId: string,
  ) {
    const response = await axios.get(
      `${this.baseUrl}/validator/api/validationserverAPI.php`,
      {
        params: {
          val_id: valId,

          store_id: this.storeId,

          store_passwd:
            this.storePassword,

          format: 'json',

          v: 1,
        },

        timeout: 30000,
      },
    );

    return response.data;
  }
}