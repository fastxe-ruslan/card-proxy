import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { WebhookEventEntity } from '../audit/entities/webhook-event.entity';
import { TransactionEntity } from '../transactions/entities/transaction.entity';
import { WasabiApiService } from '../wasabi-client/services/wasabi-api.service';
import { WasabiWebhookEventType } from '../wasabi-client/interfaces/wasabi-webhook.types';
import type {
  WasabiCardTransactionEvent,
  WasabiCardHolderEvent,
} from '../wasabi-client/interfaces/wasabi-webhook.types';

@Injectable()
export class WasabiSyncService {
  private readonly logger = new Logger(WasabiSyncService.name);

  constructor(
    @InjectRepository(WebhookEventEntity)
    private readonly webhookEventRepo: Repository<WebhookEventEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactionRepo: Repository<TransactionEntity>,
    private readonly wasabiApi: WasabiApiService,
    private readonly configService: ConfigService,
  ) {}

  async ingestWebhook(payload: Record<string, unknown>): Promise<void> {
    const eventId = payload.eventId?.toString() ?? payload.id?.toString();
    if (!eventId) return;

    const existing = await this.webhookEventRepo.findOne({
      where: { eventId },
    });
    if (existing) return;

    await this.webhookEventRepo.save(
      this.webhookEventRepo.create({ eventId, status: 'processed', payload }),
    );

    await this.applyPayload(payload);
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async reconcile(): Promise<void> {
    const programId = this.configService.get<string>('WASABI_PROGRAM_ID');
    if (!programId) {
      this.logger.warn('WASABI_PROGRAM_ID not set — skipping reconciliation');
      return;
    }

    try {
      const txResponse = await this.wasabiApi.getAuthTransactions(
        { pageNum: 1, pageSize: 200 },
        { programId },
      );

      for (const tx of txResponse.records) {
        await this.transactionRepo.upsert(
          {
            externalTransactionId: tx.transactionId,
            externalCardId: tx.cardId,
            amount: tx.amount,
            currency: tx.currency,
            status: tx.status,
            description: tx.merchantName ?? null,
            postedAt: tx.createdAt ? new Date(Number(tx.createdAt)) : null,
          },
          ['externalTransactionId'],
        );
      }

      this.logger.log(
        `Reconciliation: synced ${txResponse.records.length} transactions`,
      );
    } catch (err) {
      this.logger.error('Reconciliation failed', err);
    }
  }

  private async applyPayload(payload: Record<string, unknown>): Promise<void> {
    const eventType = payload.eventType?.toString() ?? payload.type?.toString();

    if (eventType === WasabiWebhookEventType.CardTransaction) {
      const data = payload.data as WasabiCardTransactionEvent | undefined;
      if (!data?.orderNo) return;

      await this.transactionRepo.upsert(
        {
          externalTransactionId: data.orderNo,
          externalCardId: data.cardNo,
          amount: data.amount,
          currency: data.currency,
          status: data.status,
          description: null,
          postedAt: data.transactionTime
            ? new Date(data.transactionTime)
            : null,
        },
        ['externalTransactionId'],
      );
    }

    if (eventType === WasabiWebhookEventType.CardHolder) {
      const data = payload.data as WasabiCardHolderEvent | undefined;
      if (!data?.holderId) return;
      this.logger.log(
        `Holder status changed: ${data.holderId} → ${data.status}`,
      );
    }
  }
}
