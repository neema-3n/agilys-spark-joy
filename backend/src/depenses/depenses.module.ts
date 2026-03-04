import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DepensesController } from './depenses.controller';
import { DepensesService } from './depenses.service';

@Module({
  imports: [AuthModule],
  controllers: [DepensesController],
  providers: [DepensesService]
})
export class DepensesModule {}
