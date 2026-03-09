import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ExerciceClotureModule } from '../exercice-cloture/exercice-cloture.module';
import { RapprochementsBancairesController } from './rapprochements-bancaires.controller';
import { RapprochementsBancairesService } from './rapprochements-bancaires.service';

@Module({
  imports: [AuthModule, ExerciceClotureModule],
  controllers: [RapprochementsBancairesController],
  providers: [RapprochementsBancairesService],
  exports: [RapprochementsBancairesService]
})
export class RapprochementsBancairesModule {}
