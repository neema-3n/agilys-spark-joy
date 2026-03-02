import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
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
  montantAlloue!: number;

  @Type(() => Number)
  @IsNumber()
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
  montantAlloue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
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

export class AuditQueryDto {
  @IsOptional()
  @IsIn(['exercice', 'enveloppe', 'section', 'programme', 'action'])
  entityType?: 'exercice' | 'enveloppe' | 'section' | 'programme' | 'action';

  @IsOptional()
  @IsString()
  entityId?: string;
}
