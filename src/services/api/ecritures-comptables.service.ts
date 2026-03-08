import { requestJson } from '@/services/api/api-utils';
import type { EcritureComptable, EcrituresFilters, EcrituresStats } from '@/types/ecriture-comptable.types';
import type { TypeOperation } from '@/types/regle-comptable.types';

interface EcritureComptableApiModel {
  id: string;
  clientId: string;
  exerciceId: string;
  numeroPiece: string;
  numeroLigne: number;
  dateEcriture: string;
  compteDebitId: string;
  compteCreditId: string;
  montant: number;
  libelle: string;
  typeOperation: TypeOperation;
  sourceId: string;
  regleComptableId?: string;
  statutEcriture?: 'validee' | 'contrepassation';
  ecritureOrigineId?: string;
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
  compteDebit?: {
    numero: string;
    libelle: string;
  };
  compteCredit?: {
    numero: string;
    libelle: string;
  };
  regleComptable?: {
    code: string;
    nom: string;
    versionGroupId?: string;
    versionNumber?: number;
    versionStatus?: 'draft' | 'published' | 'archived';
    dateDebut?: string;
    dateFin?: string;
  };
}

const mapFromApi = (row: EcritureComptableApiModel): EcritureComptable => ({
  id: row.id,
  clientId: row.clientId,
  exerciceId: row.exerciceId,
  numeroPiece: row.numeroPiece,
  numeroLigne: Number(row.numeroLigne || 0),
  dateEcriture: row.dateEcriture,
  compteDebitId: row.compteDebitId,
  compteCreditId: row.compteCreditId,
  montant: Number(row.montant || 0),
  libelle: row.libelle,
  typeOperation: row.typeOperation,
  sourceId: row.sourceId,
  regleComptableId: row.regleComptableId,
  statutEcriture: row.statutEcriture || 'validee',
  ecritureOrigineId: row.ecritureOrigineId,
  createdAt: row.createdAt,
  createdBy: row.createdBy,
  updatedAt: row.updatedAt,
  compteDebit: row.compteDebit,
  compteCredit: row.compteCredit,
  regleComptable: row.regleComptable
    ? {
        ...row.regleComptable,
        versionNumber: row.regleComptable.versionNumber ? Number(row.regleComptable.versionNumber) : undefined
      }
    : undefined
});

const buildFilters = (exerciceId?: string, filters?: EcrituresFilters): string => {
  const query = new URLSearchParams();

  if (exerciceId) {
    query.set('exerciceId', exerciceId);
  }

  if (filters?.dateDebut) {
    query.set('dateDebut', filters.dateDebut);
  }

  if (filters?.dateFin) {
    query.set('dateFin', filters.dateFin);
  }

  if (filters?.typeOperation) {
    query.set('typeOperation', filters.typeOperation);
  }

  if (filters?.numeroPiece?.trim()) {
    query.set('numeroPiece', filters.numeroPiece.trim());
  }

  if (filters?.compteId) {
    query.set('compteId', filters.compteId);
  }

  return query.toString();
};

export const ecrituresComptablesService = {
  async getAll(_clientId: string, exerciceId?: string, filters?: EcrituresFilters): Promise<EcritureComptable[]> {
    const query = buildFilters(exerciceId, filters);

    const payload = await requestJson<EcritureComptableApiModel[]>(
      `/ecritures-comptables${query ? `?${query}` : ''}`,
      { method: 'GET' },
      'Erreur lors de la récupération des écritures comptables'
    );

    return payload.map(mapFromApi);
  },

  async getBySource(typeOperation: TypeOperation, sourceId: string): Promise<EcritureComptable[]> {
    const payload = await requestJson<EcritureComptableApiModel[]>(
      `/ecritures-comptables/source?typeOperation=${encodeURIComponent(typeOperation)}&sourceId=${encodeURIComponent(sourceId)}`,
      { method: 'GET' },
      'Erreur lors de la récupération des écritures comptables de la source'
    );

    return payload.map(mapFromApi);
  },

  async getStats(_clientId: string, exerciceId?: string): Promise<EcrituresStats> {
    const query = exerciceId ? `?exerciceId=${encodeURIComponent(exerciceId)}` : '';

    return requestJson<EcrituresStats>(
      `/ecritures-comptables/stats${query}`,
      { method: 'GET' },
      'Erreur lors de la récupération des statistiques des écritures comptables'
    );
  },

  async generateForOperation(
    typeOperation: TypeOperation,
    sourceId: string,
    clientId: string,
    exerciceId: string
  ): Promise<{ success?: boolean; ecritures_count?: number; error?: string }> {
    return requestJson<{ success?: boolean; ecritures_count?: number; error?: string }>(
      '/ecritures-comptables/generate',
      {
        method: 'POST',
        body: JSON.stringify({
          typeOperation,
          sourceId,
          clientId,
          exerciceId
        })
      },
      'Erreur lors de la génération des écritures comptables'
    );
  }
};
