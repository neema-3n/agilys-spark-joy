import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrevisionsController } from './previsions.controller';
import { PrevisionsService } from './previsions.service';

@Module({
  imports: [AuthModule],
  controllers: [PrevisionsController],
  providers: [PrevisionsService],
  exports: [PrevisionsService]
})
export class PrevisionsModule {}
