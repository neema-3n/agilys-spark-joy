export type StatutRecette = 'validee' | 'annulee';

export interface Recette {
  id: string;
  clientId: string;
  exerciceId: string;
  numero: string;
  dateRecette: string;
  montant: number;
  compteDestinationId: string;
  sourceRecette: string;
  categorie?: string;
  beneficiaire?: string;
  reference?: string;
  libelle: string;
  observations?: string;
  statut: StatutRecette;
  motifAnnulation?: string;
  dateAnnulation?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;

  // Relations
  compteDestination?: {
    code: string;
    libelle: string;
    type: string;
  };
}

export interface RecetteFormData {
  dateRecette: string;
  montant: number;
  compteDestinationId: string;
  sourceRecette: string;
  categorie?: string;
  beneficiaire?: string;
  reference?: string;
  libelle: string;
  observations?: string;
}

export interface RecettesStats {
  nombreTotal: number;
  nombreValidees: number;
  nombreAnnulees: number;
  montantTotal: number;
  montantValidees: number;
  montantAujourdhui: number;
  montantCeMois: number;
  repartitionParSource: {
    source: string;
    nombre: number;
    montant: number;
  }[];
}
