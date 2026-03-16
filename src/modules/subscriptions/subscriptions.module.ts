import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionPlanEntity } from './entities/subscription-plan.entity';
import { SubscriptionEntity } from './entities/subscription.entity';
import { SubscriptionEventEntity } from './entities/subscription-event.entity';
import { SubscriptionPlansService } from './services/subscription-plans.service';
import { SubscriptionsService } from './services/subscriptions.service';
import { SubscriptionLimitsService } from './services/subscription-limits.service';
import { SubscriptionSeedService } from './services/subscription-seed.service';
import { SubscriptionGuard } from './guards/subscription.guard';
import { SubscriptionsController } from './controllers/subscriptions.controller';
import { SubscriptionAdminController } from './controllers/subscription-admin.controller';
import { AuditModule } from '../audit/audit.module';
import { CardEntity } from '../cards/entities/card.entity';
import { CardTransactionEntity } from '../cards/entities/card-transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SubscriptionPlanEntity,
      SubscriptionEntity,
      SubscriptionEventEntity,
      CardEntity,
      CardTransactionEntity,
    ]),
    AuditModule,
  ],
  providers: [
    SubscriptionPlansService,
    SubscriptionsService,
    SubscriptionLimitsService,
    SubscriptionSeedService,
    SubscriptionGuard,
  ],
  controllers: [SubscriptionsController, SubscriptionAdminController],
  exports: [
    SubscriptionsService,
    SubscriptionPlansService,
    SubscriptionLimitsService,
    SubscriptionGuard,
    TypeOrmModule,
  ],
})
export class SubscriptionsModule {}
