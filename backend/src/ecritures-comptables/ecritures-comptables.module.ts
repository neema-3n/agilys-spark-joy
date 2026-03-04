import { Module } from '@nestjs/common';
import { EcrituresComptablesController } from './ecritures-comptables.controller';
import { EcrituresComptablesService } from './ecritures-comptables.service';

@Module({
  controllers: [EcrituresComptablesController],
  providers: [EcrituresComptablesService],
  exports: [EcrituresComptablesService]
})
export class EcrituresComptablesModule {}
