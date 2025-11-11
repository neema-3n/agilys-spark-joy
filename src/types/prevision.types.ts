export type TypeScenario = 'optimiste' | 'pessimiste' | 'realiste' | 'personnalise';
export type StatutScenario = 'brouillon' | 'valide' | 'archive';

export interface Scenario {
  id: string;
  clientId: string;
  code: string;
  nom: string;
  description?: string;
  typeScenario: TypeScenario;
  anneeReference: number;
  exerciceReferenceId?: string;
  statut: StatutScenario;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface LignePrevision {
  id: string;
  scenarioId: string;
  clientId: string;
  annee: number;
  sectionCode?: string;
  programmeCode?: string;
  actionCode?: string;
  compteNumero?: string;
  enveloppeId?: string;
  libelle: string;
  montantPrevu: number;
  tauxCroissance?: number;
  hypotheses?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GenerationParams {
  scenarioId: string;
  exerciceReferenceId: string;
  nombreAnnees: number;
  tauxCroissanceGlobal?: number;
  tauxParSection?: Record<string, number>;
  inclureInflation?: boolean;
  tauxInflation?: number;
}

export interface PrevisionStats {
  scenarioId: string;
  nombreAnneesProjectees: number;
  montantTotalPrevu: number;
  montantParAnnee: Record<number, number>;
  tauxCroissanceMoyen: number;
}
