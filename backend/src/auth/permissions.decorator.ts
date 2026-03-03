import { SetMetadata } from '@nestjs/common';
import type { Permission } from './authorization.types';

export const PERMISSIONS_KEY = 'permissions';

export const RequirePermissions = (...permissions: Permission[]) => SetMetadata(PERMISSIONS_KEY, permissions);
