import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubscribeDto {
  @ApiProperty({
    description: 'Plan code to subscribe to',
    example: 'basic',
    enum: ['free', 'basic', 'premium'],
  })
  @IsString()
  @Matches(/^[a-z0-9_-]+$/, { message: 'planCode must be a valid plan code' })
  planCode: string;
}
