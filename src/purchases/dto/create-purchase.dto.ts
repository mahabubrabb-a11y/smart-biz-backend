import {
  IsArray,
  IsInt,
  IsOptional,
  IsUUID,
  IsPositive,
  ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';

export class PurchaseItemDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @IsPositive()
  quantity: number;

  @IsInt()
  @IsPositive()
  costPrice: number;
}

export class CreatePurchaseDto {
  @IsUUID()
  supplierId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items: PurchaseItemDto[];

  @IsOptional()
  @IsInt()
  @IsPositive()
  paidAmount?: number;
}