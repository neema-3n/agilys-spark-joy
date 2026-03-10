export type DossierDepenseDetailLevel = 'standard' | 'full';
export type DossierDepenseExportFormat = 'pdf' | 'zip';

export interface DossierDepenseFilters {
  exerciceId?: string;
  dateDebut?: string;
  dateFin?: string;
  detailLevel?: DossierDepenseDetailLevel;
}

export interface DossierTimelineEvent {
  id: string;
  type: string;
  label: string;
  timestamp: string;
  entityId: string;
  entityType: string;
  status?: string;
  amount?: number;
  actor?: {
    userId: string;
    action: string;
  };
  correlationId: string;
  details?: string;
}

export interface DossierPreuve {
  id: string;
  type: 'reference-piece' | 'piece-justificative' | 'reference-paiement' | 'metadata-audit';
  label: string;
  source: string;
  value: string;
  entityId: string;
  entityType: string;
  missing: boolean;
}

export interface DossierDepenseResponse {
  dossierId: string;
  generatedAt: string;
  filters: {
    exerciceId?: string;
    dateDebut?: string;
    dateFin?: string;
    detailLevel: DossierDepenseDetailLevel;
  };
  depense: {
    id: string;
    numero: string;
    objet: string;
    statut: string;
    montant: number;
    montantPaye: number;
    dateDepense: string;
    createdAt: string;
    createdBy: string | null;
    fournisseur: {
      id: string;
      code: string | null;
      nom: string | null;
    } | null;
    projet: {
      id: string;
      code: string | null;
      nom: string | null;
    } | null;
  };
  chaine: {
    reservation: {
      id: string;
      numero: string | null;
      statut: string | null;
      date: string | null;
    } | null;
    engagement: {
      id: string;
      numero: string | null;
      statut: string | null;
      date: string | null;
    } | null;
    bonsCommande: Array<{
      id: string;
      numero: string;
      statut: string;
      montant: number;
      dateCommande: string;
    }>;
    factures: Array<{
      id: string;
      numero: string;
      statut: string;
      montantTTC: number;
      montantLiquide: number;
      dateFacture: string;
      referencePiece: string | null;
    }>;
    paiements: Array<{
      id: string;
      numero: string;
      statut: string;
      montant: number;
      datePaiement: string;
      modePaiement: string | null;
      referencePaiement: string | null;
    }>;
  };
  timeline: DossierTimelineEvent[];
  preuves: DossierPreuve[];
  synthese: {
    controles: Array<{
      code: string;
      label: string;
      status: 'ok' | 'warning';
      detail: string;
    }>;
    ecarts: Array<{
      code: string;
      label: string;
      severity: 'low' | 'medium';
      detail: string;
    }>;
    indicateurs: {
      totalFactures: number;
      totalPaiements: number;
      totalPreuves: number;
      preuvesManquantes: number;
    };
  };
  actionsUtilisateurs: DossierTimelineEvent[];
}
