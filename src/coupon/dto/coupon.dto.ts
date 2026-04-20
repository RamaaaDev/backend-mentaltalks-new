import {
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsDateString,
  Min,
  MaxLength,
  MinLength,
} from 'class-validator';
import { DiscountType } from '@prisma/client';

export class CreateCouponDto {
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  coupon_code: string;

  @IsEnum(DiscountType)
  coupon_type: DiscountType;

  @IsInt()
  @Min(1)
  coupon_value: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  coupon_maxDiscount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  coupon_minPurchase?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  coupon_usageLimit?: number;

  @IsDateString()
  coupon_expiresAt: string;

  @IsOptional()
  @IsBoolean()
  coupon_isActive?: boolean;
}

export class UpdateCouponDto {
  @IsOptional()
  @IsEnum(DiscountType)
  coupon_type?: DiscountType;

  @IsOptional()
  @IsInt()
  @Min(1)
  coupon_value?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  coupon_maxDiscount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  coupon_minPurchase?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  coupon_usageLimit?: number;

  @IsOptional()
  @IsDateString()
  coupon_expiresAt?: string;

  @IsOptional()
  @IsBoolean()
  coupon_isActive?: boolean;
}

export class QueryCouponDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(DiscountType)
  type?: DiscountType;
}

export class ApplyCouponDto {
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  coupon_code: string;

  @IsInt()
  @Min(0)
  purchase_amount: number;
}
