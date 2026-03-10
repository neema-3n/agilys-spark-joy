import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AuthorizationPolicyGuard } from '../auth/authorization-policy.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { DossierDepenseUnifieExportQueryDto, DossierDepenseUnifieQueryDto } from './dto/dossier-depense-unifie.dto';
import { DossierDepenseUnifieService } from './dossier-depense-unifie.service';

interface HttpDownloadResponse {
  setHeader(name: string, value: string): void;
  send(body: Buffer): void;
}

@Controller('dossier-depense-unifie')
@UseGuards(JwtAuthGuard, AuthorizationPolicyGuard)
export class DossierDepenseUnifieController {
  constructor(private readonly dossierService: DossierDepenseUnifieService) {}

  @Get(':depenseId')
  @RequirePermissions('referentiels:audit:read')
  getDossier(@CurrentUser() user: AuthenticatedUser, @Param('depenseId') depenseId: string, @Query() query: DossierDepenseUnifieQueryDto) {
    return this.dossierService.getDossier(user, depenseId, query);
  }

  @Get(':depenseId/export')
  @RequirePermissions('referentiels:audit:read')
  async exportDossier(
    @CurrentUser() user: AuthenticatedUser,
    @Param('depenseId') depenseId: string,
    @Query() query: DossierDepenseUnifieExportQueryDto,
    @Res() response: HttpDownloadResponse
  ) {
    const file = await this.dossierService.exportDossier(user, depenseId, query);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    response.send(file.content);
  }
}
