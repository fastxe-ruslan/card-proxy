import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CardEntity } from '../../cards/entities/card.entity';
import { CardTransactionEntity } from '../../cards/entities/card-transaction.entity';
import {
  TransactionDirection,
  TransactionStatus,
  TransactionType,
} from '../../cards/enums/transaction.enums';
import { AuditService } from '../../audit/audit.service';
import type { WebhookHandler } from '../services/webhook-processor.service';
import type { WasabiCardFeePatchEvent } from '../../wasabi-client/interfaces/wasabi-webhook.types';

@Injectable()
export class CardFeePatchHandler implements WebhookHandler {
  private readonly logger = new Logger(CardFeePatchHandler.name);

  constructor(
    @InjectRepository(CardEntity)
    private readonly cardRepo: Repository<CardEntity>,
    @InjectRepository(CardTransactionEntity)
    private readonly txRepo: Repository<CardTransactionEntity>,
    private readonly auditService: AuditService,
  ) {}

  async handle(payload: Record<string, unknown>): Promise<void> {
    const data = payload as unknown as WasabiCardFeePatchEvent;

    const card = await this.cardRepo.findOne({
      where: { wasabiCardNo: data.cardNo },
    });
    if (!card) {
      this.logger.warn(
        `card_fee_patch: card not found (cardNo=${data.cardNo}) — ACK`,
      );
      return;
    }

    const origin = data.originTradeNo
      ? await this.txRepo.findOne({
          where: { wasabiTxnId: data.originTradeNo },
        })
      : null;

    if (!origin) {
      this.logger.warn(
        `card_fee_patch: originTradeNo=${data.originTradeNo} not found — creating orphaned fee`,
      );
    }

    await this.txRepo.upsert(
      {
        cardId: card.id,
        wasabiTxnId: data.tradeNo,
        merchantName: null,
        amount: data.amount,
        currency: data.currency,
        direction: TransactionDirection.Debit,
        status: TransactionStatus.Completed,
        transactionType: TransactionType.Fee,
        occurredAt: data.transactionTime
          ? new Date(data.transactionTime)
          : null,
        rawPayload: {
          tradeNo: data.tradeNo,
          originTradeNo: data.originTradeNo,
          type: data.type,
          amount: data.amount,
          currency: data.currency,
          deductionSourceFunds: data.deductionSourceFunds,
          orphaned: !origin,
        },
      },
      ['wasabiTxnId'],
    );

    this.auditService.log({
      action: 'webhook.fee_patch',
      entityType: 'card',
      entityId: card.id,
      metadata: { amount: data.amount, originTradeNo: data.originTradeNo },
    });
  }
}
