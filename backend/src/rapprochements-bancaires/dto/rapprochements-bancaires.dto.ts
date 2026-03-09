import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  ECART_CATEGORIES,
  RAPPROCHEMENT_DECISION_ACTIONS,
} from '../rapprochement-matching.util';

export class RapprochementsBancairesQueryDto {
  @IsString()
  @IsNotEmpty()
  exerciceId!: string;
}

export class CreateRapprochementBancaireDto {
  @IsString()
  @IsNotEmpty()
  exerciceId!: string;

  @IsUUID()
  compteId!: string;

  @IsDateString()
  dateDebut!: string;

  @IsDateString()
  dateFin!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  soldeReleve!: number;

  @IsOptional()
  @IsString()
  observations?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StatementLineDto)
  statementLines!: StatementLineDto[];
}

export class StatementLineDto {
  @IsDateString()
  dateOperation!: string;

  @IsString()
  @IsNotEmpty()
  libelle!: string;

  @IsOptional()
  @IsString()
  referenceBancaire?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  montant!: number;

  @IsIn(['encaissement', 'decaissement'])
  typeFlux!: 'encaissement' | 'decaissement';
}

export class ManualRapprochementDecisionDto {
  @IsUUID()
  lineId!: string;

  @IsIn(RAPPROCHEMENT_DECISION_ACTIONS)
  action!: (typeof RAPPROCHEMENT_DECISION_ACTIONS)[number];

  @IsOptional()
  @IsUUID()
  candidateId?: string;

  @IsString()
  @IsNotEmpty()
  justification!: string;

  @IsOptional()
  @IsIn(ECART_CATEGORIES)
  category?: (typeof ECART_CATEGORIES)[number];
}
