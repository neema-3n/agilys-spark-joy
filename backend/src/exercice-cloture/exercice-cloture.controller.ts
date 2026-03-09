import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthorizationPolicyGuard } from '../auth/authorization-policy.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { TenantExerciceScopeGuard } from '../auth/tenant-exercice-scope.guard';
import { ExerciceClotureService } from './exercice-cloture.service';
import { ReouvrirExerciceDto } from './dto/exercice-cloture.dto';

@Controller('budget-referentiels/exercices')
@UseGuards(JwtAuthGuard, AuthorizationPolicyGuard, TenantExerciceScopeGuard)
export class ExerciceClotureController {
  constructor(private readonly exerciceClotureService: ExerciceClotureService) {}

  @Get(':id/checklist')
  @RequirePermissions('referentiels:read')
  getChecklist(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.exerciceClotureService.getChecklist(user, id);
  }

  @Get(':id/cloture-events')
  @RequirePermissions('referentiels:audit:read')
  getEvents(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.exerciceClotureService.listEvents(user, id);
  }

  @Post(':id/pre-cloture')
  @RequirePermissions('referentiels:write')
  startReview(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.exerciceClotureService.startReview(user, id);
  }

  @Post(':id/cloturer')
  @RequirePermissions('referentiels:write')
  close(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.exerciceClotureService.close(user, id);
  }

  @Patch(':id/reouvrir')
  @RequirePermissions('referentiels:write')
  reopen(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: ReouvrirExerciceDto) {
    return this.exerciceClotureService.reopen(user, id, body);
  }
}
