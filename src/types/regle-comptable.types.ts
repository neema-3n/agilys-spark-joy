export type TypeOperation = 
  | 'reservation' 
  | 'engagement' 
  | 'bon_commande' 
  | 'facture' 
  | 'depense' 
  | 'paiement';

export type PointComptable = 'constatation' | 'reglement';
export type RoleLigneComptable = 'charge_principale' | 'ventilation' | 'reglement_tresorerie';
export type SourceMontantComptable = 'montant_ht' | 'montant_ttc' | 'montant_net_paye' | 'ventilation_montant';
export type SourceCompteComptable = 'compte_fixe' | 'charge_principale';
export type SensVentilation = 'ajout' | 'retrait';
export type NatureVentilation = 'taxe' | 'retenue' | 'redevance' | 'frais' | 'autre';

export type OperateurCondition = 
  | '==' 
  | '!=' 
  | '>' 
  | '<' 
  | '>=' 
  | '<=' 
  | 'contient' 
  | 'commence_par';

export interface Condition {
  champ: string;
  operateur: OperateurCondition;
  valeur: string | number | boolean;
}

export interface RegleComptable {
  id: string;
  clientId: string;
  code: string;
  nom: string;
  description?: string;
  dateDebut?: string;
  dateFin?: string;
  permanente: boolean;
  typeOperation: TypeOperation;
  pointComptable: PointComptable;
  roleLigne: RoleLigneComptable;
  sourceMontant: SourceMontantComptable;
  debitSource: SourceCompteComptable;
  creditSource: SourceCompteComptable;
  sensVentilation?: SensVentilation;
  natureVentilation?: NatureVentilation;
  conditions: Condition[];
  compteDebitId?: string;
  compteCreditId?: string;
  actif: boolean;
  ordre: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  
  // Relations jointes
  compteDebit?: {
    numero: string;
    libelle: string;
  };
  compteCredit?: {
    numero: string;
    libelle: string;
  };
}

export interface CreateRegleComptableInput {
  clientId: string;
  code: string;
  nom: string;
  description?: string;
  dateDebut?: string;
  dateFin?: string;
  permanente: boolean;
  typeOperation: TypeOperation;
  pointComptable: PointComptable;
  roleLigne: RoleLigneComptable;
  sourceMontant: SourceMontantComptable;
  debitSource: SourceCompteComptable;
  creditSource: SourceCompteComptable;
  sensVentilation?: SensVentilation;
  natureVentilation?: NatureVentilation;
  conditions: Condition[];
  compteDebitId?: string;
  compteCreditId?: string;
  actif?: boolean;
  ordre?: number;
}

export interface UpdateRegleComptableInput {
  nom?: string;
  description?: string;
  dateDebut?: string;
  dateFin?: string;
  permanente?: boolean;
  pointComptable?: PointComptable;
  roleLigne?: RoleLigneComptable;
  sourceMontant?: SourceMontantComptable;
  debitSource?: SourceCompteComptable;
  creditSource?: SourceCompteComptable;
  sensVentilation?: SensVentilation;
  natureVentilation?: NatureVentilation;
  conditions?: Condition[];
  compteDebitId?: string;
  compteCreditId?: string;
  actif?: boolean;
  ordre?: number;
}
