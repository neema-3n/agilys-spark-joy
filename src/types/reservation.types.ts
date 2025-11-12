export interface ReservationCredit {
  id: string;
  numero: string;
  exerciceId: string;
  ligneBudgetaireId: string;
  montant: number;
  objet: string;
  beneficiaire?: string;
  dateReservation: string;
  dateExpiration?: string;
  statut: 'active' | 'utilisee' | 'annulee' | 'expiree';
  motifAnnulation?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  clientId: string;
  // Données jointes
  ligneBudgetaire?: {
    libelle: string;
    disponible: number;
  };
}

export interface ReservationCreditFormData {
  ligneBudgetaireId: string;
  montant: number;
  objet: string;
  beneficiaire?: string;
  dateExpiration?: string;
}
