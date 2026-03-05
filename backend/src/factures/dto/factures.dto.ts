import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min
} from 'class-validator';

export class FacturesQueryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  exerciceId?: string;
}

export class FacturesPaginatedQueryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  exerciceId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  page!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize!: number;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @IsIn(['brouillon', 'validee', 'payee', 'annulee'])
  statut?: 'brouillon' | 'validee' | 'payee' | 'annulee';

  @IsOptional()
  @IsString()
  searchTerm?: string;

  @IsOptional()
  @IsUUID()
  fournisseurId?: string;

  @IsOptional()
  @IsString()
  dateDebut?: string;

  @IsOptional()
  @IsString()
  dateFin?: string;
}

export class CreateFactureDto {
  @IsString()
  @IsNotEmpty()
  exerciceId!: string;

  @IsUUID()
  fournisseurId!: string;

  @IsOptional()
  @IsUUID()
  bonCommandeId?: string;

  @IsOptional()
  @IsUUID()
  engagementId?: string;

  @IsOptional()
  @IsUUID()
  ligneBudgetaireId?: string;

  @IsOptional()
  @IsUUID()
  projetId?: string;

  @IsString()
  @IsNotEmpty()
  objet!: string;

  @IsString()
  @IsNotEmpty()
  dateFacture!: string;

  @IsOptional()
  @IsString()
  dateEcheance?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montantHT!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montantTVA!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montantTTC!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montantLiquide?: number;

  @IsString()
  @IsNotEmpty()
  numeroFactureFournisseur!: string;

  @IsString()
  @IsNotEmpty()
  referencePiece!: string;

  @IsOptional()
  @IsString()
  observations?: string;

  @IsOptional()
  @IsString()
  numero?: string;
}

export class UpdateFactureDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  dateFacture?: string;

  @IsOptional()
  @IsString()
  dateEcheance?: string | null;

  @IsOptional()
  @IsUUID()
  fournisseurId?: string;

  @IsOptional()
  @IsUUID()
  bonCommandeId?: string | null;

  @IsOptional()
  @IsUUID()
  engagementId?: string | null;

  @IsOptional()
  @IsUUID()
  ligneBudgetaireId?: string | null;

  @IsOptional()
  @IsUUID()
  projetId?: string | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  objet?: string;

  @IsOptional()
  @IsString()
  numeroFactureFournisseur?: string | null;

  @IsOptional()
  @IsString()
  referencePiece?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montantHT?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montantTVA?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montantTTC?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montantLiquide?: number;

  @IsOptional()
  @IsIn(['brouillon', 'validee', 'payee', 'annulee'])
  statut?: 'brouillon' | 'validee' | 'payee' | 'annulee';

  @IsOptional()
  @IsString()
  dateValidation?: string | null;

  @IsOptional()
  @IsString()
  observations?: string | null;
}

export class AnnulerFactureDto {
  @IsString()
  @IsNotEmpty()
  motif!: string;
}

export class GenererNumeroFactureQueryDto {
  @IsString()
  @IsNotEmpty()
  exerciceId!: string;
}

export class GenerateTestFacturesDto {
  @IsString()
  @IsNotEmpty()
  exerciceId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  count!: number;
}
