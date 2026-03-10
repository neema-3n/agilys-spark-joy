export type DsfReferentielVersion = 'OHADA-SYCEBNL-2017' | 'OHADA-SYCEBNL-2025';
export type DsfExportFormat = 'csv' | 'xlsx' | 'pdf';

export interface DsfReportingFilters {
  exerciceId: string;
  entiteId?: string;
  referentielVersion: DsfReferentielVersion;
  includeWarnings?: boolean;
  correlationId?: string;
}

export interface DsfDiagnostic {
  code: string;
  severity: 'blocking' | 'warning';
  message: string;
  action: string;
}

export interface DsfValidationResponse {
  status: 'conforme' | 'non-conforme';
  isExportAllowed: boolean;
  referentielVersion: DsfReferentielVersion;
  diagnostics: DsfDiagnostic[];
  blockingErrors: DsfDiagnostic[];
  warnings: DsfDiagnostic[];
  checklist: Array<{
    id: string;
    label: string;
    ok: boolean;
  }>;
  summary: {
    totalEcritures: number;
    totalDebit: number;
    totalCredit: number;
    ecart: number;
  };
}

export interface DsfExportRequest extends DsfReportingFilters {
  format: DsfExportFormat;
}

export interface DsfExportStartResponse {
  exportId: string;
  status: 'completed';
  referentielVersion: DsfReferentielVersion;
  hash: string;
  validationStatus: 'conforme' | 'non-conforme';
  initiatedBy: string;
}

export interface DsfExportStatusResponse {
  exportId: string;
  status: 'completed';
  referentielVersion: DsfReferentielVersion;
  hash: string;
  downloadUrl: string;
  filename: string;
}
