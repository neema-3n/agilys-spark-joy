import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min
} from 'class-validator';

export class OperationsTresorerieQueryDto {
  @IsString()
  @IsNotEmpty()
  exerciceId!: string;
}

export class CreateOperationTresorerieDto {
  @IsString()
  @IsNotEmpty()
  exerciceId!: string;

  @IsString()
  @IsNotEmpty()
  dateOperation!: string;

  @IsIn(['encaissement', 'decaissement', 'transfert'])
  typeOperation!: 'encaissement' | 'decaissement' | 'transfert';

  @IsUUID()
  compteId!: string;

  @IsOptional()
  @IsUUID()
  compteContrepartieId?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montant!: number;

  @IsOptional()
  @IsString()
  modePaiement?: string;

  @IsOptional()
  @IsString()
  referenceBancaire?: string;

  @IsString()
  @IsNotEmpty()
  libelle!: string;

  @IsOptional()
  @IsString()
  categorie?: string;

  @IsOptional()
  @IsString()
  observations?: string;
}

export class RapprocherOperationsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  operationIds!: string[];
}
