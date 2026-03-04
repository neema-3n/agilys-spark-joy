import { Module } from '@nestjs/common';
import { RecettesController } from './recettes.controller';
import { RecettesService } from './recettes.service';

@Module({
  controllers: [RecettesController],
  providers: [RecettesService]
})
export class RecettesModule {}
