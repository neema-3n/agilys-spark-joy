import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CashRiskModule } from '../cash-risk/cash-risk.module';
import { WorkflowExceptionsModule } from '../workflow-exceptions/workflow-exceptions.module';
import { EngagementsController } from './engagements.controller';
import { EngagementsService } from './engagements.service';

@Module({
  imports: [AuthModule, CashRiskModule, WorkflowExceptionsModule],
  controllers: [EngagementsController],
  providers: [EngagementsService]
})
export class EngagementsModule {}
