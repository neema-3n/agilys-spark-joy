import { requestJson } from '@/services/api/api-utils';
import { Compte, CreateCompteInput, UpdateCompteInput } from '@/types/compte.types';

interface CompteApiModel {
  id: string;
  clientId: string;
  numero: string;
  libelle: string;
  type: Compte['type'];
  categorie: Compte['categorie'];
  parentId?: string;
  niveau: number;
  statut: Compte['statut'];
  versionGroupId: string;
  versionNumber: number;
  versionStatus: Compte['versionStatus'];
  effectiveStartDate?: string;
  effectiveEndDate?: string;
  changeReason?: string;
  publishedAt?: string;
  archivedAt?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

const mapFromApi = (c: CompteApiModel): Compte => ({
  id: c.id,
  clientId: c.clientId,
  numero: c.numero,
  libelle: c.libelle,
  type: c.type,
  categorie: c.categorie,
  parentId: c.parentId,
  niveau: Number(c.niveau),
  statut: c.statut,
  versionGroupId: c.versionGroupId,
  versionNumber: Number(c.versionNumber || 1),
  versionStatus: c.versionStatus,
  effectiveStartDate: c.effectiveStartDate,
  effectiveEndDate: c.effectiveEndDate,
  changeReason: c.changeReason,
  publishedAt: c.publishedAt,
  archivedAt: c.archivedAt,
  createdBy: c.createdBy,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt
});

export const comptesService = {
  async getAll(_clientId: string): Promise<Compte[]> {
    const payload = await requestJson<CompteApiModel[]>(
      '/comptes',
      { method: 'GET' },
      'Erreur lors de la récupération des comptes'
    );

    return payload.map(mapFromApi);
  },

  async getById(id: string): Promise<Compte> {
    const payload = await requestJson<CompteApiModel>(
      `/comptes/${encodeURIComponent(id)}`,
      { method: 'GET' },
      'Erreur lors de la récupération du compte'
    );

    return mapFromApi(payload);
  },

  async create(input: CreateCompteInput): Promise<Compte> {
    const payload = await requestJson<CompteApiModel>(
      '/comptes',
      {
        method: 'POST',
        body: JSON.stringify({
          numero: input.numero,
          libelle: input.libelle,
          type: input.type,
          categorie: input.categorie,
          parentId: input.parentId,
          niveau: input.niveau,
          statut: input.statut,
          versionStatus: input.versionStatus,
          effectiveStartDate: input.effectiveStartDate,
          effectiveEndDate: input.effectiveEndDate,
          changeReason: input.changeReason
        })
      },
      'Erreur lors de la création du compte'
    );

    return mapFromApi(payload);
  },

  async update(id: string, input: UpdateCompteInput): Promise<Compte> {
    const payload = await requestJson<CompteApiModel>(
      `/comptes/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          numero: input.numero,
          libelle: input.libelle,
          type: input.type,
          categorie: input.categorie,
          parentId: input.parentId,
          niveau: input.niveau,
          statut: input.statut,
          versionStatus: input.versionStatus,
          effectiveStartDate: input.effectiveStartDate,
          effectiveEndDate: input.effectiveEndDate,
          changeReason: input.changeReason
        })
      },
      'Erreur lors de la mise à jour du compte'
    );

    return mapFromApi(payload);
  },

  async delete(id: string): Promise<void> {
    await requestJson(
      `/comptes/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      'Erreur lors de la suppression du compte'
    );
  },

  async deleteAll(_clientId: string): Promise<number> {
    const payload = await requestJson<{ deletedCount: number }>(
      '/comptes?all=true',
      { method: 'DELETE' },
      'Erreur lors de la suppression des comptes'
    );

    return payload.deletedCount ?? 0;
  }
};
