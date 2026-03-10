import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ReportingAnalytiqueController } from './reporting-analytique.controller';
import { ReportingAnalytiqueService } from './reporting-analytique.service';

@Module({
  imports: [AuthModule],
  controllers: [ReportingAnalytiqueController],
  providers: [ReportingAnalytiqueService],
  exports: [ReportingAnalytiqueService]
})
export class ReportingAnalytiqueModule {}
