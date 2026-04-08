import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ResolvedCredential {
  apiKey: string;
  /** Merchant RSA private key PEM — request signing (and 3DS decrypt if same key). */
  privateKeyPem: string;
}

interface CacheEntry {
  credential: ResolvedCredential;
  expiresAt: number;
}

const CACHE_KEY = 'wasabi';
const CACHE_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class WasabiCredentialService {
  private readonly logger = new Logger(WasabiCredentialService.name);
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly config: ConfigService) {}

  async resolve(): Promise<ResolvedCredential> {
    const cached = this.cache.get(CACHE_KEY);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.credential;
    }

    const apiKey = this.config.getOrThrow<string>('WASABI_API_KEY');
    const privateKeyPem = this.config.getOrThrow<string>('WASABI_PRIVATE_KEY');

    const credential: ResolvedCredential = { apiKey, privateKeyPem };
    this.cache.set(CACHE_KEY, {
      credential,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return credential;
  }

  invalidate(): void {
    this.cache.delete(CACHE_KEY);
    this.logger.log('Wasabi credential cache invalidated');
  }
}
