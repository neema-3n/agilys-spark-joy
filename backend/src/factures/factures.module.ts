import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FacturesController } from './factures.controller';
import { FacturesService } from './factures.service';

@Module({
  imports: [AuthModule],
  controllers: [FacturesController],
  providers: [FacturesService],
  exports: [FacturesService]
})
export class FacturesModule {}
