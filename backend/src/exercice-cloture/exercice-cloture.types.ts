export const EXERCICE_CANONICAL_STATUSES = ['ouverte', 'en_revue', 'fermee'] as const;

export const EXERCICE_COMPATIBLE_STATUSES = ['ouvert', 'cloture', ...EXERCICE_CANONICAL_STATUSES] as const;

export type ExerciceCanonicalStatus = (typeof EXERCICE_CANONICAL_STATUSES)[number];
export type ExerciceCompatibleStatus = (typeof EXERCICE_COMPATIBLE_STATUSES)[number];

export interface ExerciceChecklistItem {
  code: string;
  label: string;
  status: 'ok' | 'warning' | 'blocking';
  detail: string;
  evidenceCount: number;
  evidence: Array<Record<string, unknown>>;
}

export interface ExerciceChecklist {
  exerciceId: string;
  statutExercice: ExerciceCanonicalStatus;
  generatedAt: string;
  canClose: boolean;
  items: ExerciceChecklistItem[];
}

export interface ExerciceClotureEventView {
  id: string;
  exerciceId: string;
  clientId: string;
  type: 'pre_cloture' | 'cloture' | 'reouverture';
  fromStatus: ExerciceCanonicalStatus;
  toStatus: ExerciceCanonicalStatus;
  decision: 'accepted' | 'blocked';
  checklist: ExerciceChecklist;
  metadata: Record<string, unknown>;
  createdAt: string;
  createdBy: string;
}
