import { requestJson } from '@/services/api/api-utils';
import type {
  ManualRapprochementDecisionInput,
  RapprochementBancaire,
  RapprochementBancaireDetail,
  RapprochementBancaireFormData,
} from '@/types/rapprochement-bancaire.types';

interface RapprochementBancaireApiModel {
  id: string;
  clientId: string;
  exerciceId: string;
  numero: string;
  compteId: string;
  dateDebut: string;
  dateFin: string;
  soldeReleve: number;
  soldeComptable: number;
  ecart: number;
  statut: 'en_cours' | 'valide' | 'annule';
  statutDetaille: 'a_traiter' | 'en_attente_validation' | 'valide' | 'annule';
  modeGeneration: 'auto' | 'manuel' | 'mixte';
  scoreGlobal?: number;
  categorieEcart?: 'timing' | 'montant' | 'reference' | 'operation_manquante' | 'anomalie_externe';
  motifQualification?: string;
  metadataAudit: Record<string, unknown>;
  totalLignes: number;
  totalPropositionsAuto: number;
  totalEcartsQualifies: number;
  dateValidation?: string;
  validePar?: string;
  observations?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  compte?: {
    code: string;
    libelle: string;
    type: string;
  };
}

interface RapprochementBancaireDetailApiModel extends RapprochementBancaireApiModel {
  lines: Array<{
    id: string;
    ordre: number;
    dateOperation: string;
    libelle: string;
    referenceBancaire?: string;
    montant: number;
    typeFlux: 'encaissement' | 'decaissement';
    statut:
      | 'proposition_unique'
      | 'ambigu'
      | 'sans_match'
      | 'rapprochee_auto'
      | 'rapprochee_manuelle'
      | 'ecart_qualifie';
    score?: number;
    reglesAppliquees: string[];
    operationTresorerieId?: string;
    categorieEcart?: 'timing' | 'montant' | 'reference' | 'operation_manquante' | 'anomalie_externe';
    motifQualification?: string;
    metadata: Record<string, unknown>;
    candidates: Array<{
      id: string;
      operationTresorerieId: string;
      score: number;
      statut: 'propose' | 'selectionne' | 'rejete';
      raisons: string[];
      metadata: Record<string, unknown>;
    }>;
  }>;
  decisions: Array<{
    id: string;
    lineId: string;
    candidateId?: string;
    action: 'select_candidate' | 'reject_candidate' | 'qualify_discrepancy';
    previousStatus?: string;
    nextStatus: string;
    justification: string;
    category?: 'timing' | 'montant' | 'reference' | 'operation_manquante' | 'anomalie_externe';
    actorUserId?: string;
    createdAt: string;
    metadata: Record<string, unknown>;
  }>;
  invalidationKeys: Array<readonly string[]>;
}

const mapFromApi = (row: RapprochementBancaireApiModel): RapprochementBancaire => ({
  id: row.id,
  clientId: row.clientId,
  exerciceId: row.exerciceId,
  numero: row.numero,
  compteId: row.compteId,
  dateDebut: row.dateDebut,
  dateFin: row.dateFin,
  soldeReleve: Number(row.soldeReleve || 0),
  soldeComptable: Number(row.soldeComptable || 0),
  ecart: Number(row.ecart || 0),
  statut: row.statut,
  statutDetaille: row.statutDetaille,
  modeGeneration: row.modeGeneration,
  scoreGlobal: row.scoreGlobal,
  categorieEcart: row.categorieEcart,
  motifQualification: row.motifQualification,
  metadataAudit: row.metadataAudit ?? {},
  totalLignes: Number(row.totalLignes || 0),
  totalPropositionsAuto: Number(row.totalPropositionsAuto || 0),
  totalEcartsQualifies: Number(row.totalEcartsQualifies || 0),
  dateValidation: row.dateValidation,
  validePar: row.validePar,
  observations: row.observations,
  createdBy: row.createdBy,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  compte: row.compte
});

const mapDetailFromApi = (row: RapprochementBancaireDetailApiModel): RapprochementBancaireDetail => ({
  ...mapFromApi(row),
  lines: row.lines,
  decisions: row.decisions,
  invalidationKeys: row.invalidationKeys,
});

export const getRapprochementInvalidationKeys = (id?: string): Array<readonly string[]> => {
  if (!id) {
    return [['rapprochements-bancaires'], ['operations-tresorerie'], ['tresorerie-supervision']];
  }

  return [
    ['rapprochements-bancaires'],
    ['operations-tresorerie'],
    ['tresorerie-supervision'],
    ['rapprochements-bancaires', 'detail', id],
  ];
};

export const rapprochementsBancairesService = {
  async getAll(_clientId: string, exerciceId: string): Promise<RapprochementBancaire[]> {
    const payload = await requestJson<RapprochementBancaireApiModel[]>(
      `/rapprochements-bancaires?exerciceId=${encodeURIComponent(exerciceId)}`,
      { method: 'GET' },
      'Erreur lors de la récupération des rapprochements bancaires'
    );

    return payload.map(mapFromApi);
  },

  async getById(id: string): Promise<RapprochementBancaireDetail> {
    const payload = await requestJson<RapprochementBancaireDetailApiModel>(
      `/rapprochements-bancaires/${encodeURIComponent(id)}`,
      { method: 'GET' },
      'Erreur lors de la récupération du rapprochement bancaire'
    );

    return mapDetailFromApi(payload);
  },

  async create(
    _clientId: string,
    exerciceId: string,
    rapprochement: RapprochementBancaireFormData
  ): Promise<RapprochementBancaireDetail> {
    const payload = await requestJson<RapprochementBancaireApiModel>(
      '/rapprochements-bancaires',
      {
        method: 'POST',
        body: JSON.stringify({
          exerciceId,
          compteId: rapprochement.compteId,
          dateDebut: rapprochement.dateDebut,
          dateFin: rapprochement.dateFin,
          soldeReleve: rapprochement.soldeReleve,
          observations: rapprochement.observations,
          statementLines: rapprochement.statementLines,
        })
      },
      'Erreur lors de la création du rapprochement bancaire'
    );

    return mapDetailFromApi(payload as RapprochementBancaireDetailApiModel);
  },

  async applyDecision(id: string, input: ManualRapprochementDecisionInput): Promise<RapprochementBancaireDetail> {
    const payload = await requestJson<RapprochementBancaireDetailApiModel>(
      `/rapprochements-bancaires/${encodeURIComponent(id)}/decision`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
      'Erreur lors de la décision de rapprochement'
    );

    return mapDetailFromApi(payload);
  },

  async valider(id: string): Promise<void> {
    await requestJson(
      `/rapprochements-bancaires/${encodeURIComponent(id)}/valider`,
      { method: 'PATCH', body: JSON.stringify({}) },
      'Erreur lors de la validation du rapprochement bancaire'
    );
  },
};
