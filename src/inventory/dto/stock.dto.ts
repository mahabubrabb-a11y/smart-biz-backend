import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  IsPositive,
  MaxLength,
} from 'class-validator';

export class StockDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @IsPositive()
  quantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}