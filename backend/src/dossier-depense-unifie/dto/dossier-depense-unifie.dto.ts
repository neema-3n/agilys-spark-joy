import { Type } from 'class-transformer';
import { IsIn, IsISO8601, IsOptional, IsString } from 'class-validator';

export const DOSSIER_DEPENSE_UNIFIE_DETAIL_LEVELS = ['standard', 'full'] as const;
export const DOSSIER_DEPENSE_UNIFIE_EXPORT_FORMATS = ['pdf', 'zip'] as const;

export type DossierDepenseUnifieDetailLevel = (typeof DOSSIER_DEPENSE_UNIFIE_DETAIL_LEVELS)[number];
export type DossierDepenseUnifieExportFormat = (typeof DOSSIER_DEPENSE_UNIFIE_EXPORT_FORMATS)[number];

export class DossierDepenseUnifieQueryDto {
  @IsOptional()
  @IsString()
  exerciceId?: string;

  @IsOptional()
  @IsISO8601()
  @Type(() => String)
  dateDebut?: string;

  @IsOptional()
  @IsISO8601()
  @Type(() => String)
  dateFin?: string;

  @IsOptional()
  @IsIn(DOSSIER_DEPENSE_UNIFIE_DETAIL_LEVELS)
  detailLevel?: DossierDepenseUnifieDetailLevel;
}

export class DossierDepenseUnifieExportQueryDto extends DossierDepenseUnifieQueryDto {
  @IsIn(DOSSIER_DEPENSE_UNIFIE_EXPORT_FORMATS)
  format!: DossierDepenseUnifieExportFormat;
}
