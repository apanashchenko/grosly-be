import { SetMetadata } from '@nestjs/common';
import { UsageAction } from '../enums/usage-action.enum';

export const USAGE_LIMIT_ACTION_KEY = 'usageLimitAction';

export const RequireUsageLimit = (action: UsageAction) =>
  SetMetadata(USAGE_LIMIT_ACTION_KEY, action);
