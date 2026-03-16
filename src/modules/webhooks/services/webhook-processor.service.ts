import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WasabiWebhookEntity } from '../entities/wasabi-webhook.entity';
import { WebhookStatus } from '../enums/webhook-status.enum';
import { WebhookCategory } from '../enums/webhook-category.enum';
import { IdempotencyService } from './idempotency.service';
import { WebhookQueueService } from './webhook-queue.service';
import { AuditService } from '../../audit/audit.service';
import type { WebhookJobData } from '../dto/webhook-job.dto';
import { CardTransactionHandler } from '../handlers/card-transaction.handler';
import { CardAuthTransactionHandler } from '../handlers/card-auth-transaction.handler';
import { CardFeePatchHandler } from '../handlers/card-fee-patch.handler';
import { Card3dsHandler } from '../handlers/card-3ds.handler';
import { CardHolderHandler } from '../handlers/card-holder.handler';
import { PhysicalCardHandler } from '../handlers/physical-card.handler';
import { WorkOrderHandler } from '../handlers/work-order.handler';
import { WalletTransactionHandler } from '../handlers/wallet-transaction.handler';

export interface WebhookHandler {
  handle(payload: Record<string, unknown>): Promise<void>;
}

const IDEMPOTENCY_SCOPE = 'webhook';

@Injectable()
export class WebhookProcessorService implements OnModuleInit {
  private readonly logger = new Logger(WebhookProcessorService.name);
  private readonly handlers = new Map<string, WebhookHandler>();

  constructor(
    @InjectRepository(WasabiWebhookEntity)
    private readonly webhookRepo: Repository<WasabiWebhookEntity>,
    private readonly idempotency: IdempotencyService,
    private readonly queueService: WebhookQueueService,
    private readonly auditService: AuditService,
    private readonly cardTransactionHandler: CardTransactionHandler,
    private readonly cardAuthTransactionHandler: CardAuthTransactionHandler,
    private readonly cardFeePatchHandler: CardFeePatchHandler,
    private readonly card3dsHandler: Card3dsHandler,
    private readonly cardHolderHandler: CardHolderHandler,
    private readonly physicalCardHandler: PhysicalCardHandler,
    private readonly workOrderHandler: WorkOrderHandler,
    private readonly walletTransactionHandler: WalletTransactionHandler,
  ) {}

  onModuleInit(): void {
    this.handlers.set(
      WebhookCategory.CardTransaction,
      this.cardTransactionHandler,
    );
    this.handlers.set(
      WebhookCategory.CardAuthTransaction,
      this.cardAuthTransactionHandler,
    );
    this.handlers.set(WebhookCategory.CardFeePatch, this.cardFeePatchHandler);
    this.handlers.set(WebhookCategory.Card3ds, this.card3dsHandler);
    this.handlers.set(WebhookCategory.CardHolder, this.cardHolderHandler);
    this.handlers.set(WebhookCategory.PhysicalCard, this.physicalCardHandler);
    this.handlers.set(WebhookCategory.Work, this.workOrderHandler);
    this.handlers.set(
      WebhookCategory.WalletTransaction,
      this.walletTransactionHandler,
    );

    this.queueService.setProcessor(this);
  }

  async processJob(data: WebhookJobData): Promise<void> {
    const wh = await this.webhookRepo.findOne({
      where: { id: data.webhookId },
    });
    if (!wh) {
      this.logger.warn(`Webhook ${data.webhookId} not found in DB — skipping`);
      return;
    }

    await this.updateStatus(wh, WebhookStatus.Processing);

    const alreadyProcessed = await this.idempotency.check(
      data.requestId,
      IDEMPOTENCY_SCOPE,
    );
    if (alreadyProcessed) {
      this.logger.log(
        `Duplicate webhook ${data.requestId} — marking as duplicate`,
      );
      await this.updateStatus(wh, WebhookStatus.Duplicate);
      return;
    }

    const handler = this.handlers.get(data.category);
    if (!handler) {
      this.logger.warn(
        `Unknown webhook category: "${data.category}" — ACK without processing`,
      );
      await this.idempotency.mark(data.requestId, IDEMPOTENCY_SCOPE);
      await this.finalise(wh, WebhookStatus.Processed);
      return;
    }

    try {
      await handler.handle(data.payload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Handler failed for ${data.category} / ${data.requestId}: ${msg}`,
      );
      await this.updateStatus(wh, WebhookStatus.Failed, msg);
      throw err;
    }

    await this.idempotency.mark(data.requestId, IDEMPOTENCY_SCOPE);
    await this.finalise(wh, WebhookStatus.Processed);

    this.auditService.log({
      action: `webhook.processed`,
      entityType: 'webhook',
      entityId: wh.id,
      metadata: { category: data.category, requestId: data.requestId },
    });
  }

  private async updateStatus(
    wh: WasabiWebhookEntity,
    status: WebhookStatus,
    errorMessage?: string,
  ): Promise<void> {
    wh.status = status;
    if (errorMessage) wh.errorMessage = errorMessage;
    await this.webhookRepo.save(wh);
  }

  private async finalise(
    wh: WasabiWebhookEntity,
    status: WebhookStatus,
  ): Promise<void> {
    wh.status = status;
    wh.processedAt = new Date();
    await this.webhookRepo.save(wh);
  }
}
