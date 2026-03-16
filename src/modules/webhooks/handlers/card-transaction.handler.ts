import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CardEntity } from '../../cards/entities/card.entity';
import { CardTransactionEntity } from '../../cards/entities/card-transaction.entity';
import { CardStatus } from '../../cards/enums/card-status.enum';
import {
  TransactionDirection,
  TransactionStatus,
  TransactionType,
} from '../../cards/enums/transaction.enums';
import { AuditService } from '../../audit/audit.service';
import type { WebhookHandler } from '../services/webhook-processor.service';
import type { WasabiCardTransactionEvent } from '../../wasabi-client/interfaces/wasabi-webhook.types';

@Injectable()
export class CardTransactionHandler implements WebhookHandler {
  private readonly logger = new Logger(CardTransactionHandler.name);

  constructor(
    @InjectRepository(CardEntity)
    private readonly cardRepo: Repository<CardEntity>,
    @InjectRepository(CardTransactionEntity)
    private readonly txRepo: Repository<CardTransactionEntity>,
    private readonly auditService: AuditService,
  ) {}

  async handle(payload: Record<string, unknown>): Promise<void> {
    const data = payload as unknown as WasabiCardTransactionEvent;

    const card =
      (await this.cardRepo.findOne({ where: { wasabiCardNo: data.cardNo } })) ??
      (await this.cardRepo.findOne({
        where: { merchantOrderNo: data.merchantOrderNo },
      }));

    if (!card) {
      this.logger.warn(
        `card_transaction: card not found (cardNo=${data.cardNo}, merchantOrderNo=${data.merchantOrderNo}) — ACK`,
      );
      return;
    }

    await this.txRepo.upsert(
      {
        cardId: card.id,
        wasabiTxnId: data.orderNo,
        amount: data.amount,
        currency: data.currency,
        direction: TransactionDirection.Debit,
        status: this.mapStatus(data.status),
        transactionType: TransactionType.Settlement,
        occurredAt: data.transactionTime
          ? new Date(data.transactionTime)
          : null,
        rawPayload: {
          orderNo: data.orderNo,
          type: data.type,
          status: data.status,
          amount: data.amount,
          currency: data.currency,
        },
      },
      ['wasabiTxnId'],
    );

    if (data.type === 'destroy') {
      await this.cardRepo.update(card.id, { status: CardStatus.Closed });
    } else if (data.type === 'create' && data.status === 'success') {
      await this.cardRepo.update(card.id, { status: CardStatus.Active });
    }

    this.auditService.log({
      action: 'webhook.card_transaction',
      entityType: 'card',
      entityId: card.id,
      metadata: { type: data.type, status: data.status, amount: data.amount },
    });
  }

  private mapStatus(raw: string): TransactionStatus {
    if (raw === 'success') return TransactionStatus.Completed;
    if (raw === 'fail') return TransactionStatus.Failed;
    return TransactionStatus.Pending;
  }
}
