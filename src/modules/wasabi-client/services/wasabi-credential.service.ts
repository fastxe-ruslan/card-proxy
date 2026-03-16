import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WasabiCredentialEntity } from '../entities/wasabi-credential.entity';
import { CredentialNotFoundException } from '../errors/wasabi.errors';

export interface ResolvedCredential {
  programId: string;
  apiKey: string;
  appId: string;
  kid: string | null;
  privateKeyPem: string;
}

interface CacheEntry {
  credential: ResolvedCredential;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class WasabiCredentialService {
  private readonly logger = new Logger(WasabiCredentialService.name);
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    @InjectRepository(WasabiCredentialEntity)
    private readonly credentialRepo: Repository<WasabiCredentialEntity>,
    private readonly configService: ConfigService,
  ) {}

  async resolve(programId?: string): Promise<ResolvedCredential> {
    const pid =
      programId ??
      this.configService.get<string>('WASABI_PROGRAM_ID') ??
      (() => {
        throw new CredentialNotFoundException('(WASABI_PROGRAM_ID not set)');
      })();

    const cached = this.cache.get(pid);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.credential;
    }

    const entity = await this.credentialRepo.findOne({
      where: { programId: pid, isActive: true },
    });

    if (!entity) {
      this.logger.error(`No active Wasabi credential for program: ${pid}`);
      throw new CredentialNotFoundException(pid);
    }

    const privateKeyPem = await this.resolvePrivateKey(entity.keyRef);

    const credential: ResolvedCredential = {
      programId: entity.programId,
      apiKey: entity.apiKey,
      appId: entity.appId,
      kid: entity.kid,
      privateKeyPem,
    };

    this.cache.set(pid, { credential, expiresAt: Date.now() + CACHE_TTL_MS });
    return credential;
  }

  invalidate(programId: string): void {
    this.cache.delete(programId);
    this.logger.log(`Credential cache invalidated for program: ${programId}`);
  }

  private resolvePrivateKey(keyRef: string): Promise<string> {
    return Promise.resolve(keyRef);
  }
}
