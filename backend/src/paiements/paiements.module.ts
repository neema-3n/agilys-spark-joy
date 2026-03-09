import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EcrituresComptablesModule } from '../ecritures-comptables/ecritures-comptables.module';
import { ExerciceClotureModule } from '../exercice-cloture/exercice-cloture.module';
import { WorkflowExceptionsModule } from '../workflow-exceptions/workflow-exceptions.module';
import { PaiementsController } from './paiements.controller';
import { PaiementsService } from './paiements.service';

@Module({
  imports: [AuthModule, WorkflowExceptionsModule, EcrituresComptablesModule, ExerciceClotureModule],
  controllers: [PaiementsController],
  providers: [PaiementsService]
})
export class PaiementsModule {}
