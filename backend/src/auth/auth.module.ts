import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthLoggerService } from './auth-logger.service';
import { AuthService } from './auth.service';
import { RefreshTokenStore } from './refresh-token.store';
import { UsersService } from '../users/users.service';
import { PostgresService } from '../common/postgres.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, UsersService, RefreshTokenStore, AuthLoggerService, PostgresService]
})
export class AuthModule {}
