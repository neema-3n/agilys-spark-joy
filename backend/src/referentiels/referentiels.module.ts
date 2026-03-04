import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ReferentielsController } from './referentiels.controller';
import { ReferentielsService } from './referentiels.service';

@Module({
  imports: [AuthModule],
  controllers: [ReferentielsController],
  providers: [ReferentielsService],
  exports: [ReferentielsService]
})
export class ReferentielsModule {}
