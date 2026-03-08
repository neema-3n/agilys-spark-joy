import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CashRiskModule } from '../cash-risk/cash-risk.module';
import { EcrituresComptablesModule } from '../ecritures-comptables/ecritures-comptables.module';
import { WorkflowExceptionsModule } from '../workflow-exceptions/workflow-exceptions.module';
import { EngagementsController } from './engagements.controller';
import { EngagementsService } from './engagements.service';

@Module({
  imports: [AuthModule, CashRiskModule, WorkflowExceptionsModule, EcrituresComptablesModule],
  controllers: [EngagementsController],
  providers: [EngagementsService]
})
export class EngagementsModule {}
