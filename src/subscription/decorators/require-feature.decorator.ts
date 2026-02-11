import { SetMetadata } from '@nestjs/common';
import { PlanFeatureKey } from '../plan-features.config';

export const REQUIRED_FEATURE_KEY = 'requiredFeature';

export const RequireFeature = (feature: PlanFeatureKey) =>
  SetMetadata(REQUIRED_FEATURE_KEY, feature);
