import { Body, Controller, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from './authenticated-user.interface';
import { AuthorizationPolicyGuard } from './authorization-policy.guard';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RequirePermissions } from './permissions.decorator';
import { AssignRoleDto } from './dto/assign-role.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RevokeRoleDto } from './dto/revoke-role.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }

  @Post('refresh')
  async refresh(@Body() body: RefreshDto) {
    return this.authService.refresh(body.refreshToken);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Body() body: LogoutDto): Promise<void> {
    await this.authService.logout(body.refreshToken);
  }

  @Patch('users/:userId/roles/assign')
  @UseGuards(JwtAuthGuard, AuthorizationPolicyGuard)
  @RequirePermissions('roles:manage')
  async assignRole(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('userId') userId: string,
    @Body() body: AssignRoleDto
  ) {
    return this.authService.assignRole(currentUser, userId, body.role);
  }

  @Patch('users/:userId/roles/revoke')
  @UseGuards(JwtAuthGuard, AuthorizationPolicyGuard)
  @RequirePermissions('roles:manage')
  async revokeRole(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('userId') userId: string,
    @Body() body: RevokeRoleDto
  ) {
    return this.authService.revokeRole(currentUser, userId, body.role);
  }
}
