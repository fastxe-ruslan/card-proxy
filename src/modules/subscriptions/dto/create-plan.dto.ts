import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillingPeriod } from '../enums/billing-period.enum';
import { PlanFeatures } from '../interfaces/plan-features.interface';

export class CreatePlanDto {
  @ApiProperty({ example: 'premium' })
  @IsString()
  @Matches(/^[a-z0-9_-]+$/)
  code: string;

  @ApiProperty({ example: 'Premium Plan' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'Full access to all features' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 29.99 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceAmount?: number;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  priceCurrency?: string;

  @ApiPropertyOptional({ enum: BillingPeriod })
  @IsOptional()
  @IsEnum(BillingPeriod)
  billingPeriod?: BillingPeriod;

  @ApiPropertyOptional({ description: 'Plan features and limits' })
  @IsOptional()
  @IsObject()
  featuresJson?: PlanFeatures;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    default: 0,
    description: 'Display sort order (ascending)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
