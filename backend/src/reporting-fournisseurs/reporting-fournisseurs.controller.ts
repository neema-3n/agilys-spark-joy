import { Controller, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AuthorizationPolicyGuard } from '../auth/authorization-policy.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import {
  ReportingFournisseursExportDownloadQueryDto,
  ReportingFournisseursExportRequestDto,
  ReportingFournisseursExportStatusQueryDto,
  ReportingFournisseursQueryDto
} from './dto/reporting-fournisseurs.dto';
import { ReportingFournisseursService } from './reporting-fournisseurs.service';

interface HttpDownloadResponse {
  setHeader(name: string, value: string): void;
  send(body: Buffer): void;
}

@Controller('reporting-fournisseurs')
@UseGuards(JwtAuthGuard, AuthorizationPolicyGuard)
export class ReportingFournisseursController {
  constructor(private readonly reportingService: ReportingFournisseursService) {}

  @Get('etat-dettes-fournisseurs')
  @RequirePermissions('referentiels:read')
  getEtatDettesFournisseurs(@CurrentUser() user: AuthenticatedUser, @Query() query: ReportingFournisseursQueryDto) {
    return this.reportingService.getEtatDettesFournisseurs(user, query);
  }

  @Get('etat-avances-regularisations')
  @RequirePermissions('referentiels:read')
  getEtatAvancesRegularisations(@CurrentUser() user: AuthenticatedUser, @Query() query: ReportingFournisseursQueryDto) {
    return this.reportingService.getEtatAvancesRegularisations(user, query);
  }

  @Post('exports')
  @RequirePermissions('referentiels:read')
  startExport(@CurrentUser() user: AuthenticatedUser, @Query() query: ReportingFournisseursExportRequestDto) {
    return this.reportingService.startExport(user, query);
  }

  @Get('exports/status')
  @RequirePermissions('referentiels:read')
  getExportStatus(@CurrentUser() user: AuthenticatedUser, @Query() query: ReportingFournisseursExportStatusQueryDto) {
    return this.reportingService.getExportStatus(user, query.exportId);
  }

  @Get('exports/:exportId/download')
  @RequirePermissions('referentiels:read')
  downloadExport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('exportId') exportId: string,
    @Query() query: ReportingFournisseursExportDownloadQueryDto,
    @Res() response: HttpDownloadResponse
  ) {
    const file = this.reportingService.downloadExport(user, exportId, query.token);

    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    response.send(file.content);
  }
}
