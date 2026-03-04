import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TresorerieController } from './tresorerie.controller';
import { TresorerieService } from './tresorerie.service';

@Module({
  imports: [AuthModule],
  controllers: [TresorerieController],
  providers: [TresorerieService],
  exports: [TresorerieService]
})
export class TresorerieModule {}
