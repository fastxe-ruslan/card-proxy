import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { DocumentType, HolderVersion } from '../enums/card-type.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class AddressDto {
  @ApiProperty({ example: '123 Main St' })
  @IsString()
  @IsNotEmpty()
  line1: string;

  @ApiProperty({ example: 'Hong Kong' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiPropertyOptional({ example: 'HK' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ example: '000000' })
  @IsString()
  @IsNotEmpty()
  postalCode: string;
}

export class CreatePersonalHolderDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+852' })
  @IsString()
  @IsNotEmpty()
  areaCode: string;

  @ApiProperty({ example: '91234567' })
  @IsString()
  @Matches(/^\d{7,15}$/)
  mobile: string;

  @ApiProperty({ example: '1990-01-15', description: 'YYYY-MM-DD' })
  @IsDateString()
  dateOfBirth: string;

  @ApiPropertyOptional({ example: 'M' })
  @IsOptional()
  @IsIn(['M', 'F', 'U'])
  gender?: string;

  @ApiProperty({ example: 'CHN' })
  @IsString()
  @Length(2, 3)
  nationality: string;

  @ApiProperty({ example: 'HK' })
  @IsString()
  @Length(2, 2)
  country: string;

  @ApiProperty({ type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  occupation?: string;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  annualSalary?: number;

  @ApiPropertyOptional({ example: 'personal_use' })
  @IsOptional()
  @IsString()
  accountPurpose?: string;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedMonthlyVolume?: number;

  @ApiProperty({ enum: DocumentType })
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @ApiProperty({ example: 'A12345678' })
  @IsString()
  @IsNotEmpty()
  documentId: string;

  @ApiPropertyOptional({ example: '2020-01-01' })
  @IsOptional()
  @IsDateString()
  documentIssueDate?: string;

  @ApiProperty({ example: '2030-01-01' })
  @IsDateString()
  documentExpiryDate: string;

  @ApiPropertyOptional({ example: '192.168.1.1' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ enum: HolderVersion, default: HolderVersion.V1 })
  @IsOptional()
  @IsEnum(HolderVersion)
  version?: HolderVersion;

  @ApiProperty({ example: 'PROG-001' })
  @IsString()
  @IsNotEmpty()
  programId: string;
}
