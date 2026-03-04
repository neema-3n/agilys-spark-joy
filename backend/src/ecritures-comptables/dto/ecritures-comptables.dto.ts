import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class EcrituresComptablesQueryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  exerciceId?: string;

  @IsOptional()
  @IsString()
  dateDebut?: string;

  @IsOptional()
  @IsString()
  dateFin?: string;

  @IsOptional()
  @IsIn(['reservation', 'engagement', 'bon_commande', 'facture', 'depense', 'paiement'])
  typeOperation?: 'reservation' | 'engagement' | 'bon_commande' | 'facture' | 'depense' | 'paiement';

  @IsOptional()
  @IsString()
  numeroPiece?: string;

  @IsOptional()
  @IsUUID()
  compteId?: string;
}

export class EcrituresComptablesSourceQueryDto {
  @IsIn(['reservation', 'engagement', 'bon_commande', 'facture', 'depense', 'paiement'])
  typeOperation!: 'reservation' | 'engagement' | 'bon_commande' | 'facture' | 'depense' | 'paiement';

  @IsUUID()
  sourceId!: string;
}

export class GenerateEcrituresDto {
  @IsIn(['reservation', 'engagement', 'bon_commande', 'facture', 'depense', 'paiement'])
  typeOperation!: 'reservation' | 'engagement' | 'bon_commande' | 'facture' | 'depense' | 'paiement';

  @IsUUID()
  sourceId!: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsString()
  @IsNotEmpty()
  exerciceId!: string;
}
