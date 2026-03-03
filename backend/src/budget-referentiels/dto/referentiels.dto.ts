import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min
} from 'class-validator';

const CODE_MAX = 32;
const LABEL_MAX = 120;

export class ExerciceCreateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(LABEL_MAX)
  libelle!: string;

  @IsOptional()
  @IsString()
  @MaxLength(CODE_MAX)
  code?: string;

  @IsDateString()
  dateDebut!: string;

  @IsDateString()
  dateFin!: string;

  @IsIn(['ouvert', 'cloture'])
  statut!: 'ouvert' | 'cloture';
}

export class ExerciceUpdateDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(LABEL_MAX)
  libelle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(CODE_MAX)
  code?: string;

  @IsOptional()
  @IsDateString()
  dateDebut?: string;

  @IsOptional()
  @IsDateString()
  dateFin?: string;

  @IsOptional()
  @IsIn(['ouvert', 'cloture'])
  statut?: 'ouvert' | 'cloture';
}

export class EnveloppeCreateDto {
  @IsString()
  @IsNotEmpty()
  exerciceId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(CODE_MAX)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(LABEL_MAX)
  nom!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(LABEL_MAX)
  sourceFinancement!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montantAlloue!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montantConsomme!: number;

  @IsIn(['actif', 'cloture'])
  statut!: 'actif' | 'cloture';
}

export class EnveloppeUpdateDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(CODE_MAX)
  code?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(LABEL_MAX)
  nom?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(LABEL_MAX)
  sourceFinancement?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montantAlloue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montantConsomme?: number;

  @IsOptional()
  @IsIn(['actif', 'cloture'])
  statut?: 'actif' | 'cloture';
}

export class SectionCreateDto {
  @IsString()
  @IsNotEmpty()
  exerciceId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(CODE_MAX)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(LABEL_MAX)
  libelle!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  ordre!: number;

  @IsIn(['actif', 'archive'])
  statut!: 'actif' | 'archive';
}

export class SectionUpdateDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(CODE_MAX)
  code?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(LABEL_MAX)
  libelle?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ordre?: number;

  @IsOptional()
  @IsIn(['actif', 'archive'])
  statut?: 'actif' | 'archive';
}

export class ProgrammeCreateDto {
  @IsString()
  @IsNotEmpty()
  exerciceId!: string;

  @IsString()
  @IsNotEmpty()
  sectionId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(CODE_MAX)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(LABEL_MAX)
  libelle!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  ordre!: number;

  @IsIn(['actif', 'archive'])
  statut!: 'actif' | 'archive';
}

export class ProgrammeUpdateDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  sectionId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(CODE_MAX)
  code?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(LABEL_MAX)
  libelle?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ordre?: number;

  @IsOptional()
  @IsIn(['actif', 'archive'])
  statut?: 'actif' | 'archive';
}

export class ActionCreateDto {
  @IsString()
  @IsNotEmpty()
  exerciceId!: string;

  @IsString()
  @IsNotEmpty()
  programmeId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(CODE_MAX)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(LABEL_MAX)
  libelle!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  ordre!: number;

  @IsIn(['actif', 'archive'])
  statut!: 'actif' | 'archive';
}

export class ActionUpdateDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  programmeId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(CODE_MAX)
  code?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(LABEL_MAX)
  libelle?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ordre?: number;

  @IsOptional()
  @IsIn(['actif', 'archive'])
  statut?: 'actif' | 'archive';
}

export class ExerciceScopedQueryDto {
  @IsString()
  @IsNotEmpty()
  exerciceId!: string;
}

export class AllocationCreateDto {
  @IsString()
  @IsNotEmpty()
  exerciceId!: string;

  @IsString()
  @IsNotEmpty()
  @IsUUID('4', { message: 'Axe destination invalide: identifiant axe attendu au format UUID' })
  destinationAxeId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  montant!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(280)
  motif!: string;
}

export class ReallocationCreateDto {
  @IsString()
  @IsNotEmpty()
  exerciceId!: string;

  @IsString()
  @IsNotEmpty()
  @IsUUID('4', { message: 'Axe source invalide: identifiant axe attendu au format UUID' })
  sourceAxeId!: string;

  @IsString()
  @IsNotEmpty()
  @IsUUID('4', { message: 'Axe destination invalide: identifiant axe attendu au format UUID' })
  destinationAxeId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  montant!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(280)
  motif!: string;
}

export class AuditQueryDto {
  @IsOptional()
  @IsIn(['exercice', 'enveloppe', 'section', 'programme', 'action', 'allocation', 'ligne_budgetaire', 'decision_version'])
  entityType?:
    | 'exercice'
    | 'enveloppe'
    | 'section'
    | 'programme'
    | 'action'
    | 'allocation'
    | 'ligne_budgetaire'
    | 'decision_version';

  @IsOptional()
  @IsString()
  entityId?: string;
}

export class BudgetDecisionActionDto {
  @IsString()
  @IsNotEmpty()
  exerciceId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(280)
  motif!: string;
}

export class LigneBudgetaireCreateDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID('4')
  exerciceId!: string;

  @IsString()
  @IsNotEmpty()
  @IsUUID('4')
  actionId!: string;

  @IsString()
  @IsNotEmpty()
  compteId!: string;

  @IsOptional()
  @IsString()
  enveloppeId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(LABEL_MAX)
  libelle!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montantInitial!: number;

  @IsOptional()
  @IsIn(['actif', 'cloture'])
  statut?: 'actif' | 'cloture';
}

export class LigneBudgetaireUpdateDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @IsUUID('4')
  actionId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  compteId?: string;

  @IsOptional()
  @IsString()
  enveloppeId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(LABEL_MAX)
  libelle?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montantInitial?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montantModifie?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montantEngage?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montantLiquide?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  montantPaye?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  disponible?: number;

  @IsOptional()
  @IsIn(['actif', 'cloture'])
  statut?: 'actif' | 'cloture';
}

export class BudgetDecisionCompareQueryDto extends ExerciceScopedQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  leftVersion?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  rightVersion?: number;
}
