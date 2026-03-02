export type ReferentielEntityType = 'exercice' | 'enveloppe' | 'section' | 'programme' | 'action';

export interface EntityBase {
  id: string;
  clientId: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  archivedAt?: string | null;
}

export interface ExerciceEntity extends EntityBase {
  libelle: string;
  code: string;
  dateDebut: string;
  dateFin: string;
  statut: 'ouvert' | 'cloture';
}

export interface EnveloppeEntity extends EntityBase {
  exerciceId: string;
  code: string;
  nom: string;
  sourceFinancement: string;
  montantAlloue: number;
  montantConsomme: number;
  statut: 'actif' | 'cloture';
}

export interface SectionEntity extends EntityBase {
  exerciceId: string;
  code: string;
  libelle: string;
  ordre: number;
  statut: 'actif' | 'archive';
}

export interface ProgrammeEntity extends EntityBase {
  clientId: string;
  exerciceId: string;
  sectionId: string;
  code: string;
  libelle: string;
  ordre: number;
  statut: 'actif' | 'archive';
}

export interface ActionEntity extends EntityBase {
  clientId: string;
  exerciceId: string;
  programmeId: string;
  code: string;
  libelle: string;
  ordre: number;
  statut: 'actif' | 'archive';
}

export interface AuditEntry {
  id: string;
  tenantId: string;
  entityType: ReferentielEntityType;
  entityId: string;
  action: 'create' | 'update' | 'archive';
  timestamp: string;
  authorId: string;
  before: unknown | null;
  after: unknown | null;
}
