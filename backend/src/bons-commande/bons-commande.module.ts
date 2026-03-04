import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BonsCommandeController } from './bons-commande.controller';
import { BonsCommandeService } from './bons-commande.service';

@Module({
  imports: [AuthModule],
  controllers: [BonsCommandeController],
  providers: [BonsCommandeService],
  exports: [BonsCommandeService]
})
export class BonsCommandeModule {}
