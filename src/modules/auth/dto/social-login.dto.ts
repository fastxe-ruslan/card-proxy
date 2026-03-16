import { IsIn, IsString } from 'class-validator';

export class SocialLoginDto {
  @IsIn(['google', 'apple'])
  provider: 'google' | 'apple';

  @IsString()
  idToken: string;
}
