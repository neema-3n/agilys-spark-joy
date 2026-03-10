import { Controller, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AuthorizationPolicyGuard } from '../auth/authorization-policy.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import {
  ReportingExecutionTresorerieExportDownloadQueryDto,
  ReportingExecutionTresorerieExportRequestDto,
  ReportingExecutionTresorerieExportStatusQueryDto,
  ReportingExecutionTresorerieQueryDto
} from './dto/reporting-execution-tresorerie.dto';
import { ReportingExecutionTresorerieService } from './reporting-execution-tresorerie.service';

interface HttpDownloadResponse {
  setHeader(name: string, value: string): void;
  send(body: Buffer): void;
}

@Controller('reporting-execution-tresorerie')
@UseGuards(JwtAuthGuard, AuthorizationPolicyGuard)
export class ReportingExecutionTresorerieController {
  constructor(private readonly reportingService: ReportingExecutionTresorerieService) {}

  @Get('execution-budgetaire')
  @RequirePermissions('referentiels:read')
  getExecutionBudgetaire(@CurrentUser() user: AuthenticatedUser, @Query() query: ReportingExecutionTresorerieQueryDto) {
    return this.reportingService.getExecutionBudgetaire(user, query);
  }

  @Get('tresorerie')
  @RequirePermissions('referentiels:read')
  getTresorerie(@CurrentUser() user: AuthenticatedUser, @Query() query: ReportingExecutionTresorerieQueryDto) {
    return this.reportingService.getTresorerie(user, query);
  }

  @Post('exports')
  @RequirePermissions('referentiels:read')
  startExport(@CurrentUser() user: AuthenticatedUser, @Query() query: ReportingExecutionTresorerieExportRequestDto) {
    return this.reportingService.startExport(user, query);
  }

  @Get('exports/status')
  @RequirePermissions('referentiels:read')
  getExportStatus(@CurrentUser() user: AuthenticatedUser, @Query() query: ReportingExecutionTresorerieExportStatusQueryDto) {
    return this.reportingService.getExportStatus(user, query.exportId);
  }

  @Get('exports/:exportId/download')
  @RequirePermissions('referentiels:read')
  downloadExport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('exportId') exportId: string,
    @Query() query: ReportingExecutionTresorerieExportDownloadQueryDto,
    @Res() response: HttpDownloadResponse
  ) {
    const file = this.reportingService.downloadExport(user, exportId, query.token);

    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    response.send(file.content);
  }
}
