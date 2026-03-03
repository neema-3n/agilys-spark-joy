import { Injectable, Logger } from '@nestjs/common';

type AuthorizationDecisionType = 'allow' | 'deny';

@Injectable()
export class AuthorizationAuditService {
  private readonly logger = new Logger('AuthorizationAudit');

  logDecision(input: {
    userId: string;
    tenantId: string;
    action: string;
    decision: AuthorizationDecisionType;
    reason?: string;
  }): void {
    this.logger.log(
      JSON.stringify({
        userId: input.userId,
        tenantId: input.tenantId,
        action: input.action,
        decision: input.decision,
        reason: input.reason ?? null,
        timestamp: new Date().toISOString()
      })
    );
  }
}
