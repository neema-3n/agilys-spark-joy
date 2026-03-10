import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export const REPORTING_EXECUTION_TRESORERIE_VIEWS = ['execution-budgetaire', 'tresorerie'] as const;
export const REPORTING_EXECUTION_TRESORERIE_EXPORT_FORMATS = ['csv', 'xlsx', 'pdf'] as const;

export type ReportingExecutionTresorerieView = (typeof REPORTING_EXECUTION_TRESORERIE_VIEWS)[number];
export type ReportingExecutionTresorerieExportFormat = (typeof REPORTING_EXECUTION_TRESORERIE_EXPORT_FORMATS)[number];

export class ReportingExecutionTresorerieQueryDto {
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
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  seuil?: number;

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

  @IsOptional()
  @IsString()
  correlationId?: string;
}

export class ReportingExecutionTresorerieExportRequestDto extends ReportingExecutionTresorerieQueryDto {
  @IsIn(REPORTING_EXECUTION_TRESORERIE_VIEWS)
  view!: ReportingExecutionTresorerieView;

  @IsIn(REPORTING_EXECUTION_TRESORERIE_EXPORT_FORMATS)
  format!: ReportingExecutionTresorerieExportFormat;
}

export class ReportingExecutionTresorerieExportStatusQueryDto {
  @IsUUID()
  exportId!: string;
}

export class ReportingExecutionTresorerieExportDownloadQueryDto {
  @IsString()
  token!: string;
}
