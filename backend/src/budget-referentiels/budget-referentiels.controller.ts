import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards
} from '@nestjs/common';
import { AuthorizationPolicyGuard } from '../auth/authorization-policy.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { TenantExerciceScopeGuard } from '../auth/tenant-exercice-scope.guard';
import { BudgetReferentielsService } from './budget-referentiels.service';
import {
  ActionCreateDto,
  ActionUpdateDto,
  AuditQueryDto,
  EnveloppeCreateDto,
  EnveloppeUpdateDto,
  ExerciceCreateDto,
  ExerciceScopedQueryDto,
  ExerciceUpdateDto,
  ProgrammeCreateDto,
  ProgrammeUpdateDto,
  SectionCreateDto,
  SectionUpdateDto
} from './dto/referentiels.dto';

@Controller('budget-referentiels')
@UseGuards(JwtAuthGuard, AuthorizationPolicyGuard, TenantExerciceScopeGuard)
export class BudgetReferentielsController {
  constructor(private readonly service: BudgetReferentielsService) {}

  @Get('exercices')
  @RequirePermissions('referentiels:read')
  getExercices(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getExercices(user);
  }

  @Post('exercices')
  @RequirePermissions('referentiels:write')
  createExercice(@CurrentUser() user: AuthenticatedUser, @Body() body: ExerciceCreateDto) {
    return this.service.createExercice(user, body);
  }

  @Patch('exercices/:id')
  @RequirePermissions('referentiels:write')
  updateExercice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: ExerciceUpdateDto
  ) {
    return this.service.updateExercice(user, id, body);
  }

  @Delete('exercices/:id')
  @RequirePermissions('referentiels:write')
  archiveExercice(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.archiveExercice(user, id);
  }

  @Get('enveloppes')
  @RequirePermissions('referentiels:read')
  getEnveloppes(@CurrentUser() user: AuthenticatedUser, @Query() query: ExerciceScopedQueryDto) {
    return this.service.getEnveloppes(user, query.exerciceId);
  }

  @Post('enveloppes')
  @RequirePermissions('referentiels:write')
  createEnveloppe(@CurrentUser() user: AuthenticatedUser, @Body() body: EnveloppeCreateDto) {
    return this.service.createEnveloppe(user, body);
  }

  @Patch('enveloppes/:id')
  @RequirePermissions('referentiels:write')
  updateEnveloppe(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: EnveloppeUpdateDto,
    @Query() query: ExerciceScopedQueryDto
  ) {
    return this.service.updateEnveloppe(user, id, body, query.exerciceId);
  }

  @Delete('enveloppes/:id')
  @RequirePermissions('referentiels:write')
  archiveEnveloppe(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: ExerciceScopedQueryDto
  ) {
    return this.service.archiveEnveloppe(user, id, query.exerciceId);
  }

  @Get('sections')
  @RequirePermissions('referentiels:read')
  getSections(@CurrentUser() user: AuthenticatedUser, @Query() query: ExerciceScopedQueryDto) {
    return this.service.getSections(user, query.exerciceId);
  }

  @Post('sections')
  @RequirePermissions('referentiels:write')
  createSection(@CurrentUser() user: AuthenticatedUser, @Body() body: SectionCreateDto) {
    return this.service.createSection(user, body);
  }

  @Patch('sections/:id')
  @RequirePermissions('referentiels:write')
  updateSection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: SectionUpdateDto,
    @Query() query: ExerciceScopedQueryDto
  ) {
    return this.service.updateSection(user, id, body, query.exerciceId);
  }

  @Delete('sections/:id')
  @RequirePermissions('referentiels:write')
  archiveSection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: ExerciceScopedQueryDto
  ) {
    return this.service.archiveSection(user, id, query.exerciceId);
  }

  @Get('programmes')
  @RequirePermissions('referentiels:read')
  getProgrammes(@CurrentUser() user: AuthenticatedUser, @Query() query: ExerciceScopedQueryDto) {
    return this.service.getProgrammes(user, query.exerciceId);
  }

  @Post('programmes')
  @RequirePermissions('referentiels:write')
  createProgramme(@CurrentUser() user: AuthenticatedUser, @Body() body: ProgrammeCreateDto) {
    return this.service.createProgramme(user, body);
  }

  @Patch('programmes/:id')
  @RequirePermissions('referentiels:write')
  updateProgramme(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: ProgrammeUpdateDto,
    @Query() query: ExerciceScopedQueryDto
  ) {
    return this.service.updateProgramme(user, id, body, query.exerciceId);
  }

  @Delete('programmes/:id')
  @RequirePermissions('referentiels:write')
  archiveProgramme(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: ExerciceScopedQueryDto
  ) {
    return this.service.archiveProgramme(user, id, query.exerciceId);
  }

  @Get('actions')
  @RequirePermissions('referentiels:read')
  getActions(@CurrentUser() user: AuthenticatedUser, @Query() query: ExerciceScopedQueryDto) {
    return this.service.getActions(user, query.exerciceId);
  }

  @Post('actions')
  @RequirePermissions('referentiels:write')
  createAction(@CurrentUser() user: AuthenticatedUser, @Body() body: ActionCreateDto) {
    return this.service.createAction(user, body);
  }

  @Patch('actions/:id')
  @RequirePermissions('referentiels:write')
  updateAction(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: ActionUpdateDto,
    @Query() query: ExerciceScopedQueryDto
  ) {
    return this.service.updateAction(user, id, body, query.exerciceId);
  }

  @Delete('actions/:id')
  @RequirePermissions('referentiels:write')
  archiveAction(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Query() query: ExerciceScopedQueryDto) {
    return this.service.archiveAction(user, id, query.exerciceId);
  }

  @Get('audit-log')
  @RequirePermissions('referentiels:audit:read')
  getAuditLog(@CurrentUser() user: AuthenticatedUser, @Query() query: AuditQueryDto) {
    return this.service.getAuditLog(user, query.entityType, query.entityId);
  }
}
