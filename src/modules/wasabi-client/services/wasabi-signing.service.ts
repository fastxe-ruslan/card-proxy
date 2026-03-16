import { Injectable, Logger } from '@nestjs/common';
import { createSign, createVerify, randomUUID } from 'crypto';

export interface RequestSignatureHeaders {
  'app-id': string;
  timestamp: string;
  nonce: string;
  sign: string;
}

@Injectable()
export class WasabiSigningService {
  private readonly logger = new Logger(WasabiSigningService.name);

  buildHeaders(
    appId: string,
    body: string,
    privateKeyPem: string,
  ): RequestSignatureHeaders {
    const timestamp = Date.now().toString();
    const nonce = randomUUID();
    const sign = this.sign(timestamp, nonce, body, privateKeyPem);
    return { 'app-id': appId, timestamp, nonce, sign };
  }

  verifyWebhook(
    body: string,
    timestamp: string,
    nonce: string,
    signature: string,
    publicKeyPem: string,
  ): boolean {
    try {
      const verifier = createVerify('RSA-SHA256');
      verifier.update(this.buildStringToSign(timestamp, nonce, body));
      verifier.end();
      return verifier.verify(publicKeyPem, signature, 'base64');
    } catch (err) {
      this.logger.warn('Webhook signature verification failed', err);
      return false;
    }
  }

  private sign(
    timestamp: string,
    nonce: string,
    body: string,
    privateKeyPem: string,
  ): string {
    const signer = createSign('RSA-SHA256');
    signer.update(this.buildStringToSign(timestamp, nonce, body));
    signer.end();
    return signer.sign(privateKeyPem, 'base64');
  }

  private buildStringToSign(
    timestamp: string,
    nonce: string,
    body: string,
  ): string {
    return `${timestamp}\n${nonce}\n${body}`;
  }
}
