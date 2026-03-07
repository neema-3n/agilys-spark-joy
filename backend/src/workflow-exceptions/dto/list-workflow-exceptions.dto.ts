import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { CASH_RISK_TRANSITIONS } from '../../cash-risk/cash-risk.types';
import { WORKFLOW_EXCEPTION_STATUSES } from '../workflow-exceptions.types';

export class ListWorkflowExceptionsDto {
  @IsUUID()
  exerciceId!: string;

  @IsOptional()
  @IsIn(WORKFLOW_EXCEPTION_STATUSES)
  status?: (typeof WORKFLOW_EXCEPTION_STATUSES)[number];

  @IsOptional()
  @IsIn(CASH_RISK_TRANSITIONS)
  transition?: (typeof CASH_RISK_TRANSITIONS)[number];
}
