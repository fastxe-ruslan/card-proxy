import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity } from './entities/audit-log.entity';
import { ActorType } from './enums/actor-type.enum';
import { AuditAction } from './enums/audit-action.enum';
import { CorrelationService } from '../../common/correlation/correlation.service';
import { PiiMasker } from '../../common/utils/pii-masker';

export interface AuditEntry {
  action: AuditAction | string;
  actorType?: ActorType | string;
  actorId?: string;
  entityType?: string;
  entityId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  isSensitive?: boolean;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly repo: Repository<AuditLogEntity>,
    private readonly correlationService: CorrelationService,
  ) {}

  log(entry: AuditEntry): void {
    void this.persist(entry).catch((err: unknown) => {
      this.logger.error(
        { err, action: entry.action },
        'Failed to write audit log — swallowing error',
      );
    });
  }

  private async persist(entry: AuditEntry): Promise<void> {
    const record = this.repo.create({
      action: entry.action,
      actorType: entry.actorType ?? ActorType.System,
      actorId: entry.actorId ?? null,
      entityType: entry.entityType ?? null,
      entityId: entry.entityId ?? null,
      beforeJson: entry.before
        ? (PiiMasker.mask(entry.before) as Record<string, unknown>)
        : null,
      afterJson: entry.after
        ? (PiiMasker.mask(entry.after) as Record<string, unknown>)
        : null,
      metadataJson: entry.metadata
        ? (PiiMasker.mask(entry.metadata) as Record<string, unknown>)
        : null,
      ip: entry.ip ?? null,
      userAgent: entry.userAgent ?? null,
      correlationId: this.correlationService.get(),
      isSensitive: entry.isSensitive ?? false,
    });

    await this.repo.save(record);
  }
}
