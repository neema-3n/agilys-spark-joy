import { Module } from '@nestjs/common';
import { RapprochementsBancairesController } from './rapprochements-bancaires.controller';
import { RapprochementsBancairesService } from './rapprochements-bancaires.service';

@Module({
  controllers: [RapprochementsBancairesController],
  providers: [RapprochementsBancairesService],
  exports: [RapprochementsBancairesService]
})
export class RapprochementsBancairesModule {}
