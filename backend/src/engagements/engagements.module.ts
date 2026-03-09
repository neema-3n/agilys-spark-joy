import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CashRiskModule } from '../cash-risk/cash-risk.module';
import { EcrituresComptablesModule } from '../ecritures-comptables/ecritures-comptables.module';
import { ExerciceClotureModule } from '../exercice-cloture/exercice-cloture.module';
import { WorkflowExceptionsModule } from '../workflow-exceptions/workflow-exceptions.module';
import { EngagementsController } from './engagements.controller';
import { EngagementsService } from './engagements.service';

@Module({
  imports: [AuthModule, CashRiskModule, WorkflowExceptionsModule, EcrituresComptablesModule, ExerciceClotureModule],
  controllers: [EngagementsController],
  providers: [EngagementsService]
})
export class EngagementsModule {}
