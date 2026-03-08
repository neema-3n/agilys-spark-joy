import { requestJson } from '@/services/api/api-utils';
import type {
  CreateRegleComptableInput,
  RegleComptable,
  TypeOperation,
  UpdateRegleComptableInput
} from '@/types/regle-comptable.types';

interface RegleComptableApiModel {
  id: string;
  clientId: string;
  code: string;
  nom: string;
  description?: string;
  dateDebut?: string;
  dateFin?: string;
  permanente: boolean;
  typeOperation: TypeOperation;
  conditions: Array<{ champ: string; operateur: string; valeur: string | number | boolean }>;
  compteDebitId: string;
  compteCreditId: string;
  actif: boolean;
  ordre: number;
  versionGroupId: string;
  versionNumber: number;
  versionStatus: 'draft' | 'published' | 'archived';
  changeReason?: string;
  publishedAt?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  compteDebit?: {
    numero: string;
    libelle: string;
  };
  compteCredit?: {
    numero: string;
    libelle: string;
  };
}

const mapFromApi = (row: RegleComptableApiModel): RegleComptable => ({
  id: row.id,
  clientId: row.clientId,
  code: row.code,
  nom: row.nom,
  description: row.description,
  dateDebut: row.dateDebut,
  dateFin: row.dateFin,
  permanente: row.permanente,
  typeOperation: row.typeOperation,
  conditions: row.conditions || [],
  compteDebitId: row.compteDebitId,
  compteCreditId: row.compteCreditId,
  actif: row.actif,
  ordre: Number(row.ordre || 0),
  versionGroupId: row.versionGroupId,
  versionNumber: Number(row.versionNumber || 1),
  versionStatus: row.versionStatus,
  changeReason: row.changeReason,
  publishedAt: row.publishedAt,
  archivedAt: row.archivedAt,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  createdBy: row.createdBy,
  compteDebit: row.compteDebit,
  compteCredit: row.compteCredit
});

export const reglesComptablesService = {
  async getAll(_clientId: string, typeOperation?: TypeOperation): Promise<RegleComptable[]> {
    const query = typeOperation ? `?typeOperation=${encodeURIComponent(typeOperation)}` : '';

    const payload = await requestJson<RegleComptableApiModel[]>(
      `/regles-comptables${query}`,
      { method: 'GET' },
      'Erreur lors de la récupération des règles comptables'
    );

    return payload.map(mapFromApi);
  },

  async getById(id: string): Promise<RegleComptable> {
    const payload = await requestJson<RegleComptableApiModel>(
      `/regles-comptables/${encodeURIComponent(id)}`,
      { method: 'GET' },
      'Erreur lors de la récupération de la règle comptable'
    );

    return mapFromApi(payload);
  },

  async create(input: CreateRegleComptableInput): Promise<RegleComptable> {
    const payload = await requestJson<RegleComptableApiModel>(
      '/regles-comptables',
      {
        method: 'POST',
        body: JSON.stringify({
          code: input.code,
          nom: input.nom,
          description: input.description,
          dateDebut: input.dateDebut,
          dateFin: input.dateFin,
          permanente: input.permanente,
          typeOperation: input.typeOperation,
          conditions: input.conditions,
          compteDebitId: input.compteDebitId,
          compteCreditId: input.compteCreditId,
          actif: input.actif,
          ordre: input.ordre,
          versionStatus: input.versionStatus,
          changeReason: input.changeReason
        })
      },
      'Erreur lors de la création de la règle comptable'
    );

    return mapFromApi(payload);
  },

  async update(id: string, input: UpdateRegleComptableInput): Promise<RegleComptable> {
    const payload = await requestJson<RegleComptableApiModel>(
      `/regles-comptables/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          nom: input.nom,
          description: input.description,
          dateDebut: input.dateDebut,
          dateFin: input.dateFin,
          permanente: input.permanente,
          conditions: input.conditions,
          compteDebitId: input.compteDebitId,
          compteCreditId: input.compteCreditId,
          actif: input.actif,
          ordre: input.ordre,
          versionStatus: input.versionStatus,
          changeReason: input.changeReason
        })
      },
      'Erreur lors de la mise à jour de la règle comptable'
    );

    return mapFromApi(payload);
  },

  async delete(id: string): Promise<void> {
    await requestJson(
      `/regles-comptables/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      'Erreur lors de la suppression de la règle comptable'
    );
  },

  async reorder(_clientId: string, typeOperation: TypeOperation, orderedIds: string[]): Promise<void> {
    await requestJson(
      '/regles-comptables/reorder',
      {
        method: 'POST',
        body: JSON.stringify({
          typeOperation,
          orderedIds
        })
      },
      'Erreur lors du réordonnancement des règles comptables'
    );
  }
};
