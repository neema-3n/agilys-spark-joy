import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export const DSF_REFERENTIEL_VERSIONS = ['OHADA-SYCEBNL-2017', 'OHADA-SYCEBNL-2025'] as const;
export const DSF_EXPORT_FORMATS = ['csv', 'xlsx', 'pdf'] as const;

export type DsfReferentielVersion = (typeof DSF_REFERENTIEL_VERSIONS)[number];
export type DsfExportFormat = (typeof DSF_EXPORT_FORMATS)[number];

export class DsfReportingValidationRequestDto {
  @IsUUID()
  exerciceId!: string;

  @IsOptional()
  @IsUUID()
  entiteId?: string;

  @IsIn(DSF_REFERENTIEL_VERSIONS)
  referentielVersion!: DsfReferentielVersion;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeWarnings?: boolean;

  @IsOptional()
  @IsString()
  correlationId?: string;
}

export class DsfReportingExportRequestDto extends DsfReportingValidationRequestDto {
  @IsIn(DSF_EXPORT_FORMATS)
  format!: DsfExportFormat;
}

export class DsfReportingExportStatusQueryDto {
  @IsUUID()
  exportId!: string;
}

export class DsfReportingExportDownloadQueryDto {
  @IsString()
  token!: string;
}
