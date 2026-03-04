import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AuthorizationPolicyGuard } from '../auth/authorization-policy.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { ComptesService } from './comptes.service';
import { CreateCompteDto, ImportComptesCsvDto, UpdateCompteDto } from './dto/comptes.dto';

@Controller('comptes')
@UseGuards(JwtAuthGuard, AuthorizationPolicyGuard)
export class ComptesController {
  constructor(private readonly comptesService: ComptesService) {}

  @Get()
  @RequirePermissions('referentiels:read')
  getAll(@CurrentUser() user: AuthenticatedUser) {
    return this.comptesService.getAll(user);
  }

  @Get(':id')
  @RequirePermissions('referentiels:read')
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.comptesService.getById(user, id);
  }

  @Post()
  @RequirePermissions('referentiels:write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateCompteDto) {
    return this.comptesService.create(user, body);
  }

  @Post('import-csv')
  @RequirePermissions('referentiels:write')
  importCsv(@CurrentUser() user: AuthenticatedUser, @Body() body: ImportComptesCsvDto) {
    return this.comptesService.importFromCsv(user, body);
  }

  @Patch(':id')
  @RequirePermissions('referentiels:write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: UpdateCompteDto) {
    return this.comptesService.update(user, id, body);
  }

  @Delete(':id')
  @RequirePermissions('referentiels:write')
  async delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.comptesService.delete(user, id);
  }

  @Delete()
  @RequirePermissions('referentiels:write')
  deleteAll(@CurrentUser() user: AuthenticatedUser, @Query('all') all?: string) {
    if (all !== 'true') {
      return { deletedCount: 0 };
    }

    return this.comptesService.deleteAll(user).then((deletedCount) => ({ deletedCount }));
  }
}
