import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProjetsController } from './projets.controller';
import { ProjetsService } from './projets.service';

@Module({
  imports: [AuthModule],
  controllers: [ProjetsController],
  providers: [ProjetsService]
})
export class ProjetsModule {}
