import { Module } from '@nestjs/common';
import { ReglesComptablesController } from './regles-comptables.controller';
import { ReglesComptablesService } from './regles-comptables.service';

@Module({
  controllers: [ReglesComptablesController],
  providers: [ReglesComptablesService],
  exports: [ReglesComptablesService]
})
export class ReglesComptablesModule {}
