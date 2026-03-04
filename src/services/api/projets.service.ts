import { requestJson } from '@/services/api/api-utils';
import { CreateProjetInput, Projet, ProjetStats, UpdateProjetInput } from '@/types/projet.types';

interface ProjetApiModel {
  id: string;
  clientId: string;
  exerciceId: string;
  code: string;
  nom: string;
  description?: string;
  responsable?: string;
  dateDebut: string;
  dateFin: string;
  budgetAlloue: number;
  budgetConsomme: number;
  budgetEngage: number;
  enveloppeId?: string;
  statut: Projet['statut'];
  typeProjet?: string;
  priorite?: Projet['priorite'];
  tauxAvancement: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

const mapFromApi = (row: ProjetApiModel): Projet => ({
  id: row.id,
  clientId: row.clientId,
  exerciceId: row.exerciceId,
  code: row.code,
  nom: row.nom,
  description: row.description,
  responsable: row.responsable,
  dateDebut: row.dateDebut,
  dateFin: row.dateFin,
  budgetAlloue: Number(row.budgetAlloue || 0),
  budgetConsomme: Number(row.budgetConsomme || 0),
  budgetEngage: Number(row.budgetEngage || 0),
  enveloppeId: row.enveloppeId,
  statut: row.statut,
  typeProjet: row.typeProjet,
  priorite: row.priorite,
  tauxAvancement: Number(row.tauxAvancement || 0),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  createdBy: row.createdBy
});

export const projetsService = {
  async getByExercice(exerciceId: string, _clientId: string): Promise<Projet[]> {
    const payload = await requestJson<ProjetApiModel[]>(
      `/projets?exerciceId=${encodeURIComponent(exerciceId)}`,
      { method: 'GET' },
      'Erreur lors de la récupération des projets'
    );

    return payload.map(mapFromApi);
  },

  async getById(id: string): Promise<Projet> {
    const payload = await requestJson<ProjetApiModel>(
      `/projets/${encodeURIComponent(id)}`,
      { method: 'GET' },
      'Erreur lors de la récupération du projet'
    );

    return mapFromApi(payload);
  },

  async create(input: CreateProjetInput): Promise<Projet> {
    const payload = await requestJson<ProjetApiModel>(
      '/projets',
      {
        method: 'POST',
        body: JSON.stringify({
          exerciceId: input.exerciceId,
          code: input.code,
          nom: input.nom,
          description: input.description,
          responsable: input.responsable,
          dateDebut: input.dateDebut,
          dateFin: input.dateFin,
          budgetAlloue: input.budgetAlloue,
          enveloppeId: input.enveloppeId,
          statut: input.statut,
          typeProjet: input.typeProjet,
          priorite: input.priorite,
          tauxAvancement: input.tauxAvancement
        })
      },
      'Erreur lors de la création du projet'
    );

    return mapFromApi(payload);
  },

  async update(id: string, input: UpdateProjetInput): Promise<Projet> {
    const payload = await requestJson<ProjetApiModel>(
      `/projets/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          code: input.code,
          nom: input.nom,
          description: input.description,
          responsable: input.responsable,
          dateDebut: input.dateDebut,
          dateFin: input.dateFin,
          budgetAlloue: input.budgetAlloue,
          enveloppeId: input.enveloppeId,
          statut: input.statut,
          typeProjet: input.typeProjet,
          priorite: input.priorite,
          tauxAvancement: input.tauxAvancement
        })
      },
      'Erreur lors de la mise à jour du projet'
    );

    return mapFromApi(payload);
  },

  async delete(id: string): Promise<void> {
    await requestJson(
      `/projets/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      'Erreur lors de la suppression du projet'
    );
  },

  async updateTauxAvancement(id: string, taux: number): Promise<Projet> {
    const payload = await requestJson<ProjetApiModel>(
      `/projets/${encodeURIComponent(id)}/taux-avancement`,
      {
        method: 'PATCH',
        body: JSON.stringify({ taux })
      },
      "Erreur lors de la mise à jour du taux d'avancement"
    );

    return mapFromApi(payload);
  },

  async getStatistics(exerciceId: string, clientId: string): Promise<ProjetStats> {
    const projets = await this.getByExercice(exerciceId, clientId);

    return {
      nombreTotal: projets.length,
      nombreEnCours: projets.filter((p) => p.statut === 'en_cours').length,
      nombreTermines: projets.filter((p) => p.statut === 'termine').length,
      budgetTotalAlloue: projets.reduce((sum, p) => sum + p.budgetAlloue, 0),
      budgetTotalConsomme: projets.reduce((sum, p) => sum + p.budgetConsomme, 0),
      tauxExecutionMoyen:
        projets.length > 0 ? projets.reduce((sum, p) => sum + p.tauxAvancement, 0) / projets.length : 0
    };
  }
};
