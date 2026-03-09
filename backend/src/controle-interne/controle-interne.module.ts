import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TresorerieModule } from '../tresorerie/tresorerie.module';
import { ControleInterneController } from './controle-interne.controller';
import { ControleInterneService } from './controle-interne.service';

@Module({
  imports: [AuthModule, TresorerieModule],
  controllers: [ControleInterneController],
  providers: [ControleInterneService],
  exports: [ControleInterneService],
})
export class ControleInterneModule {}
