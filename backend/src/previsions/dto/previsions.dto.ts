import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  Matches,
  IsString,
  IsUUID,
  Max,
  Min
} from 'class-validator';

export class CreateScenarioDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  nom!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(['optimiste', 'pessimiste', 'realiste', 'personnalise'])
  typeScenario!: 'optimiste' | 'pessimiste' | 'realiste' | 'personnalise';

  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  anneeReference!: number;

  @IsOptional()
  @IsUUID()
  exerciceReferenceId?: string;

  @IsOptional()
  @IsIn(['brouillon', 'valide', 'archive'])
  statut?: 'brouillon' | 'valide' | 'archive';

  @IsOptional()
  @IsString()
  createdBy?: string;
}

export class UpdateScenarioDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  code?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nom?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['optimiste', 'pessimiste', 'realiste', 'personnalise'])
  typeScenario?: 'optimiste' | 'pessimiste' | 'realiste' | 'personnalise';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  anneeReference?: number;

  @IsOptional()
  @IsUUID()
  exerciceReferenceId?: string;

  @IsOptional()
  @IsIn(['brouillon', 'valide', 'archive'])
  statut?: 'brouillon' | 'valide' | 'archive';
}

export class DupliquerScenarioDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  nom!: string;
}

export class LignesPrevisionQueryDto {
  @IsUUID()
  scenarioId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  annee?: number;
}

export class CreateLignePrevisionDto {
  @IsUUID()
  scenarioId!: string;

  @Type(() => Number)
  @IsInt()
  annee!: number;

  @IsOptional()
  @IsString()
  sectionCode?: string;

  @IsOptional()
  @IsString()
  programmeCode?: string;

  @IsOptional()
  @IsString()
  actionCode?: string;

  @IsOptional()
  @IsString()
  compteNumero?: string;

  @IsOptional()
  @IsUUID()
  enveloppeId?: string;

  @IsString()
  @IsNotEmpty()
  libelle!: string;

  @Type(() => Number)
  @IsNumber()
  montantPrevu!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tauxCroissance?: number;

  @IsOptional()
  @IsString()
  hypotheses?: string;
}

export class UpdateLignePrevisionDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  annee?: number;

  @IsOptional()
  @IsString()
  sectionCode?: string;

  @IsOptional()
  @IsString()
  programmeCode?: string;

  @IsOptional()
  @IsString()
  actionCode?: string;

  @IsOptional()
  @IsString()
  compteNumero?: string;

  @IsOptional()
  @IsUUID()
  enveloppeId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  libelle?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  montantPrevu?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tauxCroissance?: number;

  @IsOptional()
  @IsString()
  hypotheses?: string;
}

export class GenererPrevisionsDto {
  @IsUUID()
  scenarioId!: string;

  @IsUUID()
  exerciceReferenceId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  nombreAnnees!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tauxCroissanceGlobal?: number;

  @IsOptional()
  @IsObject()
  tauxParSection?: Record<string, number>;

  @IsOptional()
  @IsBoolean()
  inclureInflation?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tauxInflation?: number;
}

export class EcartsPrevisionQueryDto {
  @IsUUID()
  exerciceId!: string;

  @IsOptional()
  @Matches(/^\d{4}$/, {
    message: 'La periode doit respecter le format AAAA (ex: 2026)'
  })
  periode?: string;

  @IsOptional()
  @IsString()
  sectionCode?: string;

  @IsOptional()
  @IsString()
  programmeCode?: string;

  @IsOptional()
  @IsString()
  actionCode?: string;

  @IsOptional()
  @IsUUID()
  enveloppeId?: string;
}

export class EcartAxeDto {
  @IsOptional()
  @IsString()
  sectionCode?: string;

  @IsOptional()
  @IsString()
  programmeCode?: string;

  @IsOptional()
  @IsString()
  actionCode?: string;

  @IsOptional()
  @IsUUID()
  enveloppeId?: string;
}

export class EcartPrevisionExecutionDto {
  @IsString()
  periode!: string;

  @IsObject()
  axe!: EcartAxeDto;

  @Type(() => Number)
  @IsNumber()
  montantPrevu!: number;

  @Type(() => Number)
  @IsNumber()
  montantExecute!: number;

  @Type(() => Number)
  @IsNumber()
  ecartMontant!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  ecartTaux?: number;
}

export class EcartsPrevisionResponseDto {
  @ArrayMaxSize(5000)
  items!: EcartPrevisionExecutionDto[];

  @IsObject()
  filtres!: EcartsPrevisionQueryDto;

  @IsObject()
  totaux!: {
    montantPrevu: number;
    montantExecute: number;
    ecartMontant: number;
    ecartTaux?: number;
    nombreAxes: number;
  };
}
