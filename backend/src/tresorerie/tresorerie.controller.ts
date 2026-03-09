import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AuthorizationPolicyGuard } from '../auth/authorization-policy.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import {
  CloseoutDossierQueryDto,
  TresorerieAuditDossierQueryDto,
  TresorerieAuditDetailQueryDto,
  TresorerieAuditQueryDto,
  TresorerieQueryDto,
} from './dto/tresorerie.dto';
import { TresorerieService } from './tresorerie.service';

@Controller('tresorerie')
@UseGuards(JwtAuthGuard, AuthorizationPolicyGuard)
export class TresorerieController {
  constructor(private readonly tresorerieService: TresorerieService) {}

  @Get('stats')
  @RequirePermissions('referentiels:read')
  getStats(@CurrentUser() user: AuthenticatedUser, @Query() query: TresorerieQueryDto) {
    return this.tresorerieService.getStats(user, query.exerciceId);
  }

  @Get('flux')
  @RequirePermissions('referentiels:read')
  getFlux(@CurrentUser() user: AuthenticatedUser, @Query() query: TresorerieQueryDto) {
    return this.tresorerieService.getFlux(user, query.exerciceId);
  }

  @Get('previsions')
  @RequirePermissions('referentiels:read')
  getPrevisions(@CurrentUser() user: AuthenticatedUser, @Query() query: TresorerieQueryDto) {
    return this.tresorerieService.getPrevisions(user, query.exerciceId);
  }

  @Get('supervision')
  @RequirePermissions('referentiels:read')
  getSupervision(@CurrentUser() user: AuthenticatedUser, @Query() query: TresorerieQueryDto) {
    return this.tresorerieService.getSupervision(user, query.exerciceId);
  }

  @Get('supervision/alerts')
  @RequirePermissions('referentiels:audit:read')
  getSupervisionAlerts(@CurrentUser() user: AuthenticatedUser, @Query() query: TresorerieAuditQueryDto) {
    return this.tresorerieService.getAlertJournal(user, query);
  }

  @Get('exception-audit')
  @RequirePermissions('referentiels:audit:read')
  getExceptionAudit(@CurrentUser() user: AuthenticatedUser, @Query() query: TresorerieAuditQueryDto) {
    return this.tresorerieService.getExceptionAudit(user, query);
  }

  @Get('exception-audit/detail')
  @RequirePermissions('referentiels:audit:read')
  getExceptionAuditDetail(@CurrentUser() user: AuthenticatedUser, @Query() query: TresorerieAuditDetailQueryDto) {
    return this.tresorerieService.getExceptionAuditDetail(user, query);
  }

  @Get('exception-audit/export-prep')
  @RequirePermissions('referentiels:audit:read')
  getExceptionAuditExportPrep(@CurrentUser() user: AuthenticatedUser, @Query() query: TresorerieAuditQueryDto) {
    return this.tresorerieService.getExceptionAuditExportPrep(user, query);
  }

  @Get('exception-audit/dossier')
  @RequirePermissions('referentiels:audit:read')
  getExceptionAuditDossier(@CurrentUser() user: AuthenticatedUser, @Query() query: TresorerieAuditDossierQueryDto) {
    return this.tresorerieService.getExceptionAuditDossier(user, query);
  }

  @Get('exception-audit/dossier/export-prep')
  @RequirePermissions('referentiels:audit:read')
  getExceptionAuditDossierExportPrep(@CurrentUser() user: AuthenticatedUser, @Query() query: TresorerieAuditDossierQueryDto) {
    return this.tresorerieService.getExceptionAuditDossierExportPrep(user, query);
  }

  @Get('closeout-dossier')
  @RequirePermissions('referentiels:audit:read')
  getCloseoutDossier(@CurrentUser() user: AuthenticatedUser, @Query() query: CloseoutDossierQueryDto) {
    return this.tresorerieService.getCloseoutDossier(user, query);
  }

  @Get('closeout-dossier/export-prep')
  @RequirePermissions('referentiels:audit:read')
  getCloseoutDossierExportPrep(@CurrentUser() user: AuthenticatedUser, @Query() query: CloseoutDossierQueryDto) {
    return this.tresorerieService.getCloseoutDossierExportPrep(user, query);
  }
}
