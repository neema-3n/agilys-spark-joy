import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CashRiskModule } from '../cash-risk/cash-risk.module';
import { PaiementsController } from './paiements.controller';
import { PaiementsService } from './paiements.service';

@Module({
  imports: [AuthModule, CashRiskModule],
  controllers: [PaiementsController],
  providers: [PaiementsService]
})
export class PaiementsModule {}
