import { PlanType } from './enums/plan-type.enum';

export interface PlanFeatures {
  canSuggestRecipes: boolean;
  canUseCustomCategories: boolean;
  canUsePreferences: boolean;
  canShareLists: boolean;
  canParseFromUrl: boolean;
  canParseFromPhoto: boolean;
}

export type PlanFeatureKey = keyof PlanFeatures;

const FREE_FEATURES: PlanFeatures = {
  canSuggestRecipes: false,
  canUseCustomCategories: false,
  canUsePreferences: false,
  canShareLists: false,
  canParseFromUrl: false,
  canParseFromPhoto: false,
};

const PRO_FEATURES: PlanFeatures = {
  canSuggestRecipes: true,
  canUseCustomCategories: true,
  canUsePreferences: true,
  canShareLists: false,
  canParseFromUrl: false,
  canParseFromPhoto: false,
};

const PREMIUM_FEATURES: PlanFeatures = {
  canSuggestRecipes: true,
  canUseCustomCategories: true,
  canUsePreferences: true,
  canShareLists: true,
  canParseFromUrl: true,
  canParseFromPhoto: true,
};

export const PLAN_FEATURES: Record<PlanType, PlanFeatures> = {
  [PlanType.FREE]: FREE_FEATURES,
  [PlanType.PRO]: PRO_FEATURES,
  [PlanType.PREMIUM]: PREMIUM_FEATURES,
};

export function getPlanFeatures(planType: PlanType): PlanFeatures {
  return PLAN_FEATURES[planType] ?? FREE_FEATURES;
}
