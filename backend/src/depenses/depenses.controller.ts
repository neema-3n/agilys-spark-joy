import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AuthorizationPolicyGuard } from '../auth/authorization-policy.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import {
  AnnulerDepenseDto,
  CreateDepenseDto,
  CreateDepenseFromEngagementDto,
  CreateDepenseFromFactureDto,
  CreateDepenseFromReservationDto,
  DepensesQueryDto,
  MarquerPayeeDto,
  PaiementsValidesMultipleDepensesDto,
  UpdateDepenseDto
} from './dto/depenses.dto';
import { DepensesService } from './depenses.service';

@Controller('depenses')
@UseGuards(JwtAuthGuard, AuthorizationPolicyGuard)
export class DepensesController {
  constructor(private readonly depensesService: DepensesService) {}

  @Get()
  @RequirePermissions('referentiels:read')
  getAll(@CurrentUser() user: AuthenticatedUser, @Query() query: DepensesQueryDto) {
    return this.depensesService.getAll(user, query.exerciceId);
  }

  @Post('from-facture')
  @RequirePermissions('referentiels:write')
  createFromFacture(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateDepenseFromFactureDto) {
    return this.depensesService.createFromFacture(user, body);
  }

  @Post('from-engagement')
  @RequirePermissions('referentiels:write')
  createFromEngagement(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateDepenseFromEngagementDto) {
    return this.depensesService.createFromEngagement(user, body);
  }

  @Post('from-reservation')
  @RequirePermissions('referentiels:write')
  createFromReservation(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateDepenseFromReservationDto) {
    return this.depensesService.createFromReservation(user, body);
  }

  @Post('paiements-valides-multiple')
  @RequirePermissions('referentiels:read')
  getPaiementsValidesMultiple(@CurrentUser() user: AuthenticatedUser, @Body() body: PaiementsValidesMultipleDepensesDto) {
    return this.depensesService.getPaiementsValidesMultiple(user, body.depenseIds);
  }

  @Get(':id/paiements-valides')
  @RequirePermissions('referentiels:read')
  getPaiementsValides(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.depensesService.getPaiementsValides(user, id);
  }

  @Get(':id')
  @RequirePermissions('referentiels:read')
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.depensesService.getById(user, id);
  }

  @Post()
  @RequirePermissions('referentiels:write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateDepenseDto) {
    return this.depensesService.create(user, body);
  }

  @Patch(':id')
  @RequirePermissions('referentiels:write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: UpdateDepenseDto) {
    return this.depensesService.update(user, id, body);
  }

  @Patch(':id/valider')
  @RequirePermissions('referentiels:write')
  valider(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.depensesService.valider(user, id);
  }

  @Patch(':id/ordonnancer')
  @RequirePermissions('referentiels:write')
  ordonnancer(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.depensesService.ordonnancer(user, id);
  }

  @Patch(':id/marquer-payee')
  @RequirePermissions('referentiels:write')
  marquerPayee(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: MarquerPayeeDto) {
    return this.depensesService.marquerPayee(user, id, body);
  }

  @Patch(':id/annuler')
  @RequirePermissions('referentiels:write')
  annuler(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: AnnulerDepenseDto) {
    return this.depensesService.annuler(user, id, body.motif);
  }

  @Delete(':id')
  @RequirePermissions('referentiels:write')
  async delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.depensesService.delete(user, id);
  }
}
