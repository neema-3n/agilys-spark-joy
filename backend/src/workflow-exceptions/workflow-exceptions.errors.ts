import { BadRequestException, ForbiddenException } from '@nestjs/common';

export type WorkflowExceptionErrorCode =
  | 'QUORUM_INCOMPLET'
  | 'EXCEPTION_EXPIREE'
  | 'EXCEPTION_DEJA_CONSOMMEE'
  | 'UTILISATEUR_NON_ELIGIBLE'
  | 'TRANSITION_CIBLE_INCOHERENTE'
  | 'DOUBLE_VOTE'
  | 'EXCEPTION_REJETEE';

export class WorkflowExceptionBusinessException extends BadRequestException {
  constructor(code: WorkflowExceptionErrorCode, message: string, extra?: Record<string, unknown>) {
    super({
      statusCode: 400,
      error: 'WorkflowExceptionError',
      code,
      message,
      ...(extra ?? {}),
    });
  }
}

export class WorkflowExceptionForbiddenException extends ForbiddenException {
  constructor(message: string) {
    super({
      statusCode: 403,
      error: 'WorkflowExceptionForbidden',
      code: 'UTILISATEUR_NON_ELIGIBLE',
      message,
    });
  }
}
