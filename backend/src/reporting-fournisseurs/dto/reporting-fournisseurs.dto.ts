import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export const REPORTING_FOURNISSEURS_VIEWS = ['etat-dettes-fournisseurs', 'etat-avances-regularisations'] as const;
export const REPORTING_FOURNISSEURS_EXPORT_FORMATS = ['csv', 'xlsx', 'pdf'] as const;
export const REPORTING_FOURNISSEURS_AGING_BUCKETS = ['J0-30', 'J31-60', 'J61-90', 'J90+'] as const;

export type ReportingFournisseursView = (typeof REPORTING_FOURNISSEURS_VIEWS)[number];
export type ReportingFournisseursExportFormat = (typeof REPORTING_FOURNISSEURS_EXPORT_FORMATS)[number];
export type ReportingFournisseursAgingBucket = (typeof REPORTING_FOURNISSEURS_AGING_BUCKETS)[number];

export class ReportingFournisseursQueryDto {
  @IsString()
  periode!: string;

  @IsOptional()
  @IsUUID()
  entite?: string;

  @IsOptional()
  @IsUUID()
  fournisseurId?: string;

  @IsOptional()
  @IsString()
  statut?: string;

  @IsOptional()
  @IsIn(REPORTING_FOURNISSEURS_AGING_BUCKETS)
  agingBucket?: ReportingFournisseursAgingBucket;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number;
}

export class ReportingFournisseursExportRequestDto extends ReportingFournisseursQueryDto {
  @IsIn(REPORTING_FOURNISSEURS_VIEWS)
  view!: ReportingFournisseursView;

  @IsIn(REPORTING_FOURNISSEURS_EXPORT_FORMATS)
  format!: ReportingFournisseursExportFormat;
}

export class ReportingFournisseursExportStatusQueryDto {
  @IsUUID()
  exportId!: string;
}

export class ReportingFournisseursExportDownloadQueryDto {
  @IsString()
  token!: string;
}
