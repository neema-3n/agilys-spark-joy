import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthorizationPolicyGuard } from '../auth/authorization-policy.guard';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { AnalysesFinancieresService } from './analyses-financieres.service';
import { AnalysesFinancieresQueryDto } from './dto/analyses-financieres.dto';

@Controller('analyses-financieres')
@UseGuards(JwtAuthGuard, AuthorizationPolicyGuard)
export class AnalysesFinancieresController {
  constructor(private readonly analysesService: AnalysesFinancieresService) {}

  @Get()
  @RequirePermissions('referentiels:read')
  getAggregation(@CurrentUser() user: AuthenticatedUser, @Query() query: AnalysesFinancieresQueryDto) {
    return this.analysesService.getAggregation(user, query);
  }
}

