import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AuthorizationPolicyGuard } from '../auth/authorization-policy.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import {
  EcrituresComptablesQueryDto,
  EcrituresComptablesSourceQueryDto,
  GenerateEcrituresDto
} from './dto/ecritures-comptables.dto';
import { EcrituresComptablesService } from './ecritures-comptables.service';

@Controller('ecritures-comptables')
@UseGuards(JwtAuthGuard, AuthorizationPolicyGuard)
export class EcrituresComptablesController {
  constructor(private readonly ecrituresService: EcrituresComptablesService) {}

  @Get()
  @RequirePermissions('referentiels:read')
  getAll(@CurrentUser() user: AuthenticatedUser, @Query() query: EcrituresComptablesQueryDto) {
    return this.ecrituresService.getAll(user, query);
  }

  @Get('source')
  @RequirePermissions('referentiels:read')
  getBySource(@CurrentUser() user: AuthenticatedUser, @Query() query: EcrituresComptablesSourceQueryDto) {
    return this.ecrituresService.getBySource(user, query.typeOperation, query.sourceId);
  }

  @Get('stats')
  @RequirePermissions('referentiels:read')
  getStats(@CurrentUser() user: AuthenticatedUser, @Query() query: EcrituresComptablesQueryDto) {
    return this.ecrituresService.getStats(user, query.exerciceId);
  }

  @Post('generate')
  @RequirePermissions('referentiels:write')
  generate(@CurrentUser() user: AuthenticatedUser, @Body() body: GenerateEcrituresDto) {
    return this.ecrituresService.generateForOperation(user, body.typeOperation, body.sourceId, body.exerciceId);
  }
}
