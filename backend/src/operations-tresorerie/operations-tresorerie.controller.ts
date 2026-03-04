import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AuthorizationPolicyGuard } from '../auth/authorization-policy.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import {
  CreateOperationTresorerieDto,
  OperationsTresorerieQueryDto,
  RapprocherOperationsDto
} from './dto/operations-tresorerie.dto';
import { OperationsTresorerieService } from './operations-tresorerie.service';

@Controller('operations-tresorerie')
@UseGuards(JwtAuthGuard, AuthorizationPolicyGuard)
export class OperationsTresorerieController {
  constructor(private readonly operationsTresorerieService: OperationsTresorerieService) {}

  @Get()
  @RequirePermissions('referentiels:read')
  getAll(@CurrentUser() user: AuthenticatedUser, @Query() query: OperationsTresorerieQueryDto) {
    return this.operationsTresorerieService.getAll(user, query.exerciceId);
  }

  @Get('stats')
  @RequirePermissions('referentiels:read')
  getStats(@CurrentUser() user: AuthenticatedUser, @Query() query: OperationsTresorerieQueryDto) {
    return this.operationsTresorerieService.getStats(user, query.exerciceId);
  }

  @Get('compte/:compteId')
  @RequirePermissions('referentiels:read')
  getByCompte(@CurrentUser() user: AuthenticatedUser, @Param('compteId') compteId: string) {
    return this.operationsTresorerieService.getByCompte(user, compteId);
  }

  @Get(':id')
  @RequirePermissions('referentiels:read')
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.operationsTresorerieService.getById(user, id);
  }

  @Post()
  @RequirePermissions('referentiels:write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateOperationTresorerieDto) {
    return this.operationsTresorerieService.create(user, body);
  }

  @Patch('rapprocher')
  @RequirePermissions('referentiels:write')
  async rapprocher(@CurrentUser() user: AuthenticatedUser, @Body() body: RapprocherOperationsDto): Promise<void> {
    await this.operationsTresorerieService.rapprocher(user, body.operationIds);
  }
}
