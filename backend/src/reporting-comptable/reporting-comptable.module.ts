import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ReportingComptableController } from './reporting-comptable.controller';
import { ReportingComptableService } from './reporting-comptable.service';

@Module({
  imports: [AuthModule],
  controllers: [ReportingComptableController],
  providers: [ReportingComptableService],
  exports: [ReportingComptableService]
})
export class ReportingComptableModule {}
