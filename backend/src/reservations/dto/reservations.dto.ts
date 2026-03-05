import { Type } from 'class-transformer';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class ReservationsQueryDto {
  @IsUUID()
  exerciceId!: string;
}

export class CreateReservationDto {
  @IsUUID()
  exerciceId!: string;

  @IsUUID()
  ligneBudgetaireId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
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
  @IsDateString()
  dateExpiration?: string;
}

export class UpdateReservationDto {
  @IsOptional()
  @IsUUID()
  ligneBudgetaireId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
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
  @IsDateString()
  dateExpiration?: string | null;
}

export class AnnulerReservationDto {
  @IsString()
  @IsNotEmpty()
  motifAnnulation!: string;
}
