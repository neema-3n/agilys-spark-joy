import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { BudgetReferentielsController } from './budget-referentiels.controller';
import { BudgetReferentielsService } from './budget-referentiels.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@Module({
  imports: [JwtModule.register({})],
  controllers: [BudgetReferentielsController],
  providers: [BudgetReferentielsService, JwtAuthGuard, RolesGuard]
})
export class BudgetReferentielsModule {}
