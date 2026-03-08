import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

const VERSION_STATUSES = ['draft', 'published', 'archived'] as const;

export class ReglesComptablesQueryDto {
  @IsOptional()
  @IsIn(['reservation', 'engagement', 'bon_commande', 'facture', 'depense', 'paiement'])
  typeOperation?: 'reservation' | 'engagement' | 'bon_commande' | 'facture' | 'depense' | 'paiement';
}

export class CreateRegleComptableDto {
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
  dateDebut?: string;

  @IsOptional()
  @IsString()
  dateFin?: string;

  @IsBoolean()
  permanente!: boolean;

  @IsIn(['reservation', 'engagement', 'bon_commande', 'facture', 'depense', 'paiement'])
  typeOperation!: 'reservation' | 'engagement' | 'bon_commande' | 'facture' | 'depense' | 'paiement';

  @IsArray()
  conditions!: Array<{ champ: string; operateur: string; valeur: string | number | boolean }>;

  @IsUUID()
  compteDebitId!: string;

  @IsUUID()
  compteCreditId!: string;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  ordre?: number;

  @IsOptional()
  @IsIn(VERSION_STATUSES)
  versionStatus?: (typeof VERSION_STATUSES)[number];

  @IsOptional()
  @IsString()
  changeReason?: string;
}

export class UpdateRegleComptableDto {
  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  dateDebut?: string;

  @IsOptional()
  @IsString()
  dateFin?: string;

  @IsOptional()
  @IsBoolean()
  permanente?: boolean;

  @IsOptional()
  @IsArray()
  conditions?: Array<{ champ: string; operateur: string; valeur: string | number | boolean }>;

  @IsOptional()
  @IsUUID()
  compteDebitId?: string;

  @IsOptional()
  @IsUUID()
  compteCreditId?: string;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  ordre?: number;

  @IsOptional()
  @IsIn(VERSION_STATUSES)
  versionStatus?: (typeof VERSION_STATUSES)[number];

  @IsOptional()
  @IsString()
  changeReason?: string;
}

export class ReorderReglesComptablesDto {
  @IsIn(['reservation', 'engagement', 'bon_commande', 'facture', 'depense', 'paiement'])
  typeOperation!: 'reservation' | 'engagement' | 'bon_commande' | 'facture' | 'depense' | 'paiement';

  @IsArray()
  @IsUUID('4', { each: true })
  orderedIds!: string[];
}
