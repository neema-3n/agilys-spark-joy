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

export type TresorerieAlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type TresorerieAuditStatus =
  | 'blocked'
  | 'exception-requested'
  | 'exception-approved'
  | 'exception-expired'
  | 'executed-under-exception';

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

export interface TresorerieSupervisionAlert {
  key: string;
  severity: TresorerieAlertSeverity;
  code: string;
  label: string;
  message: string;
  value: number;
  threshold: number;
}

export interface TresorerieSupervision {
  exerciceId: string;
  generatedAt: string;
  currentPosition: number;
  shortTermProjection: number;
  pendingDisbursements: number;
  pendingDisbursementsCount: number;
  remainingCommitments: number;
  remainingCommitmentsCount: number;
  nonReconciledOperations: number;
  projectedExposure: number;
  projectedGap: number;
  activeExceptions: number;
  expiredExceptions: number;
  consumedExceptions: number;
  alerts: TresorerieSupervisionAlert[];
}

export interface TresorerieAuditEntry {
  id: string;
  exerciceId: string;
  status: TresorerieAuditStatus;
  severity: TresorerieAlertSeverity;
  decision: 'allow' | 'block';
  transition: string;
  sourceType: 'engagement' | 'paiement' | 'depense';
  sourceId?: string;
  entityId?: string;
  correlationId: string;
  motif: string;
  justification: string;
  quorumRequired: number;
  requestedBy: string;
  approvedAt?: string;
  decidedAt?: string;
  consumedAt?: string;
  consumedBy?: string;
  consumedTransition?: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  reasons: string[];
  snapshot: {
    tenantId: string;
    exerciceId: string;
    transition: string;
    sourceType: 'engagement' | 'paiement' | 'depense';
    sourceId?: string;
    entityId?: string;
    projectedAmount: number;
    availableCash: number;
    outstandingDepenses: number;
    remainingEngagements: number;
    projectedExposure: number;
    projectedGap: number;
    nonReconciledOperations: number;
    threshold: number;
    correlationId: string;
  };
  approvers: Array<{
    actorUserId: string;
    decision: 'approuver' | 'rejeter';
    commentaire?: string;
    createdAt: string;
  }>;
}

export interface TresorerieAuditDetail extends TresorerieAuditEntry {
  votes: Array<{
    id: string;
    actorUserId: string;
    actorRoles: string[];
    decision: 'approuver' | 'rejeter';
    commentaire?: string;
    createdAt: string;
  }>;
  events: Array<{
    id: string;
    actorUserId: string;
    actorRoles: string[];
    eventType: string;
    payload: Record<string, unknown>;
    createdAt: string;
  }>;
}

export interface TresorerieAuditFilters {
  status?: TresorerieAuditStatus;
  transition?: string;
  severity?: TresorerieAlertSeverity;
  decision?: 'allow' | 'block';
  sourceType?: 'engagement' | 'paiement' | 'depense';
  sourceId?: string;
  entityId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedTresorerieAudit {
  items: TresorerieAuditEntry[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
