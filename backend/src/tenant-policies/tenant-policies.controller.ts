import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { AuthorizationPolicyGuard } from '../auth/authorization-policy.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { RetentionPolicyQueryDto, UpdateRetentionPolicyDto } from './dto/retention-policy.dto';
import { TenantPoliciesService } from './tenant-policies.service';

@Controller('tenant-policies')
@UseGuards(JwtAuthGuard, AuthorizationPolicyGuard)
export class TenantPoliciesController {
  constructor(private readonly service: TenantPoliciesService) {}

  @Get('retention')
  @RequirePermissions('tenant_policies:read')
  getRetentionPolicy(@CurrentUser() user: AuthenticatedUser, @Query() query: RetentionPolicyQueryDto) {
    return this.service.getRetentionPolicy(user, query.tenantId);
  }

  @Patch('retention')
  @RequirePermissions('tenant_policies:write')
  updateRetentionPolicy(@CurrentUser() user: AuthenticatedUser, @Body() body: UpdateRetentionPolicyDto) {
    return this.service.updateRetentionPolicy(user, body);
  }
}
