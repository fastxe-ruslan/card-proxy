import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { SUBSCRIPTION_FEATURE_KEY } from '../decorators/subscription-feature.decorator';
import { PlanFeature } from '../enums/plan-feature.enum';
import { SubscriptionsService } from '../services/subscriptions.service';
import { PlanFeatures } from '../interfaces/plan-features.interface';

const FREE_FEATURES: PlanFeatures = {
  maxCards: 1,
  topupLimitPerMonth: 500,
  topupLimitPerTransaction: 200,
  allowedCardTypes: ['virtual'],
  allowedPrograms: [],
  kycRequired: true,
};

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.getAllAndOverride<
      PlanFeature | undefined
    >(SUBSCRIPTION_FEATURE_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredFeature) return true;

    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: JwtPayload }>();
    const userId = req.user?.sub;
    if (!userId) return false;

    const plan = await this.subscriptionsService.getActivePlan(userId);
    const features = plan.featuresJson ?? FREE_FEATURES;

    const hasFeature = this.check(requiredFeature, features);
    if (!hasFeature) {
      const requiredPlan = this.minimumPlanFor(requiredFeature);
      throw new ForbiddenException({
        code: 'UPGRADE_REQUIRED',
        message: `Your current plan does not include this feature`,
        requiredPlan,
      });
    }

    return true;
  }

  private check(feature: PlanFeature, features: PlanFeatures): boolean {
    switch (feature) {
      case PlanFeature.PhysicalCard:
        return features.allowedCardTypes.includes('physical');
      case PlanFeature.MultipleCards:
        return features.maxCards > 1;
      case PlanFeature.HighTopupLimit:
        return features.topupLimitPerMonth > 500;
    }
  }

  private minimumPlanFor(feature: PlanFeature): string {
    switch (feature) {
      case PlanFeature.PhysicalCard:
        return 'premium';
      case PlanFeature.MultipleCards:
        return 'basic';
      case PlanFeature.HighTopupLimit:
        return 'basic';
    }
  }
}
