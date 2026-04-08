import 'dotenv/config';
import { DataSource } from 'typeorm';
import { UserEntity } from '../modules/auth/entities/user.entity';
import { AuthIdentityEntity } from '../modules/auth/entities/auth-identity.entity';
import { RefreshTokenEntity } from '../modules/auth/entities/refresh-token.entity';
import { EmailVerificationEntity } from '../modules/auth/entities/email-verification.entity';
import { SubscriptionPlanEntity } from '../modules/subscriptions/entities/subscription-plan.entity';
import { SubscriptionEntity } from '../modules/subscriptions/entities/subscription.entity';
import { SubscriptionEventEntity } from '../modules/subscriptions/entities/subscription-event.entity';
import { AuditLogEntity } from '../modules/audit/entities/audit-log.entity';
import { WebhookEventEntity } from '../modules/audit/entities/webhook-event.entity';
import { CardholderEntity } from '../modules/cards/entities/cardholder.entity';
import { CardEntity } from '../modules/cards/entities/card.entity';
import { CardTransactionEntity } from '../modules/cards/entities/card-transaction.entity';
import { TransactionEntity } from '../modules/transactions/entities/transaction.entity';
import { WasabiRequestLogEntity } from '../modules/wasabi-client/entities/wasabi-request-log.entity';
import { WasabiWebhookEntity } from '../modules/webhooks/entities/wasabi-webhook.entity';
import { IdempotencyKeyEntity } from '../modules/webhooks/entities/idempotency-key.entity';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'card-proxy',
  schema: process.env.DB_SCHEMA ?? 'card_proxy',
  entities: [
    UserEntity,
    AuthIdentityEntity,
    RefreshTokenEntity,
    EmailVerificationEntity,
    SubscriptionPlanEntity,
    SubscriptionEntity,
    SubscriptionEventEntity,
    AuditLogEntity,
    WebhookEventEntity,
    CardholderEntity,
    CardEntity,
    CardTransactionEntity,
    TransactionEntity,
    WasabiRequestLogEntity,
    WasabiWebhookEntity,
    IdempotencyKeyEntity,
  ],
  migrations: ['src/database/migrations/*.ts'],
});

export default dataSource;
