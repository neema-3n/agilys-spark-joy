import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AuthorizationPolicyGuard } from '../auth/authorization-policy.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CreateFournisseurDto, FournisseursQueryDto, UpdateFournisseurDto } from './dto/fournisseurs.dto';
import { FournisseursService } from './fournisseurs.service';

@Controller('fournisseurs')
@UseGuards(JwtAuthGuard, AuthorizationPolicyGuard)
export class FournisseursController {
  constructor(private readonly fournisseursService: FournisseursService) {}

  @Get()
  @RequirePermissions('referentiels:read')
  getAll(@CurrentUser() user: AuthenticatedUser, @Query() query: FournisseursQueryDto) {
    return this.fournisseursService.getAll(user, query.statut);
  }

  @Get(':id')
  @RequirePermissions('referentiels:read')
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.fournisseursService.getById(user, id);
  }

  @Post()
  @RequirePermissions('referentiels:write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateFournisseurDto) {
    return this.fournisseursService.create(user, body);
  }

  @Patch(':id')
  @RequirePermissions('referentiels:write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: UpdateFournisseurDto) {
    return this.fournisseursService.update(user, id, body);
  }

  @Delete(':id')
  @RequirePermissions('referentiels:write')
  async delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.fournisseursService.delete(user, id);
  }
}
