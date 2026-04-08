import { Injectable, Logger } from '@nestjs/common';
import { createSign } from 'crypto';

/**
 * Matches Wasabi GitBook quickstart: SHA256withRSA over the raw request body (UTF-8),
 * Base64 → header `X-WSB-SIGNATURE`. Multipart upload: sign `{}` per common/file/upload hint.
 * @see https://wsb.gitbook.io/wasabicard-doc/guides/quickstart.md
 */
@Injectable()
export class WasabiSigningService {
  private readonly logger = new Logger(WasabiSigningService.name);

  signRequestBody(body: string, privateKeyPem: string): string {
    try {
      const signer = createSign('RSA-SHA256');
      signer.update(body, 'utf8');
      signer.end();
      return signer.sign(privateKeyPem, 'base64');
    } catch (err) {
      this.logger.error('Wasabi request signing failed', err);
      throw err;
    }
  }
}
