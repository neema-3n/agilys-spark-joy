export type StatutRapprochement = 'en_cours' | 'valide' | 'annule';

export interface RapprochementBancaire {
  id: string;
  clientId: string;
  exerciceId: string;
  numero: string;
  compteId: string;
  dateDebut: string;
  dateFin: string;
  soldeReleve: number;
  soldeComptable: number;
  ecart: number;
  statut: StatutRapprochement;
  dateValidation?: string;
  validePar?: string;
  observations?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;

  // Relations
  compte?: {
    code: string;
    libelle: string;
    type: string;
  };
}

export interface RapprochementBancaireFormData {
  compteId: string;
  dateDebut: string;
  dateFin: string;
  soldeReleve: number;
  observations?: string;
}
