import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { BudgetReferentielsModule } from './budget-referentiels/budget-referentiels.module';
import { TenantPoliciesModule } from './tenant-policies/tenant-policies.module';

@Module({
  imports: [AuthModule, BudgetReferentielsModule, TenantPoliciesModule]
})
export class AppModule {}
