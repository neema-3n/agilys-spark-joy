import { Module } from '@nestjs/common';
import { PostgresModule } from '../common/postgres.module';
import { CashRiskService } from './cash-risk.service';

@Module({
  imports: [PostgresModule],
  providers: [CashRiskService],
  exports: [CashRiskService],
})
export class CashRiskModule {}
