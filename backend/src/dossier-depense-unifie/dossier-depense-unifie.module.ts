import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DossierDepenseUnifieController } from './dossier-depense-unifie.controller';
import { DossierDepenseUnifieService } from './dossier-depense-unifie.service';

@Module({
  imports: [AuthModule],
  controllers: [DossierDepenseUnifieController],
  providers: [DossierDepenseUnifieService],
  exports: [DossierDepenseUnifieService]
})
export class DossierDepenseUnifieModule {}
