import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ComptesTresorerieController } from './comptes-tresorerie.controller';
import { ComptesTresorerieService } from './comptes-tresorerie.service';

@Module({
  imports: [AuthModule],
  controllers: [ComptesTresorerieController],
  providers: [ComptesTresorerieService]
})
export class ComptesTresorerieModule {}
