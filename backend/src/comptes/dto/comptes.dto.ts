import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

const COMPTE_VERSION_STATUSES = ['draft', 'published', 'archived'] as const;

export class CreateCompteDto {
  @IsString()
  @IsNotEmpty()
  numero!: string;

  @IsString()
  @IsNotEmpty()
  libelle!: string;

  @IsIn(['actif', 'passif', 'charge', 'produit', 'resultat'])
  type!: 'actif' | 'passif' | 'charge' | 'produit' | 'resultat';

  @IsIn(['immobilisation', 'stock', 'creance', 'tresorerie', 'dette', 'capital', 'exploitation', 'financier', 'exceptionnel', 'autre'])
  categorie!:
    | 'immobilisation'
    | 'stock'
    | 'creance'
    | 'tresorerie'
    | 'dette'
    | 'capital'
    | 'exploitation'
    | 'financier'
    | 'exceptionnel'
    | 'autre';

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  niveau?: number;

  @IsOptional()
  @IsIn(['actif', 'inactif'])
  statut?: 'actif' | 'inactif';

  @IsOptional()
  @IsIn(COMPTE_VERSION_STATUSES)
  versionStatus?: (typeof COMPTE_VERSION_STATUSES)[number];

  @IsOptional()
  @IsDateString()
  effectiveStartDate?: string;

  @IsOptional()
  @IsDateString()
  effectiveEndDate?: string;

  @IsOptional()
  @IsString()
  changeReason?: string;
}

export class UpdateCompteDto {
  @IsOptional()
  @IsString()
  numero?: string;

  @IsOptional()
  @IsString()
  libelle?: string;

  @IsOptional()
  @IsIn(['actif', 'passif', 'charge', 'produit', 'resultat'])
  type?: 'actif' | 'passif' | 'charge' | 'produit' | 'resultat';

  @IsOptional()
  @IsIn(['immobilisation', 'stock', 'creance', 'tresorerie', 'dette', 'capital', 'exploitation', 'financier', 'exceptionnel', 'autre'])
  categorie?:
    | 'immobilisation'
    | 'stock'
    | 'creance'
    | 'tresorerie'
    | 'dette'
    | 'capital'
    | 'exploitation'
    | 'financier'
    | 'exceptionnel'
    | 'autre';

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  niveau?: number;

  @IsOptional()
  @IsIn(['actif', 'inactif'])
  statut?: 'actif' | 'inactif';

  @IsOptional()
  @IsIn(COMPTE_VERSION_STATUSES)
  versionStatus?: (typeof COMPTE_VERSION_STATUSES)[number];

  @IsOptional()
  @IsDateString()
  effectiveStartDate?: string;

  @IsOptional()
  @IsDateString()
  effectiveEndDate?: string;

  @IsOptional()
  @IsString()
  changeReason?: string;
}

export class ImportComptesCsvDto {
  @IsString()
  @IsNotEmpty()
  csv!: string;

  @IsOptional()
  @IsBoolean()
  skipDuplicates?: boolean;
}
