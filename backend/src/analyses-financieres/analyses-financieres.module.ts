import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AnalysesFinancieresController } from './analyses-financieres.controller';
import { AnalysesFinancieresService } from './analyses-financieres.service';

@Module({
  imports: [AuthModule],
  controllers: [AnalysesFinancieresController],
  providers: [AnalysesFinancieresService],
  exports: [AnalysesFinancieresService]
})
export class AnalysesFinancieresModule {}

