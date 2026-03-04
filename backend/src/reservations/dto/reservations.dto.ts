import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class ReservationsQueryDto {
  @IsString()
  @IsNotEmpty()
  exerciceId!: string;
}

export class CreateReservationDto {
  @IsString()
  @IsNotEmpty()
  exerciceId!: string;

  @IsUUID()
  ligneBudgetaireId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montant!: number;

  @IsString()
  @IsNotEmpty()
  objet!: string;

  @IsOptional()
  @IsString()
  beneficiaire?: string;

  @IsOptional()
  @IsUUID()
  projetId?: string;

  @IsOptional()
  @IsString()
  dateExpiration?: string;
}

export class UpdateReservationDto {
  @IsOptional()
  @IsUUID()
  ligneBudgetaireId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montant?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  objet?: string;

  @IsOptional()
  @IsString()
  beneficiaire?: string | null;

  @IsOptional()
  @IsUUID()
  projetId?: string | null;

  @IsOptional()
  @IsString()
  dateExpiration?: string | null;
}

export class AnnulerReservationDto {
  @IsString()
  @IsNotEmpty()
  motifAnnulation!: string;
}
