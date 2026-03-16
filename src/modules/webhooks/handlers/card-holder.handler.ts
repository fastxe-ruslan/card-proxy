import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CardholderEntity } from '../../cards/entities/cardholder.entity';
import { CardholderStatus } from '../../cards/enums/holder-status.enum';
import { HolderStatusMapper } from '../../cards/mappers/holder-status.mapper';
import { AuditService } from '../../audit/audit.service';
import type { WebhookHandler } from '../services/webhook-processor.service';
import type { WasabiCardHolderEvent } from '../../wasabi-client/interfaces/wasabi-webhook.types';

const WEBHOOK_STATUS_MAP: Record<string, CardholderStatus> = {
  approve: CardholderStatus.Approved,
  approved: CardholderStatus.Approved,
  pass_audit: CardholderStatus.Approved,
  reject: CardholderStatus.Rejected,
  rejected: CardholderStatus.Rejected,
  pending: CardholderStatus.WaitAudit,
  wait_audit: CardholderStatus.WaitAudit,
  under_review: CardholderStatus.UnderReview,
};

@Injectable()
export class CardHolderHandler implements WebhookHandler {
  private readonly logger = new Logger(CardHolderHandler.name);

  constructor(
    @InjectRepository(CardholderEntity)
    private readonly holderRepo: Repository<CardholderEntity>,
    private readonly auditService: AuditService,
  ) {}

  async handle(payload: Record<string, unknown>): Promise<void> {
    const data = payload as unknown as WasabiCardHolderEvent;

    const holder = await this.holderRepo.findOne({
      where: { wasabiHolderId: data.holderId },
    });

    if (!holder) {
      this.logger.warn(
        `card_holder: holderId=${data.holderId} not found in DB — may belong to another merchant, ACK`,
      );
      return;
    }

    const rawStatus = data.status?.toLowerCase() ?? '';
    const internalStatus =
      WEBHOOK_STATUS_MAP[rawStatus] ?? HolderStatusMapper.fromWasabi(rawStatus);

    holder.status = internalStatus;
    holder.statusReason =
      internalStatus === CardholderStatus.Rejected
        ? (data.respMsg ?? data.description ?? null)
        : null;

    await this.holderRepo.save(holder);

    this.logger.log(
      `Holder ${holder.id} status → ${internalStatus}` +
        (holder.statusReason ? ` reason: ${holder.statusReason}` : ''),
    );

    this.auditService.log({
      action: 'webhook.holder_status_changed',
      entityType: 'cardholder',
      entityId: holder.id,
      metadata: { status: internalStatus, reason: holder.statusReason },
    });
  }
}
