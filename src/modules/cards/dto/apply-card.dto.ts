import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { CardType } from '../enums/card-type.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApplyCardDto {
  @ApiProperty({ description: 'Internal cardholder ID' })
  @IsUUID()
  holderId: string;

  @ApiProperty({ enum: CardType })
  @IsEnum(CardType)
  cardType: CardType;

  @ApiProperty({ example: 'PROG-001' })
  @IsString()
  @IsNotEmpty()
  programId: string;

  @ApiPropertyOptional({ example: 100, description: 'Initial load amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  initialLoadAmount?: number;
}
