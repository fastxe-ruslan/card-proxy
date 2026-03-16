import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {}

  sendVerificationEmail(to: string, token: string): Promise<void> {
    const appUrl =
      this.configService.get<string>('APP_URL') ??
      'http://localhost:3000/api/v1';
    const link = `${appUrl}/auth/verify-email?token=${token}`;
    // TODO: Connect email sender service
    this.logger.log(`[DEV] Verification email → ${to}: ${link}`);
    return Promise.resolve();
  }

  sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const appUrl =
      this.configService.get<string>('APP_URL') ??
      'http://localhost:3000/api/v1';
    const link = `${appUrl}/auth/reset-password?token=${token}`;
    // TODO: Connect email sender service
    this.logger.log(`[DEV] Password reset → ${to}: ${link}`);
    return Promise.resolve();
  }
}
