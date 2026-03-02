import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthLoggerService } from './auth-logger.service';
import { AuthService } from './auth.service';
import { RefreshTokenStore } from './refresh-token.store';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [AuthService, UsersService, JwtService, RefreshTokenStore, AuthLoggerService]
    }).compile();

    authService = moduleRef.get(AuthService);
  });

  it('emits accessToken and refreshToken on valid login', async () => {
    const result = await authService.login('user@agilys.local', 'ChangeMe123!');

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
  });

  it('rejects invalid credentials', async () => {
    await expect(authService.login('user@agilys.local', 'wrong-password')).rejects.toThrow('Invalid credentials');
  });

  it('rotates refresh token and invalidates old one', async () => {
    const firstSession = await authService.login('user@agilys.local', 'ChangeMe123!');
    const rotatedSession = await authService.refresh(firstSession.refreshToken);

    expect(rotatedSession.refreshToken).not.toEqual(firstSession.refreshToken);

    await expect(authService.refresh(firstSession.refreshToken)).rejects.toThrow();
  });

  it('revokes refresh token on logout', async () => {
    const session = await authService.login('user@agilys.local', 'ChangeMe123!');

    await authService.logout(session.refreshToken);

    await expect(authService.refresh(session.refreshToken)).rejects.toThrow();
  });
});
