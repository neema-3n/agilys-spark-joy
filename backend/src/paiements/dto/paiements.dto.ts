import { Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { PAIEMENT_MODE_VALUES, PAIEMENT_STATUSES } from '../paiement-workflow';

export class PaiementsQueryDto {
  @IsString()
  @IsNotEmpty()
  exerciceId!: string;
}

export class CreatePaiementDto {
  @IsString()
  @IsNotEmpty()
  exerciceId!: string;

  @IsUUID()
  depenseId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  montant!: number;

  @IsString()
  @IsNotEmpty()
  datePaiement!: string;

  @IsIn(PAIEMENT_MODE_VALUES)
  modePaiement!: 'virement' | 'cheque' | 'especes' | 'carte' | 'autre';

  @IsOptional()
  @IsString()
  referencePaiement?: string;

  @IsOptional()
  @IsString()
  observations?: string;
}

export class AnnulerPaiementDto {
  @IsString()
  @IsNotEmpty()
  motif!: string;

  @IsOptional()
  @IsString()
  referenceRetour?: string;

  @IsOptional()
  @IsString()
  dateRetour?: string;
}

export class RejeterPaiementDto {
  @IsString()
  @IsNotEmpty()
  motif!: string;

  @IsOptional()
  @IsString()
  referenceRetour?: string;

  @IsOptional()
  @IsString()
  dateRetour?: string;
}

export class TransitionPaiementDto {
  @IsIn(PAIEMENT_STATUSES)
  statut!: (typeof PAIEMENT_STATUSES)[number];
}

export class ReprendrePaiementDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  montant?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  datePaiement?: string;

  @IsOptional()
  @IsIn(PAIEMENT_MODE_VALUES)
  modePaiement?: 'virement' | 'cheque' | 'especes' | 'carte' | 'autre';

  @IsOptional()
  @IsString()
  referencePaiement?: string;

  @IsOptional()
  @IsString()
  observations?: string;
}
