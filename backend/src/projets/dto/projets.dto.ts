import { Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min
} from 'class-validator';

export class ProjetsQueryDto {
  @IsString()
  @IsNotEmpty()
  exerciceId!: string;
}

export class CreateProjetDto {
  @IsString()
  @IsNotEmpty()
  exerciceId!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  nom!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  responsable?: string;

  @IsString()
  @IsNotEmpty()
  dateDebut!: string;

  @IsString()
  @IsNotEmpty()
  dateFin!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budgetAlloue!: number;

  @IsOptional()
  @IsUUID()
  enveloppeId?: string;

  @IsIn(['planifie', 'en_cours', 'en_attente', 'termine', 'annule'])
  statut!: 'planifie' | 'en_cours' | 'en_attente' | 'termine' | 'annule';

  @IsOptional()
  @IsString()
  typeProjet?: string;

  @IsOptional()
  @IsIn(['haute', 'moyenne', 'basse'])
  priorite?: 'haute' | 'moyenne' | 'basse';

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  tauxAvancement!: number;
}

export class UpdateProjetDto {
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
  @IsString()
  responsable?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  dateDebut?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  dateFin?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budgetAlloue?: number;

  @IsOptional()
  @IsUUID()
  enveloppeId?: string;

  @IsOptional()
  @IsIn(['planifie', 'en_cours', 'en_attente', 'termine', 'annule'])
  statut?: 'planifie' | 'en_cours' | 'en_attente' | 'termine' | 'annule';

  @IsOptional()
  @IsString()
  typeProjet?: string;

  @IsOptional()
  @IsIn(['haute', 'moyenne', 'basse'])
  priorite?: 'haute' | 'moyenne' | 'basse';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  tauxAvancement?: number;
}

export class UpdateTauxAvancementDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  taux!: number;
}
