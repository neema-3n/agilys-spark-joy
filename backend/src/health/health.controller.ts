import { Controller, Get } from '@nestjs/common';
import { resolveAppEnv } from '../config/runtime-env';

@Controller()
export class HealthController {
  @Get('health')
  getHealth() {
    return {
      status: 'ok' as const,
      appEnv: resolveAppEnv(),
      timestamp: new Date().toISOString()
    };
  }
}
