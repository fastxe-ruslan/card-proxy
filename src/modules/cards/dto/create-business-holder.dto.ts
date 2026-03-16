import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { HolderVersion } from '../enums/card-type.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBusinessHolderDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiPropertyOptional({ example: 'LLC' })
  @IsOptional()
  @IsString()
  companyType?: string;

  @ApiProperty({ example: '12345678' })
  @IsString()
  @IsNotEmpty()
  registrationNumber: string;

  @ApiProperty({ example: 'HK' })
  @IsString()
  @Length(2, 2)
  registrationCountry: string;

  @ApiPropertyOptional({ example: 'Finance' })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessActivity?: string;

  @ApiProperty({ example: '123 Corp Ave' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'Hong Kong' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ example: '000000' })
  @IsString()
  @IsNotEmpty()
  postalCode: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  contactName: string;

  @ApiProperty({ example: '+85291234567' })
  @IsString()
  @Matches(/^\+?\d{7,15}$/)
  contactMobile: string;

  @ApiProperty({ example: 'contact@company.com' })
  @IsEmail()
  contactEmail: string;

  @ApiPropertyOptional({
    example: 'Jane Doe',
    description: 'Ultimate Beneficial Owner name',
  })
  @IsOptional()
  @IsString()
  uboName?: string;

  @ApiPropertyOptional({ example: '1980-05-20' })
  @IsOptional()
  @IsString()
  uboDob?: string;

  @ApiPropertyOptional({ example: 'A12345678' })
  @IsOptional()
  @IsString()
  uboDocumentId?: string;

  @ApiPropertyOptional({ enum: HolderVersion, default: HolderVersion.V1 })
  @IsOptional()
  @IsEnum(HolderVersion)
  version?: HolderVersion;

  @ApiProperty({ example: 'PROG-001' })
  @IsString()
  @IsNotEmpty()
  programId: string;
}
