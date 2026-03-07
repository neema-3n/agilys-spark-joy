import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CashRiskModule } from '../cash-risk/cash-risk.module';
import { WorkflowExceptionsController } from './workflow-exceptions.controller';
import { WorkflowExceptionsService } from './workflow-exceptions.service';

@Module({
  imports: [AuthModule, CashRiskModule],
  controllers: [WorkflowExceptionsController],
  providers: [WorkflowExceptionsService],
  exports: [WorkflowExceptionsService],
})
export class WorkflowExceptionsModule {}
