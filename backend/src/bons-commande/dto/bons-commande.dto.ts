import { Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class BonsCommandeQueryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  exerciceId?: string;
}

export class CreateBonCommandeDto {
  @IsString()
  @IsNotEmpty()
  exerciceId!: string;

  @IsUUID()
  fournisseurId!: string;

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

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montant!: number;

  @IsString()
  @IsNotEmpty()
  dateCommande!: string;

  @IsOptional()
  @IsString()
  dateLivraisonPrevue?: string;

  @IsOptional()
  @IsString()
  conditionsLivraison?: string;

  @IsOptional()
  @IsString()
  observations?: string;

  @IsOptional()
  @IsString()
  numero?: string;
}

export class UpdateBonCommandeDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  dateCommande?: string;

  @IsOptional()
  @IsUUID()
  fournisseurId?: string;

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
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montant?: number;

  @IsOptional()
  @IsIn(['brouillon', 'valide', 'en_cours', 'receptionne', 'facture', 'annule'])
  statut?: 'brouillon' | 'valide' | 'en_cours' | 'receptionne' | 'facture' | 'annule';

  @IsOptional()
  @IsString()
  dateValidation?: string | null;

  @IsOptional()
  @IsString()
  dateLivraisonPrevue?: string | null;

  @IsOptional()
  @IsString()
  dateLivraisonReelle?: string | null;

  @IsOptional()
  @IsString()
  conditionsLivraison?: string | null;

  @IsOptional()
  @IsString()
  observations?: string | null;
}

export class AnnulerBonCommandeDto {
  @IsString()
  @IsNotEmpty()
  motif!: string;
}

export class ReceptionnerBonCommandeDto {
  @IsString()
  @IsNotEmpty()
  dateLivraisonReelle!: string;
}

export class GenererNumeroBonCommandeQueryDto {
  @IsString()
  @IsNotEmpty()
  exerciceId!: string;
}
