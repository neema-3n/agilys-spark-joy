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
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
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

const WRITE_ROLES = ['super_admin', 'admin_client', 'directeur_financier'];

@Controller('budget-referentiels')
@UseGuards(JwtAuthGuard, RolesGuard, TenantExerciceScopeGuard)
export class BudgetReferentielsController {
  constructor(private readonly service: BudgetReferentielsService) {}

  @Get('exercices')
  getExercices(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getExercices(user);
  }

  @Post('exercices')
  @Roles(...WRITE_ROLES)
  createExercice(@CurrentUser() user: AuthenticatedUser, @Body() body: ExerciceCreateDto) {
    return this.service.createExercice(user, body);
  }

  @Patch('exercices/:id')
  @Roles(...WRITE_ROLES)
  updateExercice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: ExerciceUpdateDto
  ) {
    return this.service.updateExercice(user, id, body);
  }

  @Delete('exercices/:id')
  @Roles(...WRITE_ROLES)
  archiveExercice(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.archiveExercice(user, id);
  }

  @Get('enveloppes')
  getEnveloppes(@CurrentUser() user: AuthenticatedUser, @Query() query: ExerciceScopedQueryDto) {
    return this.service.getEnveloppes(user, query.exerciceId);
  }

  @Post('enveloppes')
  @Roles(...WRITE_ROLES)
  createEnveloppe(@CurrentUser() user: AuthenticatedUser, @Body() body: EnveloppeCreateDto) {
    return this.service.createEnveloppe(user, body);
  }

  @Patch('enveloppes/:id')
  @Roles(...WRITE_ROLES)
  updateEnveloppe(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: EnveloppeUpdateDto
  ) {
    return this.service.updateEnveloppe(user, id, body);
  }

  @Delete('enveloppes/:id')
  @Roles(...WRITE_ROLES)
  archiveEnveloppe(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.archiveEnveloppe(user, id);
  }

  @Get('sections')
  getSections(@CurrentUser() user: AuthenticatedUser, @Query() query: ExerciceScopedQueryDto) {
    return this.service.getSections(user, query.exerciceId);
  }

  @Post('sections')
  @Roles(...WRITE_ROLES)
  createSection(@CurrentUser() user: AuthenticatedUser, @Body() body: SectionCreateDto) {
    return this.service.createSection(user, body);
  }

  @Patch('sections/:id')
  @Roles(...WRITE_ROLES)
  updateSection(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: SectionUpdateDto) {
    return this.service.updateSection(user, id, body);
  }

  @Delete('sections/:id')
  @Roles(...WRITE_ROLES)
  archiveSection(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.archiveSection(user, id);
  }

  @Get('programmes')
  getProgrammes(@CurrentUser() user: AuthenticatedUser, @Query() query: ExerciceScopedQueryDto) {
    return this.service.getProgrammes(user, query.exerciceId);
  }

  @Post('programmes')
  @Roles(...WRITE_ROLES)
  createProgramme(@CurrentUser() user: AuthenticatedUser, @Body() body: ProgrammeCreateDto) {
    return this.service.createProgramme(user, body);
  }

  @Patch('programmes/:id')
  @Roles(...WRITE_ROLES)
  updateProgramme(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: ProgrammeUpdateDto
  ) {
    return this.service.updateProgramme(user, id, body);
  }

  @Delete('programmes/:id')
  @Roles(...WRITE_ROLES)
  archiveProgramme(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.archiveProgramme(user, id);
  }

  @Get('actions')
  getActions(@CurrentUser() user: AuthenticatedUser, @Query() query: ExerciceScopedQueryDto) {
    return this.service.getActions(user, query.exerciceId);
  }

  @Post('actions')
  @Roles(...WRITE_ROLES)
  createAction(@CurrentUser() user: AuthenticatedUser, @Body() body: ActionCreateDto) {
    return this.service.createAction(user, body);
  }

  @Patch('actions/:id')
  @Roles(...WRITE_ROLES)
  updateAction(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: ActionUpdateDto) {
    return this.service.updateAction(user, id, body);
  }

  @Delete('actions/:id')
  @Roles(...WRITE_ROLES)
  archiveAction(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.archiveAction(user, id);
  }

  @Get('audit-log')
  @Roles(...WRITE_ROLES)
  getAuditLog(@CurrentUser() user: AuthenticatedUser, @Query() query: AuditQueryDto) {
    return this.service.getAuditLog(user, query.entityType, query.entityId);
  }
}
