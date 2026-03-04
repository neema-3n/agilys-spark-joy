import { Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

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
  @Min(0)
  montant!: number;

  @IsString()
  @IsNotEmpty()
  datePaiement!: string;

  @IsIn(['virement', 'cheque', 'especes', 'carte', 'autre'])
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
}
