import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ReglesComptablesController } from './regles-comptables.controller';
import { ReglesComptablesService } from './regles-comptables.service';

@Module({
  imports: [AuthModule],
  controllers: [ReglesComptablesController],
  providers: [ReglesComptablesService],
  exports: [ReglesComptablesService]
})
export class ReglesComptablesModule {}
