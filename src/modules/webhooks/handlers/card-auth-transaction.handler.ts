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
import type { WasabiCardAuthTransactionEvent } from '../../wasabi-client/interfaces/wasabi-webhook.types';

@Injectable()
export class CardAuthTransactionHandler implements WebhookHandler {
  private readonly logger = new Logger(CardAuthTransactionHandler.name);

  constructor(
    @InjectRepository(CardEntity)
    private readonly cardRepo: Repository<CardEntity>,
    @InjectRepository(CardTransactionEntity)
    private readonly txRepo: Repository<CardTransactionEntity>,
    private readonly auditService: AuditService,
  ) {}

  async handle(payload: Record<string, unknown>): Promise<void> {
    const data = payload as unknown as WasabiCardAuthTransactionEvent;

    const card = await this.cardRepo.findOne({
      where: { wasabiCardNo: data.cardNo },
    });
    if (!card) {
      this.logger.warn(
        `card_auth_transaction: card not found (cardNo=${data.cardNo}) — ACK`,
      );
      return;
    }

    const merchantName: string | null =
      data.merchantData?.name ?? data.merchantName ?? null;

    await this.txRepo.upsert(
      {
        cardId: card.id,
        wasabiTxnId: data.tradeNo,
        merchantName: merchantName as unknown as string,
        amount: data.settleAmount ?? data.authorizedAmount ?? data.amount,
        currency: data.currency,
        direction: TransactionDirection.Debit,
        status: this.mapStatus(data.status),
        transactionType: this.mapType(data.type),
        occurredAt: data.transactionTime
          ? new Date(data.transactionTime)
          : null,
        rawPayload: {
          tradeNo: data.tradeNo,
          originTradeNo: data.originTradeNo,
          type: data.type,
          status: data.status,
          amount: data.amount,
          settleAmount: data.settleAmount,
          currency: data.currency,
          merchantName: merchantName ?? undefined,
          settleDate: data.settleDate,
        } as unknown as null,
      },
      ['wasabiTxnId'],
    );

    this.auditService.log({
      action: 'webhook.card_auth_transaction',
      entityType: 'card',
      entityId: card.id,
      metadata: { tradeNo: data.tradeNo, type: data.type, status: data.status },
    });
  }

  private mapStatus(raw: string): TransactionStatus {
    const map: Record<string, TransactionStatus> = {
      authorized: TransactionStatus.Pending,
      succeed: TransactionStatus.Completed,
      success: TransactionStatus.Completed,
      declined: TransactionStatus.Failed,
      reversed: TransactionStatus.Reversed,
    };
    return map[raw?.toLowerCase()] ?? TransactionStatus.Pending;
  }

  private mapType(raw: string): TransactionType {
    if (raw === 'auth') return TransactionType.Auth;
    if (raw === 'settle') return TransactionType.Settlement;
    if (raw === 'refund') return TransactionType.Settlement;
    return TransactionType.Auth;
  }
}
