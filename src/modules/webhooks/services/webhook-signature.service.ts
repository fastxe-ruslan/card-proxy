import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createVerify } from 'crypto';

@Injectable()
export class WebhookSignatureService {
  private readonly logger = new Logger(WebhookSignatureService.name);

  constructor(private readonly configService: ConfigService) {}

  verify(rawBody: string, signature: string | undefined): boolean {
    const skip = this.configService.get<string>(
      'SKIP_WEBHOOK_SIGNATURE_VERIFICATION',
    );
    if (skip === 'true') {
      this.logger.warn(
        'Signature verification DISABLED — do NOT use in production',
      );
      return true;
    }

    const publicKey = this.configService.get<string>(
      'WASABI_WEBHOOK_PUBLIC_KEY',
    );
    if (!publicKey) {
      this.logger.warn(
        'WASABI_WEBHOOK_PUBLIC_KEY not configured — skipping verification',
      );
      return true;
    }

    if (!signature) {
      this.logger.warn('Missing X-WSB-SIGNATURE header');
      return false;
    }

    try {
      const verifier = createVerify('RSA-SHA256');
      verifier.update(rawBody);
      verifier.end();
      return verifier.verify(publicKey, signature, 'base64');
    } catch (err) {
      this.logger.warn(
        `Signature verification threw an exception: ${err instanceof Error ? err.message : String(err)}. ` +
          `sig prefix: ${signature.slice(0, 20)}...`,
      );
      return false;
    }
  }
}
