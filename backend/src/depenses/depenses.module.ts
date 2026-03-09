import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EcrituresComptablesModule } from '../ecritures-comptables/ecritures-comptables.module';
import { ExerciceClotureModule } from '../exercice-cloture/exercice-cloture.module';
import { WorkflowExceptionsModule } from '../workflow-exceptions/workflow-exceptions.module';
import { DepensesController } from './depenses.controller';
import { DepensesService } from './depenses.service';

@Module({
  imports: [AuthModule, WorkflowExceptionsModule, EcrituresComptablesModule, ExerciceClotureModule],
  controllers: [DepensesController],
  providers: [DepensesService]
})
export class DepensesModule {}
