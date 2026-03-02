import { Injectable, Logger } from '@nestjs/common';

export type AuthEventType = 'login_success' | 'login_failure' | 'refresh' | 'logout';

@Injectable()
export class AuthLoggerService {
  private readonly logger = new Logger('AuthEvents');

  logEvent(eventType: AuthEventType, userId?: string, tenantId?: string): void {
    this.logger.log(
      JSON.stringify({
        eventType,
        userId: userId ?? null,
        tenantId: tenantId ?? null,
        timestamp: new Date().toISOString()
      })
    );
  }
}
