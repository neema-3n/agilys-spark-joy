import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WorkflowExceptionsModule } from '../workflow-exceptions/workflow-exceptions.module';
import { PaiementsController } from './paiements.controller';
import { PaiementsService } from './paiements.service';

@Module({
  imports: [AuthModule, WorkflowExceptionsModule],
  controllers: [PaiementsController],
  providers: [PaiementsService]
})
export class PaiementsModule {}
