import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AuthorizationPolicyGuard } from '../auth/authorization-policy.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CreateStructureDto, StructuresQueryDto, UpdateStructureDto } from './dto/structures.dto';
import { StructuresService } from './structures.service';

@Controller('structures')
@UseGuards(JwtAuthGuard, AuthorizationPolicyGuard)
export class StructuresController {
  constructor(private readonly structuresService: StructuresService) {}

  @Get()
  @RequirePermissions('referentiels:read')
  getAll(@CurrentUser() user: AuthenticatedUser, @Query() query: StructuresQueryDto) {
    return this.structuresService.getAll(user, query.exerciceId);
  }

  @Get(':id')
  @RequirePermissions('referentiels:read')
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.structuresService.getById(user, id);
  }

  @Post()
  @RequirePermissions('referentiels:write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateStructureDto) {
    return this.structuresService.create(user, body);
  }

  @Patch(':id')
  @RequirePermissions('referentiels:write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: UpdateStructureDto) {
    return this.structuresService.update(user, id, body);
  }

  @Delete(':id')
  @RequirePermissions('referentiels:write')
  async delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.structuresService.delete(user, id);
  }
}
