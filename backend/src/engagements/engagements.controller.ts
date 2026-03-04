import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AuthorizationPolicyGuard } from '../auth/authorization-policy.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import {
  AnnulerEngagementDto,
  CreateEngagementDto,
  CreateEngagementFromReservationDto,
  EngagementsQueryDto,
  UpdateEngagementDto
} from './dto/engagements.dto';
import { EngagementsService } from './engagements.service';

@Controller('engagements')
@UseGuards(JwtAuthGuard, AuthorizationPolicyGuard)
export class EngagementsController {
  constructor(private readonly engagementsService: EngagementsService) {}

  @Get()
  @RequirePermissions('referentiels:read')
  getAll(@CurrentUser() user: AuthenticatedUser, @Query() query: EngagementsQueryDto) {
    return this.engagementsService.getAll(user, query.exerciceId);
  }

  @Get('reservation/:reservationId/montant-disponible')
  @RequirePermissions('referentiels:read')
  getMontantDisponibleReservation(@CurrentUser() user: AuthenticatedUser, @Param('reservationId') reservationId: string) {
    return this.engagementsService.getMontantDisponibleReservation(user, reservationId).then((montantDisponible) => ({
      montantDisponible
    }));
  }

  @Post('from-reservation')
  @RequirePermissions('referentiels:write')
  createFromReservation(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateEngagementFromReservationDto) {
    return this.engagementsService.createFromReservation(user, body);
  }

  @Get(':id')
  @RequirePermissions('referentiels:read')
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.engagementsService.getById(user, id);
  }

  @Post()
  @RequirePermissions('referentiels:write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateEngagementDto) {
    return this.engagementsService.create(user, body);
  }

  @Patch(':id')
  @RequirePermissions('referentiels:write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: UpdateEngagementDto) {
    return this.engagementsService.update(user, id, body);
  }

  @Patch(':id/valider')
  @RequirePermissions('referentiels:write')
  valider(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.engagementsService.valider(user, id);
  }

  @Patch(':id/annuler')
  @RequirePermissions('referentiels:write')
  annuler(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: AnnulerEngagementDto) {
    return this.engagementsService.annuler(user, id, body.motifAnnulation);
  }

  @Delete(':id')
  @RequirePermissions('referentiels:write')
  async delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.engagementsService.delete(user, id);
  }
}
