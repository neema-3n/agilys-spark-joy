import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EngagementsController } from './engagements.controller';
import { EngagementsService } from './engagements.service';

@Module({
  imports: [AuthModule],
  controllers: [EngagementsController],
  providers: [EngagementsService]
})
export class EngagementsModule {}
