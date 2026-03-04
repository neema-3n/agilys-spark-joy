import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AuthorizationPolicyGuard } from '../auth/authorization-policy.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CreateRapprochementBancaireDto, RapprochementsBancairesQueryDto } from './dto/rapprochements-bancaires.dto';
import { RapprochementsBancairesService } from './rapprochements-bancaires.service';

@Controller('rapprochements-bancaires')
@UseGuards(JwtAuthGuard, AuthorizationPolicyGuard)
export class RapprochementsBancairesController {
  constructor(private readonly rapprochementsService: RapprochementsBancairesService) {}

  @Get()
  @RequirePermissions('referentiels:read')
  getAll(@CurrentUser() user: AuthenticatedUser, @Query() query: RapprochementsBancairesQueryDto) {
    return this.rapprochementsService.getAll(user, query.exerciceId);
  }

  @Get(':id')
  @RequirePermissions('referentiels:read')
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.rapprochementsService.getById(user, id);
  }

  @Post()
  @RequirePermissions('referentiels:write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateRapprochementBancaireDto) {
    return this.rapprochementsService.create(user, body);
  }

  @Patch(':id/valider')
  @RequirePermissions('referentiels:write')
  async valider(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.rapprochementsService.valider(user, id);
  }
}
