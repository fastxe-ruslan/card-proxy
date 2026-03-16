import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionPlanEntity } from '../entities/subscription-plan.entity';
import { BillingPeriod } from '../enums/billing-period.enum';
import { PlanFeatures } from '../interfaces/plan-features.interface';

interface SeedPlan {
  code: string;
  name: string;
  description: string;
  priceAmount: number | null;
  priceCurrency: string | null;
  billingPeriod: BillingPeriod;
  featuresJson: PlanFeatures;
  isActive: boolean;
  sortOrder: number;
}

const SEED_PLANS: SeedPlan[] = [
  {
    code: 'free',
    name: 'Free',
    description: 'Get started with a virtual card and basic limits',
    priceAmount: 0,
    priceCurrency: 'USD',
    billingPeriod: BillingPeriod.Free,
    featuresJson: {
      maxCards: 1,
      topupLimitPerMonth: 500,
      topupLimitPerTransaction: 200,
      allowedCardTypes: ['virtual'],
      allowedPrograms: [],
      kycRequired: true,
    },
    isActive: true,
    sortOrder: 0,
  },
  {
    code: 'basic',
    name: 'Basic',
    description: 'More cards and higher limits for everyday use',
    priceAmount: null,  
    priceCurrency: 'USD',
    billingPeriod: BillingPeriod.Monthly,
    featuresJson: {
      maxCards: 2,
      topupLimitPerMonth: 2000,
      topupLimitPerTransaction: 1000,
      allowedCardTypes: ['virtual'],
      allowedPrograms: [],
      kycRequired: true,
    },
    isActive: true,
    sortOrder: 1,
  },
  {
    code: 'premium',
    name: 'Premium',
    description:
      'Unlimited virtual cards, physical cards, and the highest limits',
    priceAmount: null,
    priceCurrency: 'USD',
    billingPeriod: BillingPeriod.Monthly,
    featuresJson: {
      maxCards: 5,
      topupLimitPerMonth: 10000,
      topupLimitPerTransaction: 5000,
      allowedCardTypes: ['virtual', 'physical'],
      allowedPrograms: [],
      kycRequired: true,
    },
    isActive: true,
    sortOrder: 2,
  },
];

@Injectable()
export class SubscriptionSeedService implements OnModuleInit {
  private readonly logger = new Logger(SubscriptionSeedService.name);

  constructor(
    @InjectRepository(SubscriptionPlanEntity)
    private readonly planRepo: Repository<SubscriptionPlanEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.seed();
    } catch (err: unknown) {
      this.logger.error(
        { err },
        'Failed to seed subscription plans — skipping',
      );
    }
  }

  async seed(): Promise<void> {
    for (const plan of SEED_PLANS) {
      await this.planRepo.upsert(
        {
          code: plan.code,
          name: plan.name,
          description: plan.description,
          priceAmount: plan.priceAmount,
          priceCurrency: plan.priceCurrency,
          billingPeriod: plan.billingPeriod,
          featuresJson: plan.featuresJson,
          isActive: plan.isActive,
          sortOrder: plan.sortOrder,
        },
        { conflictPaths: ['code'], skipUpdateIfNoValuesChanged: true },
      );
    }
    this.logger.log('Subscription plans seeded successfully');
  }
}
