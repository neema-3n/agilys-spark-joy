import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EcrituresComptablesModule } from '../ecritures-comptables/ecritures-comptables.module';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';

@Module({
  imports: [AuthModule, EcrituresComptablesModule],
  controllers: [ReservationsController],
  providers: [ReservationsService]
})
export class ReservationsModule {}
