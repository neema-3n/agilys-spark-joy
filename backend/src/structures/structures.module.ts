import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StructuresController } from './structures.controller';
import { StructuresService } from './structures.service';

@Module({
  imports: [AuthModule],
  controllers: [StructuresController],
  providers: [StructuresService]
})
export class StructuresModule {}
