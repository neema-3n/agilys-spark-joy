import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AuthorizationPolicyGuard } from '../auth/authorization-policy.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { AnnulerReservationDto, CreateReservationDto, ReservationsQueryDto, UpdateReservationDto } from './dto/reservations.dto';
import { ReservationsService } from './reservations.service';

@Controller('reservations')
@UseGuards(JwtAuthGuard, AuthorizationPolicyGuard)
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Get()
  @RequirePermissions('referentiels:read')
  getAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ReservationsQueryDto) {
    return this.reservationsService.getAll(user, query.exerciceId);
  }

  @Get(':id')
  @RequirePermissions('referentiels:read')
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.reservationsService.getById(user, id);
  }

  @Post()
  @RequirePermissions('referentiels:write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateReservationDto) {
    return this.reservationsService.create(user, body);
  }

  @Patch(':id')
  @RequirePermissions('referentiels:write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: UpdateReservationDto) {
    return this.reservationsService.update(user, id, body);
  }

  @Patch(':id/utiliser')
  @RequirePermissions('referentiels:write')
  utiliser(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.reservationsService.utiliser(user, id);
  }

  @Patch(':id/annuler')
  @RequirePermissions('referentiels:write')
  annuler(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: AnnulerReservationDto) {
    return this.reservationsService.annuler(user, id, body.motifAnnulation);
  }

  @Delete(':id')
  @RequirePermissions('referentiels:write')
  async delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.reservationsService.delete(user, id);
  }
}
