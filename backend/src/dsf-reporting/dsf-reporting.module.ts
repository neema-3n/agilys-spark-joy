import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DsfReportingController } from './dsf-reporting.controller';
import { DsfReportingService } from './dsf-reporting.service';

@Module({
  imports: [AuthModule],
  controllers: [DsfReportingController],
  providers: [DsfReportingService],
  exports: [DsfReportingService]
})
export class DsfReportingModule {}
