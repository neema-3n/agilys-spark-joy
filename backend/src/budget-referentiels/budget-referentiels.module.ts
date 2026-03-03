import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BudgetReferentielsController } from './budget-referentiels.controller';
import { BudgetReferentielsService } from './budget-referentiels.service';
import { BudgetReferentielsStore } from './budget-referentiels.store';
import { TenantExerciceScopeGuard } from '../auth/tenant-exercice-scope.guard';

@Module({
  imports: [AuthModule],
  controllers: [BudgetReferentielsController],
  providers: [BudgetReferentielsService, BudgetReferentielsStore, TenantExerciceScopeGuard]
})
export class BudgetReferentielsModule {}
