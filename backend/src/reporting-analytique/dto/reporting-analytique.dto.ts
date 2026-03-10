import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export const REPORTING_ANALYTIQUE_DIMENSIONS = [
  'periode',
  'entite',
  'axe-analytique',
  'composante-budgetaire',
  'fournisseur',
  'statut'
] as const;

export const REPORTING_ANALYTIQUE_MEASURES = [
  'montant-budget-modifie',
  'montant-engage',
  'montant-paye',
  'montant-depense',
  'count'
] as const;

export const REPORTING_ANALYTIQUE_CYCLE_STAGES = [
  'reservation-engagement',
  'engagement-bon-commande',
  'bon-commande-facture',
  'facture-depense',
  'depense-paiement'
] as const;

export const REPORTING_ANALYTIQUE_VIEWS = ['tableau-croise', 'dashboard', 'cycle-time'] as const;
export const REPORTING_ANALYTIQUE_EXPORT_FORMATS = ['csv', 'xlsx', 'pdf'] as const;

export type ReportingAnalytiqueDimension = (typeof REPORTING_ANALYTIQUE_DIMENSIONS)[number];
export type ReportingAnalytiqueMeasure = (typeof REPORTING_ANALYTIQUE_MEASURES)[number];
export type ReportingAnalytiqueCycleStage = (typeof REPORTING_ANALYTIQUE_CYCLE_STAGES)[number];
export type ReportingAnalytiqueView = (typeof REPORTING_ANALYTIQUE_VIEWS)[number];
export type ReportingAnalytiqueExportFormat = (typeof REPORTING_ANALYTIQUE_EXPORT_FORMATS)[number];

export class ReportingAnalytiqueQueryDto {
  @IsUUID()
  exerciceId!: string;

  @IsString()
  periode!: string;

  @IsOptional()
  @IsUUID()
  entite?: string;

  @IsOptional()
  @IsUUID()
  axeAnalytique?: string;

  @IsOptional()
  @IsString()
  composanteBudgetaire?: string;

  @IsOptional()
  @IsUUID()
  fournisseurId?: string;

  @IsOptional()
  @IsString()
  statut?: string;

  @IsOptional()
  @IsIn(REPORTING_ANALYTIQUE_DIMENSIONS)
  rowDimension?: ReportingAnalytiqueDimension;

  @IsOptional()
  @IsIn(REPORTING_ANALYTIQUE_DIMENSIONS)
  columnDimension?: ReportingAnalytiqueDimension;

  @IsOptional()
  @IsIn(REPORTING_ANALYTIQUE_MEASURES)
  measure?: ReportingAnalytiqueMeasure;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  pageSize?: number;

  @IsOptional()
  @IsString()
  correlationId?: string;
}

export class ReportingAnalytiqueExportRequestDto extends ReportingAnalytiqueQueryDto {
  @IsIn(REPORTING_ANALYTIQUE_VIEWS)
  view!: ReportingAnalytiqueView;

  @IsIn(REPORTING_ANALYTIQUE_EXPORT_FORMATS)
  format!: ReportingAnalytiqueExportFormat;

  @IsOptional()
  @IsIn(REPORTING_ANALYTIQUE_CYCLE_STAGES)
  etape?: ReportingAnalytiqueCycleStage;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  seuilReservationEngagementHeures?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  seuilEngagementBonCommandeHeures?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  seuilBonCommandeFactureHeures?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  seuilFactureDepenseHeures?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  seuilDepensePaiementHeures?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  seuilVariationPct?: number;
}

export class ReportingAnalytiqueCycleTimeQueryDto {
  @IsUUID()
  exerciceId!: string;

  @IsString()
  periode!: string;

  @IsOptional()
  @IsUUID()
  entite?: string;

  @IsOptional()
  @IsUUID()
  axeAnalytique?: string;

  @IsOptional()
  @IsIn(REPORTING_ANALYTIQUE_CYCLE_STAGES)
  etape?: ReportingAnalytiqueCycleStage;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  seuilReservationEngagementHeures?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  seuilEngagementBonCommandeHeures?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  seuilBonCommandeFactureHeures?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  seuilFactureDepenseHeures?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  seuilDepensePaiementHeures?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  seuilVariationPct?: number;

  @IsOptional()
  @IsString()
  correlationId?: string;
}

export class ReportingAnalytiqueExportStatusQueryDto {
  @IsUUID()
  exportId!: string;
}

export class ReportingAnalytiqueExportDownloadQueryDto {
  @IsString()
  token!: string;
}
