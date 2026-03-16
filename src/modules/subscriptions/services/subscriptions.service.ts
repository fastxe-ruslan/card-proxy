import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource, LessThan, Repository } from 'typeorm';
import { SubscriptionEntity } from '../entities/subscription.entity';
import { SubscriptionPlanEntity } from '../entities/subscription-plan.entity';
import { SubscriptionEventEntity } from '../entities/subscription-event.entity';
import { SubscriptionStatus } from '../enums/subscription-status.enum';
import { SubscriptionEventType } from '../enums/subscription-event-type.enum';
import { SubscriptionPlansService } from './subscription-plans.service';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/enums/audit-action.enum';
import { ActorType } from '../../audit/enums/actor-type.enum';
import { CorrelationService } from '../../../common/correlation/correlation.service';

export interface SubscriptionDto {
  id: string;
  status: SubscriptionStatus;
  startedAt: Date;
  endsAt: Date | null;
  daysRemaining: number | null;
  plan: {
    id: string;
    code: string;
    name: string;
    features: SubscriptionPlanEntity['featuresJson'];
    price: {
      amount: number | null;
      currency: string | null;
      period: string | null;
    };
  };
}

function toDto(sub: SubscriptionEntity): SubscriptionDto {
  const daysRemaining = sub.endsAt
    ? Math.max(0, Math.ceil((sub.endsAt.getTime() - Date.now()) / 86_400_000))
    : null;

  return {
    id: sub.id,
    status: sub.status,
    startedAt: sub.startedAt,
    endsAt: sub.endsAt,
    daysRemaining,
    plan: {
      id: sub.plan.id,
      code: sub.plan.code,
      name: sub.plan.name,
      features: sub.plan.featuresJson,
      price: {
        amount: sub.plan.priceAmount,
        currency: sub.plan.priceCurrency,
        period: sub.plan.billingPeriod,
      },
    },
  };
}

const FREE_PLAN_CODE = 'free';
const EXPIRY_BATCH_SIZE = 100;

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(SubscriptionEntity)
    private readonly subRepo: Repository<SubscriptionEntity>,
    @InjectRepository(SubscriptionEventEntity)
    private readonly eventRepo: Repository<SubscriptionEventEntity>,
    private readonly plansService: SubscriptionPlansService,
    private readonly auditService: AuditService,
    private readonly correlationService: CorrelationService,
    private readonly dataSource: DataSource,
  ) {}

  async getCurrent(userId: string): Promise<SubscriptionDto> {
    let sub = await this.subRepo.findOne({
      where: { userId, status: SubscriptionStatus.Active },
      relations: ['plan'],
    });

    if (!sub) {
      sub = await this.createFreeSubscription(userId);
    }

    return toDto(sub);
  }

  async subscribe(userId: string, planCode: string): Promise<SubscriptionDto> {
    const newPlan = await this.plansService.findByCode(planCode);

    const current = await this.subRepo.findOne({
      where: { userId, status: SubscriptionStatus.Active },
      relations: ['plan'],
    });

    if (current?.plan.code === planCode) {
      throw new ConflictException(`Already subscribed to '${planCode}'`);
    }

    const result = await this.dataSource.transaction(async (em) => {
      if (current) {
        current.status = SubscriptionStatus.Cancelled;
        current.cancelledAt = new Date();
        await em.save(current);
      }

      const newSub = em.create(SubscriptionEntity, {
        userId,
        planId: newPlan.id,
        status: SubscriptionStatus.Active,
        startedAt: new Date(),
        endsAt: null,
      });
      await em.save(newSub);

      const correlationId = this.correlationService.get();
      const event = em.create(SubscriptionEventEntity, {
        subscriptionId: newSub.id,
        userId,
        eventType: current
          ? SubscriptionEventType.PlanChanged
          : SubscriptionEventType.Created,
        fromPlanId: current?.planId ?? null,
        toPlanId: newPlan.id,
        correlationId,
      });
      await em.save(event);

      return newSub;
    });

    this.auditService.log({
      action: AuditAction.UserTokenRefreshed,
      actorType: ActorType.User,
      actorId: userId,
      entityType: 'subscription',
      entityId: result.id,
      metadata: { fromPlan: current?.plan.code ?? null, toPlan: planCode },
    });

    const sub = await this.subRepo.findOneOrFail({
      where: { id: result.id },
      relations: ['plan'],
    });
    return toDto(sub);
  }

  async cancel(userId: string, reason?: string): Promise<SubscriptionDto> {
    const current = await this.subRepo.findOne({
      where: { userId, status: SubscriptionStatus.Active },
      relations: ['plan'],
    });

    if (!current) {
      await this.createFreeSubscription(userId);
      throw new BadRequestException('Cannot cancel free plan');
    }

    if (current.plan.code === FREE_PLAN_CODE) {
      throw new BadRequestException('Cannot cancel free plan');
    }

    const freeSub = await this.dataSource.transaction(async (em) => {
      current.status = SubscriptionStatus.Cancelled;
      current.cancelledAt = new Date();
      current.cancelReason = reason ?? null;
      await em.save(current);

      const correlationId = this.correlationService.get();
      await em.save(
        em.create(SubscriptionEventEntity, {
          subscriptionId: current.id,
          userId,
          eventType: SubscriptionEventType.Cancelled,
          fromPlanId: current.planId,
          toPlanId: null,
          metadataJson: reason ? { reason } : null,
          correlationId,
        }),
      );

      const freePlan = await this.plansService.findByCode(FREE_PLAN_CODE);
      const newSub = em.create(SubscriptionEntity, {
        userId,
        planId: freePlan.id,
        status: SubscriptionStatus.Active,
        startedAt: new Date(),
      });
      await em.save(newSub);

      await em.save(
        em.create(SubscriptionEventEntity, {
          subscriptionId: newSub.id,
          userId,
          eventType: SubscriptionEventType.PlanChanged,
          fromPlanId: current.planId,
          toPlanId: freePlan.id,
          correlationId,
        }),
      );

      return newSub;
    });

    this.auditService.log({
      action: AuditAction.CardUnfreeze,
      actorType: ActorType.User,
      actorId: userId,
      entityType: 'subscription',
      entityId: current.id,
      metadata: { reason: reason ?? null, fromPlan: current.plan.code },
    });

    const sub = await this.subRepo.findOneOrFail({
      where: { id: freeSub.id },
      relations: ['plan'],
    });
    return toDto(sub);
  }

  async getHistory(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<{ data: SubscriptionEventEntity[]; total: number }> {
    const [data, total] = await this.eventRepo.findAndCount({
      where: { userId },
      relations: ['fromPlan', 'toPlan'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { data, total };
  }

  @Cron(CronExpression.EVERY_HOUR)
  async processExpiredSubscriptions(): Promise<void> {
    const now = new Date();
    let processed = 0;

    while (true) {
      const expired = await this.subRepo.find({
        where: { status: SubscriptionStatus.Active, endsAt: LessThan(now) },
        take: EXPIRY_BATCH_SIZE,
        relations: ['plan'],
      });

      if (expired.length === 0) break;

      for (const sub of expired) {
        await this.expireSingle(sub).catch((err: unknown) => {
          this.logger.error(
            { err, subId: sub.id },
            'Failed to expire subscription',
          );
        });
        processed++;
      }

      if (expired.length < EXPIRY_BATCH_SIZE) break;
    }

    if (processed > 0) {
      this.logger.log(`Expired ${processed} subscription(s)`);
    }
  }

  private async expireSingle(sub: SubscriptionEntity): Promise<void> {
    await this.dataSource.transaction(async (em) => {
      sub.status = SubscriptionStatus.Expired;
      await em.save(sub);

      const correlationId = this.correlationService.get();
      await em.save(
        em.create(SubscriptionEventEntity, {
          subscriptionId: sub.id,
          userId: sub.userId,
          eventType: SubscriptionEventType.Expired,
          fromPlanId: sub.planId,
          toPlanId: null,
          correlationId,
        }),
      );

      const freePlan = await this.plansService.findByCode(FREE_PLAN_CODE);
      const newSub = em.create(SubscriptionEntity, {
        userId: sub.userId,
        planId: freePlan.id,
        status: SubscriptionStatus.Active,
        startedAt: new Date(),
      });
      await em.save(newSub);

      await em.save(
        em.create(SubscriptionEventEntity, {
          subscriptionId: newSub.id,
          userId: sub.userId,
          eventType: SubscriptionEventType.PlanChanged,
          fromPlanId: sub.planId,
          toPlanId: freePlan.id,
          correlationId,
        }),
      );
    });

    this.auditService.log({
      action: AuditAction.CardFreeze,
      actorType: ActorType.System,
      entityType: 'subscription',
      entityId: sub.id,
      metadata: { userId: sub.userId, fromPlan: sub.plan.code },
    });

  }

  async createFreeSubscription(userId: string): Promise<SubscriptionEntity> {
    const freePlan = await this.plansService.findByCode(FREE_PLAN_CODE);
    const correlationId = this.correlationService.get();

    return this.dataSource.transaction(async (em) => {
      const sub = em.create(SubscriptionEntity, {
        userId,
        planId: freePlan.id,
        status: SubscriptionStatus.Active,
        startedAt: new Date(),
      });
      await em.save(sub);

      await em.save(
        em.create(SubscriptionEventEntity, {
          subscriptionId: sub.id,
          userId,
          eventType: SubscriptionEventType.Created,
          toPlanId: freePlan.id,
          correlationId,
        }),
      );

      return em.findOneOrFail(SubscriptionEntity, {
        where: { id: sub.id },
        relations: ['plan'],
      });
    });
  }

  async getActivePlan(userId: string): Promise<SubscriptionPlanEntity> {
    const sub = await this.subRepo.findOne({
      where: { userId, status: SubscriptionStatus.Active },
      relations: ['plan'],
    });
    if (!sub) {
      return this.plansService.findByCode(FREE_PLAN_CODE);
    }
    return sub.plan;
  }
}
