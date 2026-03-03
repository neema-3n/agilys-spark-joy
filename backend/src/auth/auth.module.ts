import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthorizationAuditService } from './authorization-audit.service';
import { AuthorizationPolicyGuard } from './authorization-policy.guard';
import { AuthorizationPolicyService } from './authorization-policy.service';
import { AuthController } from './auth.controller';
import { AuthLoggerService } from './auth-logger.service';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RefreshTokenStore } from './refresh-token.store';
import { RolesGuard } from './roles.guard';
import { UsersService } from '../users/users.service';
import { PostgresService } from '../common/postgres.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    UsersService,
    RefreshTokenStore,
    AuthLoggerService,
    PostgresService,
    JwtAuthGuard,
    RolesGuard,
    AuthorizationPolicyService,
    AuthorizationPolicyGuard,
    AuthorizationAuditService
  ],
  exports: [
    JwtModule,
    UsersService,
    JwtAuthGuard,
    RolesGuard,
    AuthorizationPolicyService,
    AuthorizationPolicyGuard,
    AuthorizationAuditService
  ]
})
export class AuthModule {}
