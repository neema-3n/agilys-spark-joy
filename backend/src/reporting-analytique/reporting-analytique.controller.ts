import { Controller, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AuthorizationPolicyGuard } from '../auth/authorization-policy.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import {
  ReportingAnalytiqueCycleTimeQueryDto,
  ReportingAnalytiqueExportDownloadQueryDto,
  ReportingAnalytiqueExportRequestDto,
  ReportingAnalytiqueExportStatusQueryDto,
  ReportingAnalytiqueQueryDto
} from './dto/reporting-analytique.dto';
import { ReportingAnalytiqueService } from './reporting-analytique.service';

interface HttpDownloadResponse {
  setHeader(name: string, value: string): void;
  send(body: Buffer): void;
}

@Controller('reporting-analytique')
@UseGuards(JwtAuthGuard, AuthorizationPolicyGuard)
export class ReportingAnalytiqueController {
  constructor(private readonly reportingService: ReportingAnalytiqueService) {}

  @Get('tableau-croise')
  @RequirePermissions('referentiels:read')
  getTableauCroise(@CurrentUser() user: AuthenticatedUser, @Query() query: ReportingAnalytiqueQueryDto) {
    return this.reportingService.getTableauCroise(user, query);
  }

  @Get('dashboard')
  @RequirePermissions('referentiels:read')
  getDashboard(@CurrentUser() user: AuthenticatedUser, @Query() query: ReportingAnalytiqueQueryDto) {
    return this.reportingService.getDashboard(user, query);
  }

  @Get('cycle-time')
  @RequirePermissions('referentiels:read')
  getCycleTime(@CurrentUser() user: AuthenticatedUser, @Query() query: ReportingAnalytiqueCycleTimeQueryDto) {
    return this.reportingService.getCycleTimeMetrics(user, query);
  }

  @Post('exports')
  @RequirePermissions('referentiels:read')
  startExport(@CurrentUser() user: AuthenticatedUser, @Query() query: ReportingAnalytiqueExportRequestDto) {
    return this.reportingService.startExport(user, query);
  }

  @Get('exports/status')
  @RequirePermissions('referentiels:read')
  getExportStatus(@CurrentUser() user: AuthenticatedUser, @Query() query: ReportingAnalytiqueExportStatusQueryDto) {
    return this.reportingService.getExportStatus(user, query.exportId);
  }

  @Get('exports/:exportId/download')
  @RequirePermissions('referentiels:read')
  downloadExport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('exportId') exportId: string,
    @Query() query: ReportingAnalytiqueExportDownloadQueryDto,
    @Res() response: HttpDownloadResponse
  ) {
    const file = this.reportingService.downloadExport(user, exportId, query.token);

    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    response.send(file.content);
  }
}
