export interface ReservationCredit {
  id: string;
  numero: string;
  exerciceId: string;
  ligneBudgetaireId: string;
  montant: number;
  objet: string;
  beneficiaire?: string;
  projetId?: string;
  dateReservation: string;
  dateExpiration?: string;
  statut: 'brouillon' | 'active' | 'convertie' | 'annulee' | 'expiree';
  motifAnnulation?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  clientId: string;
  ecrituresCount?: number;
  // Données jointes
  ligneBudgetaire?: {
    libelle: string;
    disponible: number;
  };
  projet?: {
    id: string;
    code: string;
    nom: string;
    statut: string;
  };
  engagements?: Array<{
    id: string;
    numero: string;
    montant: number;
    statut: string;
  }>;
}

export interface ReservationCreditFormData {
  ligneBudgetaireId: string;
  montant: number;
  objet: string;
  beneficiaire?: string;
  projetId?: string;
  dateExpiration?: string;
}
