import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AuthorizationPolicyGuard } from '../auth/authorization-policy.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { TenantExerciceScopeGuard } from '../auth/tenant-exercice-scope.guard';
import {
  ListOfflineSyncItemsQueryDto,
  OfflineSyncHealthQueryDto,
  RetryOfflineSyncItemDto,
  SyncOfflineItemDto,
} from './dto/offline-sync.dto';
import { OfflineSyncService } from './offline-sync.service';

@Controller('offline-sync')
@UseGuards(JwtAuthGuard, AuthorizationPolicyGuard, TenantExerciceScopeGuard)
export class OfflineSyncController {
  constructor(private readonly offlineSyncService: OfflineSyncService) {}

  @Post('items')
  @RequirePermissions('referentiels:write')
  syncItem(@CurrentUser() user: AuthenticatedUser, @Body() body: SyncOfflineItemDto) {
    return this.offlineSyncService.syncItem(user, body);
  }

  @Get('supervision')
  @RequirePermissions('referentiels:audit:read')
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListOfflineSyncItemsQueryDto) {
    return this.offlineSyncService.list(user, query);
  }

  @Post('items/:id/retry')
  @RequirePermissions('referentiels:write')
  retry(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: RetryOfflineSyncItemDto) {
    return this.offlineSyncService.retry(user, id, body);
  }

  @Get('health')
  @RequirePermissions('referentiels:audit:read')
  health(@CurrentUser() user: AuthenticatedUser, @Query() query: OfflineSyncHealthQueryDto) {
    return this.offlineSyncService.health(user, query.exerciceId);
  }
}
