import { Module } from '@nestjs/common';
import { OperationsTresorerieController } from './operations-tresorerie.controller';
import { OperationsTresorerieService } from './operations-tresorerie.service';

@Module({
  controllers: [OperationsTresorerieController],
  providers: [OperationsTresorerieService]
})
export class OperationsTresorerieModule {}
