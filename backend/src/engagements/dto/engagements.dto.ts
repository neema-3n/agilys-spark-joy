import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class EngagementsQueryDto {
  @IsString()
  @IsNotEmpty()
  exerciceId!: string;
}

export class CreateEngagementDto {
  @IsString()
  @IsNotEmpty()
  exerciceId!: string;

  @IsOptional()
  @IsUUID()
  reservationCreditId?: string;

  @IsUUID()
  ligneBudgetaireId!: string;

  @IsString()
  @IsNotEmpty()
  objet!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montant!: number;

  @IsOptional()
  @IsUUID()
  fournisseurId?: string;

  @IsOptional()
  @IsString()
  beneficiaire?: string;

  @IsOptional()
  @IsUUID()
  projetId?: string;

  @IsOptional()
  @IsString()
  observations?: string;
}

export class UpdateEngagementDto {
  @IsOptional()
  @IsUUID()
  reservationCreditId?: string | null;

  @IsOptional()
  @IsUUID()
  ligneBudgetaireId?: string;

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
  observations?: string | null;
}

export class AnnulerEngagementDto {
  @IsString()
  @IsNotEmpty()
  motifAnnulation!: string;
}

export class CreateEngagementFromReservationDto {
  @IsString()
  @IsNotEmpty()
  exerciceId!: string;

  @IsUUID()
  reservationId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montant?: number;

  @IsOptional()
  @IsUUID()
  ligneBudgetaireId?: string;

  @IsOptional()
  @IsString()
  objet?: string;

  @IsOptional()
  @IsUUID()
  fournisseurId?: string;

  @IsOptional()
  @IsString()
  beneficiaire?: string;

  @IsOptional()
  @IsUUID()
  projetId?: string;

  @IsOptional()
  @IsString()
  observations?: string;
}
