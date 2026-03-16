import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UploadDocumentsDto {
  @ApiProperty({ description: 'Cardholder ID to attach documents to' })
  @IsUUID()
  holderId: string;

  @ApiPropertyOptional({
    description: 'Front side of identity document (base64)',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  frontDocument?: string;

  @ApiPropertyOptional({
    description: 'Back side of identity document (base64)',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  backDocument?: string;

  @ApiPropertyOptional({ description: 'Selfie with document (base64)' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  selfie?: string;

  @ApiPropertyOptional({ description: 'Signature image (base64)' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  signature?: string;

  @ValidateIf(
    (o: UploadDocumentsDto) =>
      !o.frontDocument && !o.backDocument && !o.selfie && !o.signature,
  )
  @IsString({
    message:
      'At least one document (frontDocument, backDocument, selfie, signature) must be provided',
  })
  _atLeastOne?: never;
}

export interface DocumentUploadResult {
  field: 'frontDocument' | 'backDocument' | 'selfie' | 'signature';
  fileId?: string;
  success: boolean;
  error?: string;
}
