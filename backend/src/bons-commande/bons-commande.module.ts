import { Module } from '@nestjs/common';
import { BonsCommandeController } from './bons-commande.controller';
import { BonsCommandeService } from './bons-commande.service';

@Module({
  controllers: [BonsCommandeController],
  providers: [BonsCommandeService],
  exports: [BonsCommandeService]
})
export class BonsCommandeModule {}
