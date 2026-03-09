import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AuthorizationPolicyGuard } from '../auth/authorization-policy.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import {
  ConsumeIncomingIntegrationEventDto,
  CreateOutgoingIntegrationEventDto,
  IntegrationDispatchQueryDto,
  ListIntegrationEventsQueryDto,
  RemediateIntegrationEventDto,
  RetryIntegrationEventDto,
} from './dto/integration-legacy.dto';
import { IntegrationLegacyService } from './integration-legacy.service';

@Controller('integration-legacy')
@UseGuards(JwtAuthGuard, AuthorizationPolicyGuard)
export class IntegrationLegacyController {
  constructor(private readonly integrationLegacyService: IntegrationLegacyService) {}

  @Post('outgoing')
  @RequirePermissions('referentiels:write')
  createOutgoing(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateOutgoingIntegrationEventDto) {
    return this.integrationLegacyService.createOutgoing(user, body);
  }

  @Post('dispatch')
  @RequirePermissions('referentiels:write')
  dispatchQueued(@CurrentUser() user: AuthenticatedUser, @Query() query: IntegrationDispatchQueryDto) {
    return this.integrationLegacyService.dispatchQueued(user, query);
  }

  @Post('incoming')
  @RequirePermissions('referentiels:write')
  consumeIncoming(@CurrentUser() user: AuthenticatedUser, @Body() body: ConsumeIncomingIntegrationEventDto) {
    return this.integrationLegacyService.consumeIncoming(user, body);
  }

  @Get('supervision')
  @RequirePermissions('referentiels:audit:read')
  getSupervision(@CurrentUser() user: AuthenticatedUser, @Query() query: ListIntegrationEventsQueryDto) {
    return this.integrationLegacyService.getSupervision(user, query);
  }

  @Post('events/:id/retry')
  @RequirePermissions('referentiels:write')
  retryFailed(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: RetryIntegrationEventDto
  ) {
    return this.integrationLegacyService.retryEvent(user, id, body);
  }

  @Post('events/:id/remediate')
  @RequirePermissions('referentiels:write')
  remediate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: RemediateIntegrationEventDto
  ) {
    return this.integrationLegacyService.remediateEvent(user, id, body);
  }
}
