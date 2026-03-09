import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EcrituresComptablesModule } from '../ecritures-comptables/ecritures-comptables.module';
import { ExerciceClotureModule } from '../exercice-cloture/exercice-cloture.module';
import { FacturesController } from './factures.controller';
import { FacturesService } from './factures.service';

@Module({
  imports: [AuthModule, EcrituresComptablesModule, ExerciceClotureModule],
  controllers: [FacturesController],
  providers: [FacturesService],
  exports: [FacturesService]
})
export class FacturesModule {}
