import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { IdempotencyKeyEntity } from '../entities/idempotency-key.entity';

const WEBHOOK_TTL_DAYS = 7;

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);

  constructor(
    @InjectRepository(IdempotencyKeyEntity)
    private readonly keyRepo: Repository<IdempotencyKeyEntity>,
  ) {}

  async check(key: string, scope: string): Promise<boolean> {
    try {
      const valid = await this.keyRepo.findOne({ where: { key, scope } });
      if (!valid) return false;
      return valid.expiresAt > new Date();
    } catch (err) {
      this.logger.error('Idempotency check failed — allowing processing', err);
      return false;
    }
  }

  async mark(key: string, scope: string, responseHash?: string): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + WEBHOOK_TTL_DAYS);

      await this.keyRepo.upsert(
        { key, scope, responseHash: responseHash ?? null, expiresAt },
        ['key', 'scope'],
      );
    } catch (err) {
      this.logger.error('Failed to mark idempotency key', err);
    }
  }

  async cleanup(): Promise<number> {
    const result = await this.keyRepo.delete({
      expiresAt: LessThan(new Date()),
    });
    return result.affected ?? 0;
  }
}
