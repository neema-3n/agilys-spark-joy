import { Type } from 'class-transformer';
import { IsArray, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class DepensesQueryDto {
  @IsString()
  @IsNotEmpty()
  exerciceId!: string;
}

export class CreateDepenseDto {
  @IsString()
  @IsNotEmpty()
  exerciceId!: string;

  @IsOptional()
  @IsUUID()
  engagementId?: string;

  @IsOptional()
  @IsUUID()
  reservationCreditId?: string;

  @IsOptional()
  @IsUUID()
  ligneBudgetaireId?: string;

  @IsOptional()
  @IsUUID()
  factureId?: string;

  @IsOptional()
  @IsUUID()
  fournisseurId?: string;

  @IsOptional()
  @IsString()
  beneficiaire?: string;

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
  dateDepense!: string;

  @IsOptional()
  @IsString()
  modePaiement?: string;

  @IsOptional()
  @IsString()
  referencePaiement?: string;

  @IsOptional()
  @IsString()
  observations?: string;
}

export class UpdateDepenseDto {
  @IsOptional()
  @IsUUID()
  engagementId?: string | null;

  @IsOptional()
  @IsUUID()
  reservationCreditId?: string | null;

  @IsOptional()
  @IsUUID()
  ligneBudgetaireId?: string | null;

  @IsOptional()
  @IsUUID()
  factureId?: string | null;

  @IsOptional()
  @IsUUID()
  fournisseurId?: string | null;

  @IsOptional()
  @IsString()
  beneficiaire?: string | null;

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
  @IsString()
  dateDepense?: string;

  @IsOptional()
  @IsString()
  modePaiement?: string | null;

  @IsOptional()
  @IsString()
  referencePaiement?: string | null;

  @IsOptional()
  @IsString()
  observations?: string | null;
}

export class AnnulerDepenseDto {
  @IsString()
  @IsNotEmpty()
  motif!: string;
}

export class MarquerPayeeDto {
  @IsString()
  @IsNotEmpty()
  datePaiement!: string;

  @IsIn(['virement', 'cheque', 'especes', 'carte', 'autre'])
  modePaiement!: 'virement' | 'cheque' | 'especes' | 'carte' | 'autre';

  @IsOptional()
  @IsString()
  referencePaiement?: string;
}

export class PaiementsValidesMultipleDepensesDto {
  @IsArray()
  @IsUUID('4', { each: true })
  depenseIds!: string[];
}

export class CreateDepenseFromFactureDto {
  @IsString()
  @IsNotEmpty()
  exerciceId!: string;

  @IsUUID()
  factureId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montant!: number;

  @IsString()
  @IsNotEmpty()
  dateDepense!: string;

  @IsOptional()
  @IsString()
  modePaiement?: string;

  @IsOptional()
  @IsString()
  referencePaiement?: string;

  @IsOptional()
  @IsString()
  observations?: string;
}

export class CreateDepenseFromEngagementDto {
  @IsString()
  @IsNotEmpty()
  exerciceId!: string;

  @IsUUID()
  engagementId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montant!: number;

  @IsString()
  @IsNotEmpty()
  dateDepense!: string;

  @IsOptional()
  @IsString()
  modePaiement?: string;

  @IsOptional()
  @IsString()
  referencePaiement?: string;

  @IsOptional()
  @IsString()
  observations?: string;
}

export class CreateDepenseFromReservationDto {
  @IsString()
  @IsNotEmpty()
  exerciceId!: string;

  @IsUUID()
  reservationCreditId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montant!: number;

  @IsString()
  @IsNotEmpty()
  objet!: string;

  @IsString()
  @IsNotEmpty()
  dateDepense!: string;

  @IsOptional()
  @IsString()
  beneficiaire?: string;

  @IsOptional()
  @IsString()
  modePaiement?: string;

  @IsOptional()
  @IsString()
  referencePaiement?: string;

  @IsOptional()
  @IsString()
  observations?: string;

  @IsString()
  @IsNotEmpty()
  justificationUrgence!: string;
}
