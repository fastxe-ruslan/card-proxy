import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CardTransactionEntity } from '../../cards/entities/card-transaction.entity';
import {
  TransactionDirection,
  TransactionStatus,
  TransactionType,
} from '../../cards/enums/transaction.enums';
import { AuditService } from '../../audit/audit.service';
import type { WebhookHandler } from '../services/webhook-processor.service';
import type { WasabiWalletTransactionEvent } from '../../wasabi-client/interfaces/wasabi-webhook.types';

const WALLET_STATUS_MAP: Record<string, TransactionStatus> = {
  success: TransactionStatus.Completed,
  fail: TransactionStatus.Pending,
};

@Injectable()
export class WalletTransactionHandler implements WebhookHandler {
  private readonly logger = new Logger(WalletTransactionHandler.name);

  constructor(
    @InjectRepository(CardTransactionEntity)
    private readonly txRepo: Repository<CardTransactionEntity>,
    private readonly auditService: AuditService,
  ) {}

  async handle(payload: Record<string, unknown>): Promise<void> {
    const data = payload as unknown as WasabiWalletTransactionEvent;

    const rawStatus = data.status?.toLowerCase() ?? '';
    const status = WALLET_STATUS_MAP[rawStatus] ?? TransactionStatus.Pending;

    if (rawStatus === 'fail') {
      this.logger.warn(
        `wallet_transaction: orderNo=${data.orderNo} status=fail — marking pending_review (not final)`,
      );
    }

    const WALLET_CARD_PLACEHOLDER = '00000000-0000-0000-0000-000000000000';

    await this.txRepo.upsert(
      {
        cardId: WALLET_CARD_PLACEHOLDER,
        wasabiTxnId: data.orderNo,
        merchantName: null,
        amount: data.receivedAmount ?? data.txAmount,
        currency: data.currency,
        direction: TransactionDirection.Credit,
        status,
        transactionType: TransactionType.Settlement,
        occurredAt: data.confirmTime ? new Date(data.confirmTime) : null,
        rawPayload: {
          orderNo: data.orderNo,
          txId: data.txId,
          chain: data.chain,
          type: data.type,
          status: data.status,
          txAmount: data.txAmount,
          currency: data.currency,
        },
      },
      ['wasabiTxnId'],
    );

    this.auditService.log({
      action: 'webhook.wallet_transaction',
      metadata: {
        status: data.status,
        chain: data.chain,
        amount: data.txAmount,
        orderNo: data.orderNo,
      },
    });
  }
}
