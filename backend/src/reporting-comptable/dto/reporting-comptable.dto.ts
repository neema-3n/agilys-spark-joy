import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export const REPORTING_COMPTABLE_VIEWS = ['balance', 'grand-livre', 'fiche-compte'] as const;
export const REPORTING_COMPTABLE_EXPORT_FORMATS = ['csv', 'xlsx', 'pdf'] as const;

export type ReportingComptableView = (typeof REPORTING_COMPTABLE_VIEWS)[number];
export type ReportingComptableExportFormat = (typeof REPORTING_COMPTABLE_EXPORT_FORMATS)[number];

export class ReportingComptableQueryDto {
  @IsDateString()
  dateDebut!: string;

  @IsDateString()
  dateFin!: string;

  @IsOptional()
  @IsUUID()
  compteId?: string;

  @IsOptional()
  @IsUUID()
  entiteId?: string;

  @IsOptional()
  @IsUUID()
  axeId?: string;

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

export class ReportingComptableExportRequestDto extends ReportingComptableQueryDto {
  @IsIn(REPORTING_COMPTABLE_VIEWS)
  view!: ReportingComptableView;

  @IsIn(REPORTING_COMPTABLE_EXPORT_FORMATS)
  format!: ReportingComptableExportFormat;
}

export class ReportingComptableExportStatusQueryDto {
  @IsUUID()
  exportId!: string;
}

export class ReportingComptableExportDownloadQueryDto {
  @IsString()
  token!: string;
}
