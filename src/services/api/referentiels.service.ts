import { requestJson } from '@/services/api/api-utils';
import type {
  CreateReferentielInput,
  ParametreReferentiel,
  ReferentielCategorie,
  UpdateReferentielInput
} from '@/types/referentiel.types';

interface ReferentielApiModel {
  id: string;
  clientId: string;
  categorie: ReferentielCategorie;
  code: string;
  libelle: string;
  description?: string;
  ordre: number;
  actif: boolean;
  modifiable: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

const mapFromApi = (row: ReferentielApiModel): ParametreReferentiel => ({
  id: row.id,
  clientId: row.clientId,
  categorie: row.categorie,
  code: row.code,
  libelle: row.libelle,
  description: row.description,
  ordre: Number(row.ordre || 0),
  actif: row.actif,
  modifiable: row.modifiable,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  createdBy: row.createdBy
});

export const referentielsService = {
  async getAllByCategorie(
    _clientId: string,
    categorie: ReferentielCategorie,
    actifOnly: boolean = true
  ): Promise<ParametreReferentiel[]> {
    const payload = await requestJson<ReferentielApiModel[]>(
      `/referentiels?categorie=${encodeURIComponent(categorie)}&actifOnly=${actifOnly ? 'true' : 'false'}`,
      { method: 'GET' },
      'Erreur lors de la récupération des référentiels'
    );

    return payload.map(mapFromApi);
  },

  async getById(id: string): Promise<ParametreReferentiel> {
    const payload = await requestJson<ReferentielApiModel>(
      `/referentiels/${encodeURIComponent(id)}`,
      { method: 'GET' },
      'Erreur lors de la récupération du référentiel'
    );

    return mapFromApi(payload);
  },

  async create(input: CreateReferentielInput): Promise<ParametreReferentiel> {
    const payload = await requestJson<ReferentielApiModel>(
      '/referentiels',
      {
        method: 'POST',
        body: JSON.stringify({
          categorie: input.categorie,
          code: input.code,
          libelle: input.libelle,
          description: input.description,
          ordre: input.ordre,
          actif: input.actif,
          modifiable: input.modifiable
        })
      },
      'Erreur lors de la création du référentiel'
    );

    return mapFromApi(payload);
  },

  async update(id: string, input: UpdateReferentielInput): Promise<ParametreReferentiel> {
    const payload = await requestJson<ReferentielApiModel>(
      `/referentiels/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          code: input.code,
          libelle: input.libelle,
          description: input.description,
          ordre: input.ordre,
          actif: input.actif,
          modifiable: input.modifiable
        })
      },
      'Erreur lors de la mise à jour du référentiel'
    );

    return mapFromApi(payload);
  },

  async delete(id: string): Promise<void> {
    await requestJson(
      `/referentiels/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      'Erreur lors de la suppression du référentiel'
    );
  },

  async reorder(categorie: ReferentielCategorie, _clientId: string, orderedIds: string[]): Promise<void> {
    await requestJson(
      '/referentiels/reorder',
      {
        method: 'POST',
        body: JSON.stringify({
          categorie,
          orderedIds
        })
      },
      'Erreur lors de la réorganisation des référentiels'
    );
  }
};
