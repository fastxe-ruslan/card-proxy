import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CardEntity } from '../../cards/entities/card.entity';
import { CardTransactionEntity } from '../../cards/entities/card-transaction.entity';
import { CardStatus } from '../../cards/enums/card-status.enum';
import { TransactionDirection } from '../../cards/enums/transaction.enums';
import { SubscriptionsService } from './subscriptions.service';
import { PlanFeatures } from '../interfaces/plan-features.interface';
import { CardType } from '../../cards/enums/card-type.enum';

export class LimitExceededException extends ForbiddenException {
  constructor(
    public readonly limitType: 'cards' | 'topup_monthly',
    public readonly current: number,
    public readonly max: number,
    public readonly requiredPlan: string,
  ) {
    super({
      code: 'LIMIT_EXCEEDED',
      limitType,
      current,
      max,
      requiredPlan,
      message: `${limitType} limit exceeded`,
    });
  }
}

@Injectable()
export class SubscriptionLimitsService {
  constructor(
    @InjectRepository(CardEntity)
    private readonly cardRepo: Repository<CardEntity>,
    @InjectRepository(CardTransactionEntity)
    private readonly txRepo: Repository<CardTransactionEntity>,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async checkCardLimit(
    userId: string,
    requestedCardType?: string,
  ): Promise<void> {
    const plan = await this.subscriptionsService.getActivePlan(userId);
    const features = this.getFeatures(plan.featuresJson);

    if (requestedCardType === CardType.Physical) {
      if (!features.allowedCardTypes.includes('physical')) {
        throw new LimitExceededException('cards', 0, 0, 'premium');
      }
    }

    const activeCards = await this.cardRepo.count({
      where: {
        userId,
        status: CardStatus.Active,
      },
    });

    if (activeCards >= features.maxCards) {
      throw new LimitExceededException(
        'cards',
        activeCards,
        features.maxCards,
        this.requiredPlanForMoreCards(features.maxCards),
      );
    }
  }

  async checkTopupLimit(userId: string, amount: number): Promise<void> {
    const plan = await this.subscriptionsService.getActivePlan(userId);
    const features = this.getFeatures(plan.featuresJson);

    if (amount > features.topupLimitPerTransaction) {
      throw new LimitExceededException(
        'topup_monthly',
        amount,
        features.topupLimitPerTransaction,
        this.requiredPlanForHigherTopup(features.topupLimitPerTransaction),
      );
    }

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date();
    monthEnd.setMonth(monthEnd.getMonth() + 1, 1);
    monthEnd.setHours(0, 0, 0, 0);

    const monthlyTopups = await this.txRepo
      .createQueryBuilder('tx')
      .innerJoin('tx.card', 'card', 'card.user_id = :userId', { userId })
      .where('tx.direction = :dir', { dir: TransactionDirection.Credit })
      .andWhere('tx.createdAt BETWEEN :start AND :end', {
        start: monthStart,
        end: monthEnd,
      })
      .select('COALESCE(SUM(tx.amount), 0)', 'total')
      .getRawOne<{ total: string }>();

    const totalSoFar = Number(monthlyTopups?.total ?? 0);

    if (totalSoFar + amount > features.topupLimitPerMonth) {
      throw new LimitExceededException(
        'topup_monthly',
        Math.round(totalSoFar),
        features.topupLimitPerMonth,
        this.requiredPlanForHigherTopup(features.topupLimitPerMonth),
      );
    }
  }

  private getFeatures(raw: PlanFeatures | null): PlanFeatures {
    return (
      raw ?? {
        maxCards: 1,
        topupLimitPerMonth: 500,
        topupLimitPerTransaction: 200,
        allowedCardTypes: ['virtual'],
        allowedPrograms: [],
        kycRequired: true,
      }
    );
  }

  private requiredPlanForMoreCards(currentMax: number): string {
    if (currentMax < 2) return 'basic';
    return 'premium';
  }

  private requiredPlanForHigherTopup(currentLimit: number): string {
    if (currentLimit < 2000) return 'basic';
    return 'premium';
  }
}
