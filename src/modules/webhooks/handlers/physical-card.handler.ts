import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CardEntity } from '../../cards/entities/card.entity';
import { CardStatus } from '../../cards/enums/card-status.enum';
import { AuditService } from '../../audit/audit.service';
import type { WebhookHandler } from '../services/webhook-processor.service';
import type { WasabiPhysicalCardEvent } from '../../wasabi-client/interfaces/wasabi-webhook.types';

const STATUS_MAP: Record<string, CardStatus> = {
  success: CardStatus.Active,
  fail: CardStatus.Suspended,
  processing: CardStatus.Pending,
  wait_process: CardStatus.Pending,
};

@Injectable()
export class PhysicalCardHandler implements WebhookHandler {
  private readonly logger = new Logger(PhysicalCardHandler.name);

  constructor(
    @InjectRepository(CardEntity)
    private readonly cardRepo: Repository<CardEntity>,
    private readonly auditService: AuditService,
  ) {}

  async handle(payload: Record<string, unknown>): Promise<void> {
    const data = payload as unknown as WasabiPhysicalCardEvent;

    const card =
      (await this.cardRepo.findOne({
        where: { merchantOrderNo: data.merchantOrderNo },
      })) ??
      (await this.cardRepo.findOne({ where: { wasabiCardNo: data.cardNo } }));

    if (!card) {
      this.logger.warn(
        `physical_card: card not found (merchantOrderNo=${data.merchantOrderNo}, cardNo=${data.cardNo}) — ACK`,
      );
      return;
    }

    const newStatus =
      STATUS_MAP[data.status?.toLowerCase()] ?? CardStatus.Unknown;
    await this.cardRepo.update(card.id, { status: newStatus });

    const shouldNotify = data.status === 'success' || data.status === 'fail';
    if (shouldNotify) {
      this.logger.log(
        `[NOTIFY] Physical card ${data.status} for userId=${card.userId}` +
          (data.description ? ` — ${data.description}` : ''),
      );
      // TODO: push notification to user via NotificationService
    }

    this.auditService.log({
      action: 'webhook.physical_card_activated',
      entityType: 'card',
      entityId: card.id,
      metadata: { status: data.status, description: data.description },
    });
  }
}
