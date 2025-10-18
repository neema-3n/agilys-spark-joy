export type StatutProjet = 'planifie' | 'en_cours' | 'en_attente' | 'termine' | 'annule';
export type PrioriteProjet = 'haute' | 'moyenne' | 'basse';

export interface Projet {
  id: string;
  clientId: string;
  exerciceId: string;
  code: string;
  nom: string;
  description?: string;
  responsable?: string;
  dateDebut: string;
  dateFin: string;
  budgetAlloue: number;
  budgetConsomme: number;
  budgetEngage: number;
  enveloppeId?: string;
  statut: StatutProjet;
  typeProjet?: string;
  priorite?: PrioriteProjet;
  tauxAvancement: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export type CreateProjetInput = Omit<Projet, 'id' | 'budgetConsomme' | 'budgetEngage' | 'createdAt' | 'updatedAt' | 'createdBy'>;
export type UpdateProjetInput = Partial<CreateProjetInput>;

export interface ProjetStats {
  nombreTotal: number;
  nombreEnCours: number;
  nombreTermines: number;
  budgetTotalAlloue: number;
  budgetTotalConsomme: number;
  tauxExecutionMoyen: number;
}
