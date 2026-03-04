import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AuthorizationPolicyGuard } from '../auth/authorization-policy.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import {
  AnnulerFactureDto,
  CreateFactureDto,
  FacturesPaginatedQueryDto,
  FacturesQueryDto,
  GenerateTestFacturesDto,
  GenererNumeroFactureQueryDto,
  UpdateFactureDto
} from './dto/factures.dto';
import { FacturesService } from './factures.service';

@Controller('factures')
@UseGuards(JwtAuthGuard, AuthorizationPolicyGuard)
export class FacturesController {
  constructor(private readonly facturesService: FacturesService) {}

  @Get()
  @RequirePermissions('referentiels:read')
  getAll(@CurrentUser() user: AuthenticatedUser, @Query() query: FacturesQueryDto) {
    return this.facturesService.getAll(user, query.exerciceId);
  }

  @Get('paginated')
  @RequirePermissions('referentiels:read')
  getPaginated(@CurrentUser() user: AuthenticatedUser, @Query() query: FacturesPaginatedQueryDto) {
    return this.facturesService.getPaginated(user, query);
  }

  @Get('stats')
  @RequirePermissions('referentiels:read')
  getStats(@CurrentUser() user: AuthenticatedUser, @Query() query: FacturesQueryDto) {
    return this.facturesService.getStats(user, query.exerciceId);
  }

  @Get('generer-numero')
  @RequirePermissions('referentiels:read')
  getNextNumero(@CurrentUser() user: AuthenticatedUser, @Query() query: GenererNumeroFactureQueryDto) {
    return this.facturesService.genererNumero(user, query.exerciceId);
  }

  @Post('generate-test-data')
  @RequirePermissions('referentiels:write')
  generateTestData(@CurrentUser() user: AuthenticatedUser, @Body() body: GenerateTestFacturesDto) {
    return this.facturesService.generateTestData(user, body);
  }

  @Get(':id')
  @RequirePermissions('referentiels:read')
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.facturesService.getById(user, id);
  }

  @Post()
  @RequirePermissions('referentiels:write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateFactureDto) {
    return this.facturesService.create(user, body);
  }

  @Patch(':id')
  @RequirePermissions('referentiels:write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: UpdateFactureDto) {
    return this.facturesService.update(user, id, body);
  }

  @Patch(':id/valider')
  @RequirePermissions('referentiels:write')
  valider(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.facturesService.valider(user, id);
  }

  @Patch(':id/marquer-payee')
  @RequirePermissions('referentiels:write')
  marquerPayee(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.facturesService.marquerPayee(user, id);
  }

  @Patch(':id/annuler')
  @RequirePermissions('referentiels:write')
  annuler(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: AnnulerFactureDto) {
    return this.facturesService.annuler(user, id, body.motif);
  }

  @Delete(':id')
  @RequirePermissions('referentiels:write')
  async delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.facturesService.delete(user, id);
  }
}
