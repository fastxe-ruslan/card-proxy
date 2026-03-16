import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ActivateCardDto {
  @ApiProperty({ description: '4–6 digit PIN', example: '1234' })
  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'PIN must be 4–6 digits' })
  pin: string;

  @ApiProperty({ description: 'Activation code from card / delivery letter' })
  @IsString()
  @IsNotEmpty()
  activationCode: string;
}
