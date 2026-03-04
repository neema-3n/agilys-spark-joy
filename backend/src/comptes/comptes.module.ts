import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ComptesController } from './comptes.controller';
import { ComptesService } from './comptes.service';

@Module({
  imports: [AuthModule],
  controllers: [ComptesController],
  providers: [ComptesService]
})
export class ComptesModule {}
