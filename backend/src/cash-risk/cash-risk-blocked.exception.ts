import { BadRequestException } from '@nestjs/common';
import type { CashRiskDecision } from './cash-risk.types';

export class CashRiskBlockedException extends BadRequestException {
  constructor(decision: CashRiskDecision) {
    const primaryReason = decision.reasons[0] ?? 'Le seuil de risque cash est dépassé.';

    super({
      statusCode: 400,
      error: 'CashRiskBlocked',
      code: 'CASH_RISK_BLOCKED',
      message: `Transition bloquée: ${primaryReason}`,
      riskDecision: decision,
    });
  }
}
