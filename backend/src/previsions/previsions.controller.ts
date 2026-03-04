import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AuthorizationPolicyGuard } from '../auth/authorization-policy.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import {
  CreateLignePrevisionDto,
  CreateScenarioDto,
  DupliquerScenarioDto,
  GenererPrevisionsDto,
  LignesPrevisionQueryDto,
  UpdateLignePrevisionDto,
  UpdateScenarioDto
} from './dto/previsions.dto';
import { PrevisionsService } from './previsions.service';

@Controller('previsions')
@UseGuards(JwtAuthGuard, AuthorizationPolicyGuard)
export class PrevisionsController {
  constructor(private readonly previsionsService: PrevisionsService) {}

  @Get('scenarios')
  @RequirePermissions('referentiels:read')
  getScenarios(@CurrentUser() user: AuthenticatedUser) {
    return this.previsionsService.getScenarios(user);
  }

  @Get('scenarios/:id')
  @RequirePermissions('referentiels:read')
  getScenarioById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.previsionsService.getScenarioById(user, id);
  }

  @Post('scenarios')
  @RequirePermissions('referentiels:write')
  createScenario(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateScenarioDto) {
    return this.previsionsService.createScenario(user, body);
  }

  @Patch('scenarios/:id')
  @RequirePermissions('referentiels:write')
  updateScenario(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: UpdateScenarioDto) {
    return this.previsionsService.updateScenario(user, id, body);
  }

  @Delete('scenarios/:id')
  @RequirePermissions('referentiels:write')
  async deleteScenario(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.previsionsService.deleteScenario(user, id);
  }

  @Patch('scenarios/:id/valider')
  @RequirePermissions('referentiels:write')
  validerScenario(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.previsionsService.validerScenario(user, id);
  }

  @Patch('scenarios/:id/archiver')
  @RequirePermissions('referentiels:write')
  archiverScenario(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.previsionsService.archiverScenario(user, id);
  }

  @Post('scenarios/:id/dupliquer')
  @RequirePermissions('referentiels:write')
  dupliquerScenario(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: DupliquerScenarioDto) {
    return this.previsionsService.dupliquerScenario(user, id, body);
  }

  @Get('lignes')
  @RequirePermissions('referentiels:read')
  getLignes(@CurrentUser() user: AuthenticatedUser, @Query() query: LignesPrevisionQueryDto) {
    return this.previsionsService.getLignesPrevision(user, query);
  }

  @Post('lignes')
  @RequirePermissions('referentiels:write')
  createLigne(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateLignePrevisionDto) {
    return this.previsionsService.createLignePrevision(user, body);
  }

  @Patch('lignes/:id')
  @RequirePermissions('referentiels:write')
  updateLigne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: UpdateLignePrevisionDto) {
    return this.previsionsService.updateLignePrevision(user, id, body);
  }

  @Delete('lignes/:id')
  @RequirePermissions('referentiels:write')
  async deleteLigne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.previsionsService.deleteLignePrevision(user, id);
  }

  @Post('generer')
  @RequirePermissions('referentiels:write')
  generer(@CurrentUser() user: AuthenticatedUser, @Body() body: GenererPrevisionsDto) {
    return this.previsionsService.genererPrevisions(user, body);
  }
}
