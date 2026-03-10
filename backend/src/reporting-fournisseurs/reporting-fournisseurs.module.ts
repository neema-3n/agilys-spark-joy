import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ReportingFournisseursController } from './reporting-fournisseurs.controller';
import { ReportingFournisseursService } from './reporting-fournisseurs.service';

@Module({
  imports: [AuthModule],
  controllers: [ReportingFournisseursController],
  providers: [ReportingFournisseursService],
  exports: [ReportingFournisseursService]
})
export class ReportingFournisseursModule {}
