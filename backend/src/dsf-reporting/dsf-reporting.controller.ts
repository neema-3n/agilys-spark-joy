import { Controller, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AuthorizationPolicyGuard } from '../auth/authorization-policy.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import {
  DsfReportingExportDownloadQueryDto,
  DsfReportingExportRequestDto,
  DsfReportingExportStatusQueryDto,
  DsfReportingValidationRequestDto
} from './dto/dsf-reporting.dto';
import { DsfReportingService } from './dsf-reporting.service';

interface HttpDownloadResponse {
  setHeader(name: string, value: string): void;
  send(body: Buffer): void;
}

@Controller('dsf-reporting')
@UseGuards(JwtAuthGuard, AuthorizationPolicyGuard)
export class DsfReportingController {
  constructor(private readonly dsfReportingService: DsfReportingService) {}

  @Post('validate')
  @RequirePermissions('referentiels:read')
  validate(@CurrentUser() user: AuthenticatedUser, @Query() query: DsfReportingValidationRequestDto) {
    return this.dsfReportingService.validate(user, query);
  }

  @Post('exports')
  @RequirePermissions('referentiels:read')
  startExport(@CurrentUser() user: AuthenticatedUser, @Query() query: DsfReportingExportRequestDto) {
    return this.dsfReportingService.startExport(user, query);
  }

  @Get('exports/status')
  @RequirePermissions('referentiels:read')
  getExportStatus(@CurrentUser() user: AuthenticatedUser, @Query() query: DsfReportingExportStatusQueryDto) {
    return this.dsfReportingService.getExportStatus(user, query.exportId);
  }

  @Get('exports/:exportId/download')
  @RequirePermissions('referentiels:read')
  downloadExport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('exportId') exportId: string,
    @Query() query: DsfReportingExportDownloadQueryDto,
    @Res() response: HttpDownloadResponse
  ) {
    const file = this.dsfReportingService.downloadExport(user, exportId, query.token);

    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    response.send(file.content);
  }
}
