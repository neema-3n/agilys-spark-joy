import type { TypeOperation } from './regle-comptable.types';

export type StatutEcriture = 'validee' | 'contrepassation';
export type GenerationEcrituresStatus = 'created' | 'already_generated' | 'error';

export interface GenerationEcrituresResult {
  success: boolean;
  status: GenerationEcrituresStatus;
  code?: string;
  message?: string;
  ecrituresCount: number;
}

export interface EcritureComptable {
  id: string;
  clientId: string;
  exerciceId: string;
  numeroPiece: string;
  numeroLigne: number;
  dateEcriture: string;
  compteDebitId: string;
  compteCreditId: string;
  montant: number;
  libelle: string;
  typeOperation: TypeOperation;
  sourceId: string;
  regleComptableId?: string;
  statutEcriture: StatutEcriture;
  ecritureOrigineId?: string;
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
  
  // Relations
  compteDebit?: {
    numero: string;
    libelle: string;
  };
  compteCredit?: {
    numero: string;
    libelle: string;
  };
  regleComptable?: {
    code: string;
    nom: string;
    versionGroupId?: string;
    versionNumber?: number;
    versionStatus?: 'draft' | 'published' | 'archived';
    dateDebut?: string;
    dateFin?: string;
  };
}

export interface EcrituresStats {
  nombreTotal: number;
  montantTotalDebit: number;
  montantTotalCredit: number;
  parTypeOperation: Record<TypeOperation, { nombre: number; montant: number }>;
}

export interface EcrituresFilters {
  dateDebut?: string;
  dateFin?: string;
  typeOperation?: TypeOperation;
  numeroPiece?: string;
  compteId?: string;
}
