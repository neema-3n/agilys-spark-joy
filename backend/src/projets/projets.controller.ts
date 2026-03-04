import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthorizationPolicyGuard } from '../auth/authorization-policy.guard';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CreateProjetDto, ProjetsQueryDto, UpdateProjetDto, UpdateTauxAvancementDto } from './dto/projets.dto';
import { ProjetsService } from './projets.service';

@Controller('projets')
@UseGuards(JwtAuthGuard, AuthorizationPolicyGuard)
export class ProjetsController {
  constructor(private readonly projetsService: ProjetsService) {}

  @Get()
  @RequirePermissions('referentiels:read')
  getByExercice(@CurrentUser() user: AuthenticatedUser, @Query() query: ProjetsQueryDto) {
    return this.projetsService.getByExercice(user, query.exerciceId);
  }

  @Get(':id')
  @RequirePermissions('referentiels:read')
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.projetsService.getById(user, id);
  }

  @Post()
  @RequirePermissions('referentiels:write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateProjetDto) {
    return this.projetsService.create(user, body);
  }

  @Patch(':id')
  @RequirePermissions('referentiels:write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: UpdateProjetDto) {
    return this.projetsService.update(user, id, body);
  }

  @Patch(':id/taux-avancement')
  @RequirePermissions('referentiels:write')
  updateTaux(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: UpdateTauxAvancementDto
  ) {
    return this.projetsService.updateTauxAvancement(user, id, body.taux);
  }

  @Delete(':id')
  @RequirePermissions('referentiels:write')
  async delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.projetsService.delete(user, id);
  }
}
