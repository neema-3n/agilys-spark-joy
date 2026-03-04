import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AuthorizationPolicyGuard } from '../auth/authorization-policy.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import {
  AnnulerBonCommandeDto,
  BonsCommandeQueryDto,
  CreateBonCommandeDto,
  GenererNumeroBonCommandeQueryDto,
  ReceptionnerBonCommandeDto,
  UpdateBonCommandeDto
} from './dto/bons-commande.dto';
import { BonsCommandeService } from './bons-commande.service';

@Controller('bons-commande')
@UseGuards(JwtAuthGuard, AuthorizationPolicyGuard)
export class BonsCommandeController {
  constructor(private readonly bonsCommandeService: BonsCommandeService) {}

  @Get()
  @RequirePermissions('referentiels:read')
  getAll(@CurrentUser() user: AuthenticatedUser, @Query() query: BonsCommandeQueryDto) {
    return this.bonsCommandeService.getAll(user, query.exerciceId);
  }

  @Get('generer-numero')
  @RequirePermissions('referentiels:read')
  getNextNumero(@CurrentUser() user: AuthenticatedUser, @Query() query: GenererNumeroBonCommandeQueryDto) {
    return this.bonsCommandeService.genererNumero(user, query.exerciceId);
  }

  @Get(':id')
  @RequirePermissions('referentiels:read')
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.bonsCommandeService.getById(user, id);
  }

  @Post()
  @RequirePermissions('referentiels:write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateBonCommandeDto) {
    return this.bonsCommandeService.create(user, body);
  }

  @Patch(':id')
  @RequirePermissions('referentiels:write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: UpdateBonCommandeDto) {
    return this.bonsCommandeService.update(user, id, body);
  }

  @Patch(':id/valider')
  @RequirePermissions('referentiels:write')
  valider(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.bonsCommandeService.valider(user, id);
  }

  @Patch(':id/mettre-en-cours')
  @RequirePermissions('referentiels:write')
  mettreEnCours(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.bonsCommandeService.mettreEnCours(user, id);
  }

  @Patch(':id/receptionner')
  @RequirePermissions('referentiels:write')
  receptionner(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: ReceptionnerBonCommandeDto
  ) {
    return this.bonsCommandeService.receptionner(user, id, body.dateLivraisonReelle);
  }

  @Patch(':id/annuler')
  @RequirePermissions('referentiels:write')
  annuler(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: AnnulerBonCommandeDto) {
    return this.bonsCommandeService.annuler(user, id, body.motif);
  }

  @Delete(':id')
  @RequirePermissions('referentiels:write')
  async delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.bonsCommandeService.delete(user, id);
  }
}
