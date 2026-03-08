import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EcrituresComptablesModule } from '../ecritures-comptables/ecritures-comptables.module';
import { BonsCommandeController } from './bons-commande.controller';
import { BonsCommandeService } from './bons-commande.service';

@Module({
  imports: [AuthModule, EcrituresComptablesModule],
  controllers: [BonsCommandeController],
  providers: [BonsCommandeService],
  exports: [BonsCommandeService]
})
export class BonsCommandeModule {}
