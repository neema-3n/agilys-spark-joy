import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ReportingExecutionTresorerieController } from './reporting-execution-tresorerie.controller';
import { ReportingExecutionTresorerieService } from './reporting-execution-tresorerie.service';

@Module({
  imports: [AuthModule],
  controllers: [ReportingExecutionTresorerieController],
  providers: [ReportingExecutionTresorerieService],
  exports: [ReportingExecutionTresorerieService]
})
export class ReportingExecutionTresorerieModule {}
