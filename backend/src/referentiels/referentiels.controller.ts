import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AuthorizationPolicyGuard } from '../auth/authorization-policy.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import {
  CreateReferentielDto,
  ReferentielsQueryDto,
  ReorderReferentielsDto,
  UpdateReferentielDto
} from './dto/referentiels.dto';
import { ReferentielsService } from './referentiels.service';

@Controller('referentiels')
@UseGuards(JwtAuthGuard, AuthorizationPolicyGuard)
export class ReferentielsController {
  constructor(private readonly referentielsService: ReferentielsService) {}

  @Get()
  @RequirePermissions('referentiels:read')
  getAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ReferentielsQueryDto) {
    return this.referentielsService.getAllByCategorie(user, query.categorie, query.actifOnly !== 'false');
  }

  @Get(':id')
  @RequirePermissions('referentiels:read')
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.referentielsService.getById(user, id);
  }

  @Post()
  @RequirePermissions('referentiels:write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateReferentielDto) {
    return this.referentielsService.create(user, body);
  }

  @Patch(':id')
  @RequirePermissions('referentiels:write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: UpdateReferentielDto) {
    return this.referentielsService.update(user, id, body);
  }

  @Delete(':id')
  @RequirePermissions('referentiels:write')
  async delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.referentielsService.delete(user, id);
  }

  @Post('reorder')
  @RequirePermissions('referentiels:write')
  async reorder(@CurrentUser() user: AuthenticatedUser, @Body() body: ReorderReferentielsDto): Promise<void> {
    await this.referentielsService.reorder(user, body.categorie, body.orderedIds);
  }
}
