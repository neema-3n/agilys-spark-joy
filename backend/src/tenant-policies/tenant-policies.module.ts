import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PostgresService } from '../common/postgres.service';
import { TenantPoliciesController } from './tenant-policies.controller';
import { TenantPoliciesService } from './tenant-policies.service';

@Module({
  imports: [AuthModule],
  controllers: [TenantPoliciesController],
  providers: [TenantPoliciesService, PostgresService]
})
export class TenantPoliciesModule {}
