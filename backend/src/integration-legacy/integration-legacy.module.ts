import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { IntegrationLegacyController } from './integration-legacy.controller';
import { IntegrationLegacyService } from './integration-legacy.service';
import { IntegrationLegacyTransport } from './integration-legacy.transport';

@Module({
  imports: [AuthModule],
  controllers: [IntegrationLegacyController],
  providers: [IntegrationLegacyService, IntegrationLegacyTransport],
  exports: [IntegrationLegacyService],
})
export class IntegrationLegacyModule {}
