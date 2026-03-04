import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AuthorizationPolicyGuard } from '../auth/authorization-policy.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import {
  CreateRegleComptableDto,
  ReglesComptablesQueryDto,
  ReorderReglesComptablesDto,
  UpdateRegleComptableDto
} from './dto/regles-comptables.dto';
import { ReglesComptablesService } from './regles-comptables.service';

@Controller('regles-comptables')
@UseGuards(JwtAuthGuard, AuthorizationPolicyGuard)
export class ReglesComptablesController {
  constructor(private readonly reglesService: ReglesComptablesService) {}

  @Get()
  @RequirePermissions('referentiels:read')
  getAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ReglesComptablesQueryDto) {
    return this.reglesService.getAll(user, query.typeOperation);
  }

  @Get(':id')
  @RequirePermissions('referentiels:read')
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.reglesService.getById(user, id);
  }

  @Post()
  @RequirePermissions('referentiels:write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateRegleComptableDto) {
    return this.reglesService.create(user, body);
  }

  @Patch(':id')
  @RequirePermissions('referentiels:write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: UpdateRegleComptableDto) {
    return this.reglesService.update(user, id, body);
  }

  @Delete(':id')
  @RequirePermissions('referentiels:write')
  async delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.reglesService.delete(user, id);
  }

  @Post('reorder')
  @RequirePermissions('referentiels:write')
  async reorder(@CurrentUser() user: AuthenticatedUser, @Body() body: ReorderReglesComptablesDto): Promise<void> {
    await this.reglesService.reorder(user, body.typeOperation, body.orderedIds);
  }
}
