import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { BudgetReferentielsModule } from './budget-referentiels/budget-referentiels.module';

@Module({
  imports: [AuthModule, BudgetReferentielsModule]
})
export class AppModule {}
