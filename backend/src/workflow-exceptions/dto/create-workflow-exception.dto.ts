import { Transform } from 'class-transformer';
import { IsIn, IsISO8601, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { CASH_RISK_TRANSITIONS } from '../../cash-risk/cash-risk.types';
import { WORKFLOW_EXCEPTION_URGENCIES } from '../workflow-exceptions.types';

const SOURCE_TYPES = ['engagement', 'paiement', 'depense'] as const;

export class CreateWorkflowExceptionDto {
  @IsUUID()
  exerciceId!: string;

  @IsIn(CASH_RISK_TRANSITIONS)
  transition!: (typeof CASH_RISK_TRANSITIONS)[number];

  @IsIn(SOURCE_TYPES)
  sourceType!: (typeof SOURCE_TYPES)[number];

  @IsOptional()
  @IsUUID()
  sourceId?: string;

  @IsOptional()
  @IsUUID()
  entityId?: string;

  @Min(0)
  amount!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  motif!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  justification!: string;

  @IsIn(WORKFLOW_EXCEPTION_URGENCIES)
  urgence!: (typeof WORKFLOW_EXCEPTION_URGENCIES)[number];

  @IsISO8601()
  expiresAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  correlationId?: string;
}
