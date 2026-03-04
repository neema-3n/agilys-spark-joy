import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OperationsTresorerieController } from './operations-tresorerie.controller';
import { OperationsTresorerieService } from './operations-tresorerie.service';

@Module({
  imports: [AuthModule],
  controllers: [OperationsTresorerieController],
  providers: [OperationsTresorerieService]
})
export class OperationsTresorerieModule {}
