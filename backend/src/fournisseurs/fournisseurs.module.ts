import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FournisseursController } from './fournisseurs.controller';
import { FournisseursService } from './fournisseurs.service';

@Module({
  imports: [AuthModule],
  controllers: [FournisseursController],
  providers: [FournisseursService]
})
export class FournisseursModule {}
