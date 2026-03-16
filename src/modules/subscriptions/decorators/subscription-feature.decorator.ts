import { SetMetadata } from '@nestjs/common';
import { PlanFeature } from '../enums/plan-feature.enum';

export const SUBSCRIPTION_FEATURE_KEY = 'subscriptionFeature';

export const RequireSubscriptionFeature = (feature: PlanFeature) =>
  SetMetadata(SUBSCRIPTION_FEATURE_KEY, feature);
