import { Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateCompteTresorerieDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  libelle!: string;

  @IsIn(['banque', 'caisse'])
  type!: 'banque' | 'caisse';

  @IsOptional()
  @IsString()
  banque?: string;

  @IsOptional()
  @IsString()
  numeroCompte?: string;

  @IsOptional()
  @IsString()
  devise?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  soldeInitial!: number;

  @IsString()
  @IsNotEmpty()
  dateOuverture!: string;

  @IsOptional()
  @IsString()
  observations?: string;

  @IsOptional()
  @IsIn(['actif', 'inactif', 'cloture'])
  statut?: 'actif' | 'inactif' | 'cloture';
}

export class UpdateCompteTresorerieDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  libelle?: string;

  @IsOptional()
  @IsIn(['banque', 'caisse'])
  type?: 'banque' | 'caisse';

  @IsOptional()
  @IsString()
  banque?: string;

  @IsOptional()
  @IsString()
  numeroCompte?: string;

  @IsOptional()
  @IsString()
  devise?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  soldeInitial?: number;

  @IsOptional()
  @IsString()
  dateOuverture?: string;

  @IsOptional()
  @IsString()
  observations?: string;

  @IsOptional()
  @IsIn(['actif', 'inactif', 'cloture'])
  statut?: 'actif' | 'inactif' | 'cloture';

  @IsOptional()
  @IsString()
  dateCloture?: string;
}
