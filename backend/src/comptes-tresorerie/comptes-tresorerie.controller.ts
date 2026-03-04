import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AuthorizationPolicyGuard } from '../auth/authorization-policy.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { ComptesTresorerieService } from './comptes-tresorerie.service';
import { CreateCompteTresorerieDto, UpdateCompteTresorerieDto } from './dto/comptes-tresorerie.dto';

@Controller('comptes-tresorerie')
@UseGuards(JwtAuthGuard, AuthorizationPolicyGuard)
export class ComptesTresorerieController {
  constructor(private readonly comptesTresorerieService: ComptesTresorerieService) {}

  @Get()
  @RequirePermissions('referentiels:read')
  getAll(@CurrentUser() user: AuthenticatedUser) {
    return this.comptesTresorerieService.getAll(user);
  }

  @Get('actifs')
  @RequirePermissions('referentiels:read')
  getActifs(@CurrentUser() user: AuthenticatedUser) {
    return this.comptesTresorerieService.getActifs(user);
  }

  @Get(':id')
  @RequirePermissions('referentiels:read')
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.comptesTresorerieService.getById(user, id);
  }

  @Post()
  @RequirePermissions('referentiels:write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateCompteTresorerieDto) {
    return this.comptesTresorerieService.create(user, body);
  }

  @Patch(':id')
  @RequirePermissions('referentiels:write')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: UpdateCompteTresorerieDto
  ): Promise<void> {
    await this.comptesTresorerieService.update(user, id, body);
  }

  @Delete(':id')
  @RequirePermissions('referentiels:write')
  async delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.comptesTresorerieService.delete(user, id);
  }
}
