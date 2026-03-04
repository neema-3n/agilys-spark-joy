import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RapprochementsBancairesController } from './rapprochements-bancaires.controller';
import { RapprochementsBancairesService } from './rapprochements-bancaires.service';

@Module({
  imports: [AuthModule],
  controllers: [RapprochementsBancairesController],
  providers: [RapprochementsBancairesService],
  exports: [RapprochementsBancairesService]
})
export class RapprochementsBancairesModule {}
