export interface FluxTresorerie {
  id: string;
  clientId: string;
  exerciceId: string;
  date: string;
  type: 'encaissement' | 'decaissement';
  categorie: string;
  libelle: string;
  montant: number;
  sourceType: 'paiement' | 'recette' | 'autre';
  sourceId?: string;
  observations?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TresorerieStats {
  soldeActuel: number;
  totalEncaissements: number;
  totalDecaissements: number;
  soldePrevisionnel: number;
  variationMensuelle: number;
  encaissementsMoisEnCours: number;
  decaissementsMoisEnCours: number;
}

export interface PrevisionTresorerie {
  periode: string;
  encaissementsPrevus: number;
  decaissementsPrevus: number;
  soldePrevisionnel: number;
}
