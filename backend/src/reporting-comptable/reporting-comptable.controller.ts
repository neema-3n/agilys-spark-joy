import { Controller, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AuthorizationPolicyGuard } from '../auth/authorization-policy.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import {
  ReportingComptableExportDownloadQueryDto,
  ReportingComptableExportRequestDto,
  ReportingComptableExportStatusQueryDto,
  ReportingComptableQueryDto
} from './dto/reporting-comptable.dto';
import { ReportingComptableService } from './reporting-comptable.service';

interface HttpDownloadResponse {
  setHeader(name: string, value: string): void;
  send(body: Buffer): void;
}

@Controller('reporting-comptable')
@UseGuards(JwtAuthGuard, AuthorizationPolicyGuard)
export class ReportingComptableController {
  constructor(private readonly reportingService: ReportingComptableService) {}

  @Get()
  @RequirePermissions('referentiels:read')
  getReport(@CurrentUser() user: AuthenticatedUser, @Query() query: ReportingComptableQueryDto) {
    return this.reportingService.getReport(user, query);
  }

  @Post('exports')
  @RequirePermissions('referentiels:read')
  startExport(@CurrentUser() user: AuthenticatedUser, @Query() query: ReportingComptableExportRequestDto) {
    return this.reportingService.startExport(user, query);
  }

  @Get('exports/status')
  @RequirePermissions('referentiels:read')
  getExportStatus(@CurrentUser() user: AuthenticatedUser, @Query() query: ReportingComptableExportStatusQueryDto) {
    return this.reportingService.getExportStatus(user, query.exportId);
  }

  @Get('exports/:exportId/download')
  @RequirePermissions('referentiels:read')
  downloadExport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('exportId') exportId: string,
    @Query() query: ReportingComptableExportDownloadQueryDto,
    @Res() response: HttpDownloadResponse
  ) {
    const file = this.reportingService.downloadExport(user, exportId, query.token);

    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    response.send(file.content);
  }
}
