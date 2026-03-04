import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EcrituresComptablesController } from './ecritures-comptables.controller';
import { EcrituresComptablesService } from './ecritures-comptables.service';

@Module({
  imports: [AuthModule],
  controllers: [EcrituresComptablesController],
  providers: [EcrituresComptablesService],
  exports: [EcrituresComptablesService]
})
export class EcrituresComptablesModule {}
