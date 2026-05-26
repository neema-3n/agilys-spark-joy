import type { Action, LigneBudgetaire, ModificationBudgetaire, Programme, Section } from './budget.types';
import type { CompteTresorerie } from './compte-tresorerie.types';
import type { Depense } from './depense.types';
import type { EcritureComptable } from './ecriture-comptable.types';
import type { Engagement } from './engagement.types';
import type { Facture } from './facture.types';
import type { OperationTresorerie } from './operation-tresorerie.types';
import type { Projet } from './projet.types';
import type { RapprochementBancaire } from './rapprochement-bancaire.types';
import type { Recette } from './recette.types';
import type { Exercice, User } from './index';

export type ReportCategoryId =
  | 'budgetaire'
  | 'financier'
  | 'comptable'
  | 'tresorerie'
  | 'reglementaire';

export type ReportAvailability = 'live' | 'partial' | 'empty';
export type ReportColumnKind = 'text' | 'currency' | 'number' | 'percent' | 'date' | 'status';

export interface ReportColumnDefinition {
  id: string;
  label: string;
  kind?: ReportColumnKind;
  align?: 'left' | 'center' | 'right';
}

export interface ReportOutputTemplate {
  id: string;
  label: string;
  description?: string;
  columnIds?: string[];
}

export interface ReportRow {
  id: string;
  cells: Record<string, string | number | null | undefined>;
  meta?: {
    date?: string;
    projectId?: string;
    status?: string;
    bailleur?: string;
    sourceFinancement?: string;
    devise?: string;
    searchText?: string;
  };
}

export interface ReportingFilters {
  period: 'personnalisee' | 'mois' | 'trimestre' | 'exercice';
  dateDebut: string;
  dateFin: string;
  projectId: string;
  status: string;
  devise: string;
  search: string;
}

export interface ReportingBuildResult {
  availability: ReportAvailability;
  rows: ReportRow[];
  message?: string;
}

export interface ReportingDataContext {
  lignesBudgetaires: LigneBudgetaire[];
  modificationsBudgetaires: ModificationBudgetaire[];
  engagements: Engagement[];
  factures: Facture[];
  depenses: Depense[];
  recettes: Recette[];
  ecritures: EcritureComptable[];
  operationsTresorerie: OperationTresorerie[];
  comptesTresorerie: CompteTresorerie[];
  rapprochementsBancaires: RapprochementBancaire[];
  projets: Projet[];
  sections: Section[];
  programmes: Programme[];
  actions: Action[];
  currentClientName?: string;
  currentClientCurrency?: string;
  currentExercice?: Exercice | null;
  currentUser?: User | null;
}

export interface ReportDefinition {
  id: string;
  categoryId: ReportCategoryId;
  label: string;
  description: string;
  columns: ReportColumnDefinition[];
  outputTemplates: ReportOutputTemplate[];
  build: (context: ReportingDataContext) => ReportingBuildResult;
}

export interface ReportCategoryDefinition {
  id: ReportCategoryId;
  label: string;
  objective: string;
}
