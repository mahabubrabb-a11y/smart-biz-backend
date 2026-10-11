import {
  IsEnum,
  IsInt,
  IsPositive,
  IsUUID,
} from 'class-validator';

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  BKASH = 'bkash',
  NAGAD = 'nagad',
  BANK = 'bank',
  OTHER = 'other',
}

export class CreatePaymentDto {
  @IsUUID()
  saleId: string;

  @IsInt()
  @IsPositive()
  amount: number;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}