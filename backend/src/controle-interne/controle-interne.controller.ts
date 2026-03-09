import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthorizationPolicyGuard } from '../auth/authorization-policy.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import {
  CreateInternalControlActionPlanDto,
  InternalControlActionPlanListQueryDto,
  InternalControlQueryDto,
  UpdateInternalControlActionPlanDto,
} from './dto/controle-interne.dto';
import { ControleInterneService } from './controle-interne.service';

@Controller('controle-interne')
@UseGuards(JwtAuthGuard, AuthorizationPolicyGuard)
export class ControleInterneController {
  constructor(private readonly service: ControleInterneService) {}

  @Get('workspace')
  @RequirePermissions('referentiels:audit:read')
  getWorkspace(@CurrentUser() user: AuthenticatedUser, @Query() query: InternalControlQueryDto) {
    return this.service.getWorkspace(user, query.exerciceId);
  }

  @Get('action-plans')
  @RequirePermissions('referentiels:audit:read')
  listActionPlans(@CurrentUser() user: AuthenticatedUser, @Query() query: InternalControlActionPlanListQueryDto) {
    return this.service.listActionPlans(user, query);
  }

  @Post('action-plans')
  @RequirePermissions('referentiels:audit:read')
  createActionPlan(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateInternalControlActionPlanDto) {
    return this.service.createActionPlan(user, body);
  }

  @Get('action-plans/:id/events')
  @RequirePermissions('referentiels:audit:read')
  listActionPlanEvents(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: InternalControlQueryDto
  ) {
    return this.service.listActionPlanEvents(user, id, query.exerciceId);
  }

  @Patch('action-plans/:id')
  @RequirePermissions('referentiels:audit:read')
  updateActionPlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: InternalControlQueryDto,
    @Body() body: UpdateInternalControlActionPlanDto
  ) {
    return this.service.updateActionPlan(user, id, query.exerciceId, body);
  }
}
