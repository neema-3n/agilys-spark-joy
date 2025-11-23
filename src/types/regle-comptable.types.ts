export type TypeOperation = 
  | 'reservation' 
  | 'engagement' 
  | 'bon_commande' 
  | 'facture' 
  | 'depense' 
  | 'paiement';

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
  conditions: Condition[];
  compteDebitId: string;
  compteCreditId: string;
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
  conditions: Condition[];
  compteDebitId: string;
  compteCreditId: string;
  actif?: boolean;
  ordre?: number;
}

export interface UpdateRegleComptableInput {
  nom?: string;
  description?: string;
  dateDebut?: string;
  dateFin?: string;
  permanente?: boolean;
  conditions?: Condition[];
  compteDebitId?: string;
  compteCreditId?: string;
  actif?: boolean;
  ordre?: number;
}
