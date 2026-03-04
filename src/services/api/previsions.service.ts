import { requestJson } from '@/services/api/api-utils';
import { GenerationParams, LignePrevision, Scenario } from '@/types/prevision.types';

interface ScenarioApiModel {
  id: string;
  clientId: string;
  code: string;
  nom: string;
  description?: string;
  typeScenario: Scenario['typeScenario'];
  anneeReference: number;
  exerciceReferenceId?: string;
  statut: Scenario['statut'];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

interface LignePrevisionApiModel {
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

const mapScenarioFromApi = (row: ScenarioApiModel): Scenario => ({
  id: row.id,
  clientId: row.clientId,
  code: row.code,
  nom: row.nom,
  description: row.description,
  typeScenario: row.typeScenario,
  anneeReference: Number(row.anneeReference || 0),
  exerciceReferenceId: row.exerciceReferenceId,
  statut: row.statut,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  createdBy: row.createdBy
});

const mapLigneFromApi = (row: LignePrevisionApiModel): LignePrevision => ({
  id: row.id,
  scenarioId: row.scenarioId,
  clientId: row.clientId,
  annee: Number(row.annee || 0),
  sectionCode: row.sectionCode,
  programmeCode: row.programmeCode,
  actionCode: row.actionCode,
  compteNumero: row.compteNumero,
  enveloppeId: row.enveloppeId,
  libelle: row.libelle,
  montantPrevu: Number(row.montantPrevu || 0),
  tauxCroissance: row.tauxCroissance === undefined ? undefined : Number(row.tauxCroissance),
  hypotheses: row.hypotheses,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt
});

export const previsionsService = {
  async getScenarios(_clientId: string): Promise<Scenario[]> {
    const payload = await requestJson<ScenarioApiModel[]>(
      '/previsions/scenarios',
      { method: 'GET' },
      'Erreur lors de la récupération des scénarios'
    );

    return payload.map(mapScenarioFromApi);
  },

  async getScenario(scenarioId: string): Promise<Scenario> {
    const payload = await requestJson<ScenarioApiModel>(
      `/previsions/scenarios/${encodeURIComponent(scenarioId)}`,
      { method: 'GET' },
      'Erreur lors de la récupération du scénario'
    );

    return mapScenarioFromApi(payload);
  },

  async createScenario(scenario: Omit<Scenario, 'id' | 'createdAt' | 'updatedAt'>): Promise<Scenario> {
    const payload = await requestJson<ScenarioApiModel>(
      '/previsions/scenarios',
      {
        method: 'POST',
        body: JSON.stringify({
          code: scenario.code,
          nom: scenario.nom,
          description: scenario.description,
          typeScenario: scenario.typeScenario,
          anneeReference: scenario.anneeReference,
          exerciceReferenceId: scenario.exerciceReferenceId,
          statut: scenario.statut,
          createdBy: scenario.createdBy
        })
      },
      'Erreur lors de la création du scénario'
    );

    return mapScenarioFromApi(payload);
  },

  async updateScenario(scenarioId: string, updates: Partial<Omit<Scenario, 'id' | 'clientId'>>): Promise<Scenario> {
    const payload = await requestJson<ScenarioApiModel>(
      `/previsions/scenarios/${encodeURIComponent(scenarioId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          code: updates.code,
          nom: updates.nom,
          description: updates.description,
          typeScenario: updates.typeScenario,
          anneeReference: updates.anneeReference,
          exerciceReferenceId: updates.exerciceReferenceId,
          statut: updates.statut
        })
      },
      'Erreur lors de la mise à jour du scénario'
    );

    return mapScenarioFromApi(payload);
  },

  async deleteScenario(scenarioId: string): Promise<void> {
    await requestJson(
      `/previsions/scenarios/${encodeURIComponent(scenarioId)}`,
      { method: 'DELETE' },
      'Erreur lors de la suppression du scénario'
    );
  },

  async validerScenario(scenarioId: string): Promise<Scenario> {
    const payload = await requestJson<ScenarioApiModel>(
      `/previsions/scenarios/${encodeURIComponent(scenarioId)}/valider`,
      { method: 'PATCH' },
      'Erreur lors de la validation du scénario'
    );

    return mapScenarioFromApi(payload);
  },

  async archiverScenario(scenarioId: string): Promise<Scenario> {
    const payload = await requestJson<ScenarioApiModel>(
      `/previsions/scenarios/${encodeURIComponent(scenarioId)}/archiver`,
      { method: 'PATCH' },
      'Erreur lors de l\'archivage du scénario'
    );

    return mapScenarioFromApi(payload);
  },

  async getLignesPrevision(scenarioId: string, annee?: number): Promise<LignePrevision[]> {
    const search = new URLSearchParams();
    search.set('scenarioId', scenarioId);
    if (annee !== undefined) {
      search.set('annee', String(annee));
    }

    const payload = await requestJson<LignePrevisionApiModel[]>(
      `/previsions/lignes?${search.toString()}`,
      { method: 'GET' },
      'Erreur lors de la récupération des lignes de prévision'
    );

    return payload.map(mapLigneFromApi);
  },

  async createLignePrevision(ligne: Omit<LignePrevision, 'id' | 'createdAt' | 'updatedAt'>): Promise<LignePrevision> {
    const payload = await requestJson<LignePrevisionApiModel>(
      '/previsions/lignes',
      {
        method: 'POST',
        body: JSON.stringify({
          scenarioId: ligne.scenarioId,
          annee: ligne.annee,
          sectionCode: ligne.sectionCode,
          programmeCode: ligne.programmeCode,
          actionCode: ligne.actionCode,
          compteNumero: ligne.compteNumero,
          enveloppeId: ligne.enveloppeId,
          libelle: ligne.libelle,
          montantPrevu: ligne.montantPrevu,
          tauxCroissance: ligne.tauxCroissance,
          hypotheses: ligne.hypotheses
        })
      },
      'Erreur lors de la création de la ligne de prévision'
    );

    return mapLigneFromApi(payload);
  },

  async updateLignePrevision(
    ligneId: string,
    updates: Partial<Omit<LignePrevision, 'id' | 'scenarioId' | 'clientId'>>
  ): Promise<LignePrevision> {
    const payload = await requestJson<LignePrevisionApiModel>(
      `/previsions/lignes/${encodeURIComponent(ligneId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          annee: updates.annee,
          sectionCode: updates.sectionCode,
          programmeCode: updates.programmeCode,
          actionCode: updates.actionCode,
          compteNumero: updates.compteNumero,
          enveloppeId: updates.enveloppeId,
          libelle: updates.libelle,
          montantPrevu: updates.montantPrevu,
          tauxCroissance: updates.tauxCroissance,
          hypotheses: updates.hypotheses
        })
      },
      'Erreur lors de la mise à jour de la ligne de prévision'
    );

    return mapLigneFromApi(payload);
  },

  async deleteLignePrevision(ligneId: string): Promise<void> {
    await requestJson(
      `/previsions/lignes/${encodeURIComponent(ligneId)}`,
      { method: 'DELETE' },
      'Erreur lors de la suppression de la ligne de prévision'
    );
  },

  async genererPrevisions(params: GenerationParams): Promise<void> {
    await requestJson<{ insertedCount: number }>(
      '/previsions/generer',
      {
        method: 'POST',
        body: JSON.stringify({
          scenarioId: params.scenarioId,
          exerciceReferenceId: params.exerciceReferenceId,
          nombreAnnees: params.nombreAnnees,
          tauxCroissanceGlobal: params.tauxCroissanceGlobal,
          tauxParSection: params.tauxParSection,
          inclureInflation: params.inclureInflation,
          tauxInflation: params.tauxInflation
        })
      },
      'Erreur lors de la génération des prévisions'
    );
  },

  async dupliquerScenario(scenarioId: string, nouveauCode: string, nouveauNom: string): Promise<Scenario> {
    const payload = await requestJson<ScenarioApiModel>(
      `/previsions/scenarios/${encodeURIComponent(scenarioId)}/dupliquer`,
      {
        method: 'POST',
        body: JSON.stringify({
          code: nouveauCode,
          nom: nouveauNom
        })
      },
      'Erreur lors de la duplication du scénario'
    );

    return mapScenarioFromApi(payload);
  }
};
