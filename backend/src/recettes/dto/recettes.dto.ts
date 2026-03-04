import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class RecettesQueryDto {
  @IsString()
  @IsNotEmpty()
  exerciceId!: string;
}

export class CreateRecetteDto {
  @IsString()
  @IsNotEmpty()
  exerciceId!: string;

  @IsString()
  @IsNotEmpty()
  dateRecette!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montant!: number;

  @IsUUID()
  compteDestinationId!: string;

  @IsString()
  @IsNotEmpty()
  sourceRecette!: string;

  @IsOptional()
  @IsString()
  categorie?: string;

  @IsOptional()
  @IsString()
  beneficiaire?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsString()
  @IsNotEmpty()
  libelle!: string;

  @IsOptional()
  @IsString()
  observations?: string;
}

export class UpdateRecetteDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  dateRecette?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montant?: number;

  @IsOptional()
  @IsUUID()
  compteDestinationId?: string;

  @IsOptional()
  @IsString()
  sourceRecette?: string;

  @IsOptional()
  @IsString()
  categorie?: string;

  @IsOptional()
  @IsString()
  beneficiaire?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  libelle?: string;

  @IsOptional()
  @IsString()
  observations?: string;
}

export class AnnulerRecetteDto {
  @IsString()
  @IsNotEmpty()
  motif!: string;
}
