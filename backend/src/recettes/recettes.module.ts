import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RecettesController } from './recettes.controller';
import { RecettesService } from './recettes.service';

@Module({
  imports: [AuthModule],
  controllers: [RecettesController],
  providers: [RecettesService]
})
export class RecettesModule {}
