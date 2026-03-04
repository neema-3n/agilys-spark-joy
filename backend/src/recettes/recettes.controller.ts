import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AuthorizationPolicyGuard } from '../auth/authorization-policy.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { AnnulerRecetteDto, CreateRecetteDto, RecettesQueryDto, UpdateRecetteDto } from './dto/recettes.dto';
import { RecettesService } from './recettes.service';

@Controller('recettes')
@UseGuards(JwtAuthGuard, AuthorizationPolicyGuard)
export class RecettesController {
  constructor(private readonly recettesService: RecettesService) {}

  @Get()
  @RequirePermissions('referentiels:read')
  getAll(@CurrentUser() user: AuthenticatedUser, @Query() query: RecettesQueryDto) {
    return this.recettesService.getAll(user, query.exerciceId);
  }

  @Get('stats')
  @RequirePermissions('referentiels:read')
  getStats(@CurrentUser() user: AuthenticatedUser, @Query() query: RecettesQueryDto) {
    return this.recettesService.getStats(user, query.exerciceId);
  }

  @Get(':id')
  @RequirePermissions('referentiels:read')
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.recettesService.getById(user, id);
  }

  @Post()
  @RequirePermissions('referentiels:write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateRecetteDto) {
    return this.recettesService.create(user, body);
  }

  @Patch(':id')
  @RequirePermissions('referentiels:write')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: UpdateRecetteDto
  ): Promise<void> {
    await this.recettesService.update(user, id, body);
  }

  @Patch(':id/annuler')
  @RequirePermissions('referentiels:write')
  async annuler(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: AnnulerRecetteDto
  ): Promise<void> {
    await this.recettesService.annuler(user, id, body.motif);
  }
}
