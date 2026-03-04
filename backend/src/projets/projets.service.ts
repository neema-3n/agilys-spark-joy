import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PostgresService } from '../common/postgres.service';
import type { CreateProjetDto, UpdateProjetDto } from './dto/projets.dto';

interface ProjetRow {
  id: string;
  client_id: string;
  exercice_id: string;
  code: string;
  nom: string;
  description: string | null;
  responsable: string | null;
  date_debut: string;
  date_fin: string;
  budget_alloue: string | number;
  budget_consomme: string | number;
  budget_engage: string | number;
  enveloppe_id: string | null;
  statut: 'planifie' | 'en_cours' | 'en_attente' | 'termine' | 'annule';
  type_projet: string | null;
  priorite: 'haute' | 'moyenne' | 'basse' | null;
  taux_avancement: string | number;
  created_at: Date | string;
  updated_at: Date | string;
  created_by: string | null;
}

interface ProjetView {
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
  statut: 'planifie' | 'en_cours' | 'en_attente' | 'termine' | 'annule';
  typeProjet?: string;
  priorite?: 'haute' | 'moyenne' | 'basse';
  tauxAvancement: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

@Injectable()
export class ProjetsService {
  constructor(private readonly postgresService: PostgresService) {}

  async getByExercice(actor: AuthenticatedUser, exerciceId: string): Promise<ProjetView[]> {
    const result = await this.postgresService.query<ProjetRow>(
      `
        SELECT *
        FROM public.projets
        WHERE client_id = $1
          AND exercice_id = $2
        ORDER BY created_at DESC
      `,
      [actor.tenantId, exerciceId]
    );

    return result.rows.map((row) => this.mapRowToView(row));
  }

  async getById(actor: AuthenticatedUser, id: string): Promise<ProjetView> {
    const result = await this.postgresService.query<ProjetRow>(
      `
        SELECT *
        FROM public.projets
        WHERE id = $1
          AND client_id = $2
        LIMIT 1
      `,
      [id, actor.tenantId]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException('Projet introuvable');
    }

    return this.mapRowToView(row);
  }

  async create(actor: AuthenticatedUser, payload: CreateProjetDto): Promise<ProjetView> {
    const result = await this.postgresService.query<ProjetRow>(
      `
        INSERT INTO public.projets (
          client_id,
          exercice_id,
          code,
          nom,
          description,
          responsable,
          date_debut,
          date_fin,
          budget_alloue,
          enveloppe_id,
          statut,
          type_projet,
          priorite,
          taux_avancement,
          created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
        )
        RETURNING *
      `,
      [
        actor.tenantId,
        payload.exerciceId,
        payload.code,
        payload.nom,
        payload.description ?? null,
        payload.responsable ?? null,
        payload.dateDebut,
        payload.dateFin,
        payload.budgetAlloue,
        payload.enveloppeId ?? null,
        payload.statut,
        payload.typeProjet ?? null,
        payload.priorite ?? null,
        payload.tauxAvancement,
        actor.sub
      ]
    );

    return this.mapRowToView(result.rows[0]);
  }

  async update(actor: AuthenticatedUser, id: string, payload: UpdateProjetDto): Promise<ProjetView> {
    const keys = Object.keys(payload) as Array<keyof UpdateProjetDto>;
    if (keys.length === 0) {
      return this.getById(actor, id);
    }

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    for (const key of keys) {
      const value = payload[key];
      if (value === undefined) {
        continue;
      }

      const column = this.mapUpdateKeyToColumn(key);
      setClauses.push(`${column} = $${index}`);
      values.push(value);
      index += 1;
    }

    setClauses.push('updated_at = now()');
    values.push(id, actor.tenantId);

    const result = await this.postgresService.query<ProjetRow>(
      `
        UPDATE public.projets
        SET ${setClauses.join(', ')}
        WHERE id = $${index}
          AND client_id = $${index + 1}
        RETURNING *
      `,
      values
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException('Projet introuvable');
    }

    return this.mapRowToView(row);
  }

  async delete(actor: AuthenticatedUser, id: string): Promise<void> {
    const result = await this.postgresService.query(
      `
        DELETE FROM public.projets
        WHERE id = $1
          AND client_id = $2
      `,
      [id, actor.tenantId]
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new NotFoundException('Projet introuvable');
    }
  }

  async updateTauxAvancement(actor: AuthenticatedUser, id: string, taux: number): Promise<ProjetView> {
    return this.update(actor, id, { tauxAvancement: taux });
  }

  private mapUpdateKeyToColumn(key: keyof UpdateProjetDto): string {
    const map: Record<keyof UpdateProjetDto, string> = {
      code: 'code',
      nom: 'nom',
      description: 'description',
      responsable: 'responsable',
      dateDebut: 'date_debut',
      dateFin: 'date_fin',
      budgetAlloue: 'budget_alloue',
      enveloppeId: 'enveloppe_id',
      statut: 'statut',
      typeProjet: 'type_projet',
      priorite: 'priorite',
      tauxAvancement: 'taux_avancement'
    };

    return map[key];
  }

  private mapRowToView(row: ProjetRow): ProjetView {
    return {
      id: row.id,
      clientId: row.client_id,
      exerciceId: row.exercice_id,
      code: row.code,
      nom: row.nom,
      description: row.description ?? undefined,
      responsable: row.responsable ?? undefined,
      dateDebut: row.date_debut,
      dateFin: row.date_fin,
      budgetAlloue: Number(row.budget_alloue ?? 0),
      budgetConsomme: Number(row.budget_consomme ?? 0),
      budgetEngage: Number(row.budget_engage ?? 0),
      enveloppeId: row.enveloppe_id ?? undefined,
      statut: row.statut,
      typeProjet: row.type_projet ?? undefined,
      priorite: row.priorite ?? undefined,
      tauxAvancement: Number(row.taux_avancement ?? 0),
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      createdBy: row.created_by ?? undefined
    };
  }
}
