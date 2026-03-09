import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { CASH_RISK_DECISIONS, CASH_RISK_LEVELS, CASH_RISK_TRANSITIONS } from '../../cash-risk/cash-risk.types';

export class TresorerieQueryDto {
  @IsUUID()
  exerciceId!: string;
}

export const TRESORERIE_AUDIT_STATUSES = [
  'blocked',
  'exception-requested',
  'exception-approved',
  'exception-expired',
  'executed-under-exception',
] as const;
export type TresorerieAuditStatus = (typeof TRESORERIE_AUDIT_STATUSES)[number];

export const CLOSEOUT_DOSSIER_TYPES = ['cloture_exercice', 'migration_reconciliation'] as const;
export type CloseoutDossierType = (typeof CLOSEOUT_DOSSIER_TYPES)[number];

export const CLOSEOUT_DOSSIER_STATUSES = ['ready', 'blocked', 'go', 'no_go'] as const;
export type CloseoutDossierStatus = (typeof CLOSEOUT_DOSSIER_STATUSES)[number];

export class TresorerieAuditQueryDto extends TresorerieQueryDto {
  private static readonly SOURCE_TYPES = ['engagement', 'paiement', 'depense'] as const;

  @IsOptional()
  @IsIn(TRESORERIE_AUDIT_STATUSES)
  status?: TresorerieAuditStatus;

  @IsOptional()
  @IsIn(CASH_RISK_TRANSITIONS)
  transition?: (typeof CASH_RISK_TRANSITIONS)[number];

  @IsOptional()
  @IsIn(CASH_RISK_LEVELS)
  severity?: (typeof CASH_RISK_LEVELS)[number];

  @IsOptional()
  @IsIn(CASH_RISK_DECISIONS)
  decision?: (typeof CASH_RISK_DECISIONS)[number];

  @IsOptional()
  @IsIn(TresorerieAuditQueryDto.SOURCE_TYPES)
  sourceType?: 'engagement' | 'paiement' | 'depense';

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  sourceId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  entityId?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
}

export class TresorerieAuditDetailQueryDto extends TresorerieQueryDto {
  @IsOptional()
  @IsUUID()
  exceptionId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  correlationId?: string;
}

export class CloseoutDossierQueryDto extends TresorerieQueryDto {
  @IsOptional()
  @IsIn(CLOSEOUT_DOSSIER_TYPES)
  dossierType?: CloseoutDossierType;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  migrationBatchId?: string;
}
