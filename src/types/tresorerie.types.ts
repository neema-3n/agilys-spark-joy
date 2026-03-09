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
export type CloseoutDossierType = 'cloture_exercice' | 'migration_reconciliation';
export type CloseoutDossierStatus = 'ready' | 'blocked' | 'go' | 'no_go';
export type AuditDossierStatus = 'ready' | 'blocked' | 'go' | 'no_go';

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
  pendingReconciliations: number;
  qualifiedDiscrepancies: number;
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
  correlationId?: string;
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

export interface ExceptionAuditDossierPayload {
  generatedAt: string;
  dossierId: string;
  scope: {
    tenantId: string;
    exerciceId: string;
    filters: {
      fromDate: string | null;
      toDate: string | null;
      sourceType: string | null;
      sourceId: string | null;
      entityId: string | null;
      correlationId: string | null;
    };
  };
  status: AuditDossierStatus;
  timeline: Array<{
    id: string;
    correlationId: string;
    actorUserId: string;
    status: TresorerieAuditStatus;
    transition: string;
    sourceType: 'engagement' | 'paiement' | 'depense';
    sourceId: string | null;
    createdAt: string;
    approvedAt: string | null;
    decidedAt: string | null;
    consumedAt: string | null;
  }>;
  decisionLog: Array<{
    id: string;
    correlationId: string;
    decision: 'allow' | 'block';
    severity: TresorerieAlertSeverity;
    reasons: string[];
    actorUserId: string;
    timestamp: string;
  }>;
  evidences: Array<{
    id: string;
    section: 'scope' | 'timeline' | 'decision_log' | 'evidences' | 'coverage' | 'manifest' | 'deliverables';
    objective: string;
    sourceType: 'audit_exception' | 'audit_event' | 'audit_vote' | 'artifact';
    sourceId: string;
    correlationId: string;
    status: 'covered' | 'partial' | 'missing';
    reason?: string;
    authorUserId?: string;
    timestamp: string;
  }>;
  coverage: Array<{
    section: 'scope' | 'timeline' | 'decision_log' | 'evidences' | 'coverage' | 'manifest' | 'deliverables';
    objective: string;
    status: 'covered' | 'partial' | 'missing';
    critical: boolean;
    evidenceIds: string[];
    reason?: string;
  }>;
  manifest: {
    generatedAt: string;
    durationMs: number;
    durationWithinSla: boolean;
    totalEntries: number;
    missingCritical: Array<{
      section: string;
      objective: string;
      reason: string;
    }>;
    entries?: Array<{
      section: 'scope' | 'timeline' | 'decision_log' | 'evidences' | 'coverage' | 'manifest' | 'deliverables';
      fileName: string;
      checksum: string;
      sizeBytes: number;
      generatedAt: string;
    }>;
    archive?: {
      fileName: string;
      checksumAlgorithm: 'sha256';
      checksum: string;
    };
  };
  deliverables: {
    suggestedFileName: string;
    archiveZipFileName: string;
    indexFileName: string;
    printableFileName: string;
    pdfStrategy: string;
  };
}

export interface CloseoutDossierEvidenceEntry {
  requirementId: string;
  section: 'evidences' | 'reconciliation' | 'decision_log' | 'exceptions' | 'signatures' | 'manifest';
  description: string;
  sourceType: 'artifact' | 'cloture_event' | 'audit_exception';
  source: string;
  checksum: string;
  sizeBytes: number;
  timestamp: string;
  scope: {
    tenantId: string;
    exerciceId: string;
    migrationBatchId?: string;
  };
  authorUserId?: string;
  status: 'covered' | 'missing';
}

export interface CloseoutDossierPayload {
  generatedAt: string;
  dossierType: CloseoutDossierType;
  status: CloseoutDossierStatus;
  scope: {
    tenantId: string;
    exerciceId: string;
    migrationBatchId?: string;
  };
  decisionLog: Array<{
    id: string;
    type: 'pre_cloture' | 'cloture' | 'reouverture';
    decision: 'accepted' | 'blocked' | 'rejected';
    statusFrom: string | null;
    statusTo: string | null;
    actorUserId: string;
    createdAt: string;
  }>;
  evidences: CloseoutDossierEvidenceEntry[];
  reconciliation: {
    found: boolean;
    batchId?: string;
    decision?: 'GO' | 'NO_GO';
    anomalies?: {
      critical: number;
      high: number;
      medium: number;
    };
    reportFiles: string[];
  };
  exceptions: {
    supervision: TresorerieSupervision;
  };
  manifest: {
    generatedAt: string;
    durationMs: number;
    durationWithinSla: boolean;
    requirementsCoverage: {
      total: number;
      covered: number;
      missing: number;
    };
    missingCritical: Array<{
      requirementId: string;
      description: string;
    }>;
  };
}
