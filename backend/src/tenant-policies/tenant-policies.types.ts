export interface RetentionPolicyRecord {
  id: string;
  tenantId: string;
  policyKey: string;
  version: number;
  retentionDays: number;
  legalHoldEnabled: boolean;
  isCurrent: boolean;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface RetentionPolicyView {
  tenantId: string;
  version: number;
  retentionDays: number;
  legalHoldEnabled: boolean;
  updatedBy: string | null;
  updatedAt: string | null;
}

export interface RetentionPolicyAuditEvent {
  tenantId: string;
  actorId: string;
  action: 'retention_policy_read' | 'retention_policy_update';
  decision: 'allow' | 'deny';
  version: number | null;
  reason: string | null;
}
