import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ReferentielsQueryDto {
  @IsIn([
    'compte_type',
    'compte_categorie',
    'structure_type',
    'source_financement',
    'statut_general',
    'type_projet',
    'statut_projet',
    'priorite_projet'
  ])
  categorie!:
    | 'compte_type'
    | 'compte_categorie'
    | 'structure_type'
    | 'source_financement'
    | 'statut_general'
    | 'type_projet'
    | 'statut_projet'
    | 'priorite_projet';

  @IsOptional()
  @IsIn(['true', 'false'])
  actifOnly?: 'true' | 'false';
}

export class CreateReferentielDto {
  @IsIn([
    'compte_type',
    'compte_categorie',
    'structure_type',
    'source_financement',
    'statut_general',
    'type_projet',
    'statut_projet',
    'priorite_projet'
  ])
  categorie!:
    | 'compte_type'
    | 'compte_categorie'
    | 'structure_type'
    | 'source_financement'
    | 'statut_general'
    | 'type_projet'
    | 'statut_projet'
    | 'priorite_projet';

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  libelle!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  ordre!: number;

  @IsBoolean()
  actif!: boolean;

  @IsBoolean()
  modifiable!: boolean;
}

export class UpdateReferentielDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  libelle?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  ordre?: number;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;

  @IsOptional()
  @IsBoolean()
  modifiable?: boolean;
}

export class ReorderReferentielsDto {
  @IsIn([
    'compte_type',
    'compte_categorie',
    'structure_type',
    'source_financement',
    'statut_general',
    'type_projet',
    'statut_projet',
    'priorite_projet'
  ])
  categorie!:
    | 'compte_type'
    | 'compte_categorie'
    | 'structure_type'
    | 'source_financement'
    | 'statut_general'
    | 'type_projet'
    | 'statut_projet'
    | 'priorite_projet';

  @IsString({ each: true })
  orderedIds!: string[];
}
