import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { BudgetReferentielsController } from './budget-referentiels.controller';
import { BudgetReferentielsService } from './budget-referentiels.service';
import { BudgetReferentielsStore } from './budget-referentiels.store';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { TenantExerciceScopeGuard } from '../auth/tenant-exercice-scope.guard';

@Module({
  imports: [JwtModule.register({})],
  controllers: [BudgetReferentielsController],
  providers: [BudgetReferentielsService, BudgetReferentielsStore, JwtAuthGuard, RolesGuard, TenantExerciceScopeGuard]
})
export class BudgetReferentielsModule {}
