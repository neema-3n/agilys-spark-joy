import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ExerciceClotureModule } from '../exercice-cloture/exercice-cloture.module';
import { OperationsTresorerieController } from './operations-tresorerie.controller';
import { OperationsTresorerieService } from './operations-tresorerie.service';

@Module({
  imports: [AuthModule, ExerciceClotureModule],
  controllers: [OperationsTresorerieController],
  providers: [OperationsTresorerieService]
})
export class OperationsTresorerieModule {}
