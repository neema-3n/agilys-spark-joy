import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AuthorizationPolicyGuard } from '../auth/authorization-policy.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import {
  AnnulerPaiementDto,
  CreatePaiementDto,
  PaiementsQueryDto,
  RejeterPaiementDto,
  ReprendrePaiementDto,
} from './dto/paiements.dto';
import { PaiementsService } from './paiements.service';

@Controller('paiements')
@UseGuards(JwtAuthGuard, AuthorizationPolicyGuard)
export class PaiementsController {
  constructor(private readonly paiementsService: PaiementsService) {}

  @Get()
  @RequirePermissions('referentiels:read')
  getAll(@CurrentUser() user: AuthenticatedUser, @Query() query: PaiementsQueryDto) {
    return this.paiementsService.getAll(user, query.exerciceId);
  }

  @Get('depense/:depenseId')
  @RequirePermissions('referentiels:read')
  getByDepense(@CurrentUser() user: AuthenticatedUser, @Param('depenseId') depenseId: string) {
    return this.paiementsService.getByDepense(user, depenseId);
  }

  @Get(':id')
  @RequirePermissions('referentiels:read')
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.paiementsService.getById(user, id);
  }

  @Post()
  @RequirePermissions('referentiels:write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreatePaiementDto) {
    return this.paiementsService.create(user, body);
  }

  @Patch(':id/accepter')
  @RequirePermissions('referentiels:write')
  accepter(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.paiementsService.accepter(user, id);
  }

  @Patch(':id/executer')
  @RequirePermissions('referentiels:write')
  executer(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.paiementsService.executer(user, id);
  }

  @Patch(':id/reconcilier')
  @RequirePermissions('referentiels:write')
  reconcilier(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.paiementsService.reconcilier(user, id);
  }

  @Patch(':id/rejeter')
  @RequirePermissions('referentiels:write')
  rejeter(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: RejeterPaiementDto) {
    return this.paiementsService.rejeter(user, id, body);
  }

  @Patch(':id/annuler')
  @RequirePermissions('referentiels:write')
  annuler(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: AnnulerPaiementDto) {
    return this.paiementsService.annuler(user, id, body);
  }

  @Post(':id/reprendre')
  @RequirePermissions('referentiels:write')
  reprendre(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: ReprendrePaiementDto) {
    return this.paiementsService.reprendre(user, id, body);
  }

  @Delete(':id')
  @RequirePermissions('referentiels:write')
  async delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.paiementsService.delete(user, id);
  }
}
