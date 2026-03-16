import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class LogoutDto {
  @IsString()
  refreshToken: string;

  @IsOptional()
  @IsBoolean()
  allDevices?: boolean;
}
