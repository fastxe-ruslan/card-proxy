import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WasabiWebhookEntity } from './entities/wasabi-webhook.entity';
import { IdempotencyKeyEntity } from './entities/idempotency-key.entity';
import { CardEntity } from '../cards/entities/card.entity';
import { CardholderEntity } from '../cards/entities/cardholder.entity';
import { CardTransactionEntity } from '../cards/entities/card-transaction.entity';
import { WebhookSignatureService } from './services/webhook-signature.service';
import { IdempotencyService } from './services/idempotency.service';
import { WebhookQueueService } from './services/webhook-queue.service';
import { WebhookProcessorService } from './services/webhook-processor.service';
import { CardTransactionHandler } from './handlers/card-transaction.handler';
import { CardAuthTransactionHandler } from './handlers/card-auth-transaction.handler';
import { CardFeePatchHandler } from './handlers/card-fee-patch.handler';
import { Card3dsHandler } from './handlers/card-3ds.handler';
import { CardHolderHandler } from './handlers/card-holder.handler';
import { PhysicalCardHandler } from './handlers/physical-card.handler';
import { WorkOrderHandler } from './handlers/work-order.handler';
import { WalletTransactionHandler } from './handlers/wallet-transaction.handler';
import { WebhookController } from './controllers/webhook.controller';
import { WebhookAdminController } from './controllers/webhook-admin.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WasabiWebhookEntity,
      IdempotencyKeyEntity,
      CardEntity,
      CardholderEntity,
      CardTransactionEntity,
    ]),
    AuditModule,
  ],
  providers: [
    WebhookSignatureService,
    IdempotencyService,
    WebhookQueueService,
    WebhookProcessorService,
    CardTransactionHandler,
    CardAuthTransactionHandler,
    CardFeePatchHandler,
    Card3dsHandler,
    CardHolderHandler,
    PhysicalCardHandler,
    WorkOrderHandler,
    WalletTransactionHandler,
  ],
  controllers: [WebhookController, WebhookAdminController],
  exports: [WebhookQueueService, IdempotencyService],
})
export class WebhooksModule {}
