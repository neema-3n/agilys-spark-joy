import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BudgetReferentielsModule } from '../budget-referentiels/budget-referentiels.module';
import { ExerciceClotureController } from './exercice-cloture.controller';
import { ExerciceClotureService } from './exercice-cloture.service';

@Module({
  imports: [AuthModule, BudgetReferentielsModule],
  controllers: [ExerciceClotureController],
  providers: [ExerciceClotureService],
  exports: [ExerciceClotureService]
})
export class ExerciceClotureModule {}
