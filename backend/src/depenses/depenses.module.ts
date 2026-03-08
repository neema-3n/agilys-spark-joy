import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EcrituresComptablesModule } from '../ecritures-comptables/ecritures-comptables.module';
import { WorkflowExceptionsModule } from '../workflow-exceptions/workflow-exceptions.module';
import { DepensesController } from './depenses.controller';
import { DepensesService } from './depenses.service';

@Module({
  imports: [AuthModule, WorkflowExceptionsModule, EcrituresComptablesModule],
  controllers: [DepensesController],
  providers: [DepensesService]
})
export class DepensesModule {}
