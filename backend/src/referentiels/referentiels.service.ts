import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PostgresService } from '../common/postgres.service';
import type { CreateReferentielDto, UpdateReferentielDto } from './dto/referentiels.dto';

type ReferentielCategorie =
  | 'compte_type'
  | 'compte_categorie'
  | 'structure_type'
  | 'source_financement'
  | 'statut_general'
  | 'type_projet'
  | 'statut_projet'
  | 'priorite_projet';

interface ReferentielRow {
  id: string;
  client_id: string;
  categorie: ReferentielCategorie;
  code: string;
  libelle: string;
  description: string | null;
  ordre: number;
  actif: boolean;
  modifiable: boolean;
  created_at: Date | string;
  updated_at: Date | string;
  created_by: string | null;
}

@Injectable()
export class ReferentielsService {
  constructor(private readonly postgresService: PostgresService) {}

  async getAllByCategorie(actor: AuthenticatedUser, categorie: ReferentielCategorie, actifOnly = true) {
    const values: unknown[] = [actor.tenantId, categorie];

    const whereSql = actifOnly
      ? `WHERE client_id = $1 AND categorie = $2 AND actif = true`
      : `WHERE client_id = $1 AND categorie = $2`;

    const result = await this.postgresService.query<ReferentielRow>(
      `
        SELECT *
        FROM public.parametres_referentiels
        ${whereSql}
        ORDER BY ordre ASC, libelle ASC
      `,
      values
    );

    return result.rows.map((row) => this.mapRowToView(row));
  }

  async getById(actor: AuthenticatedUser, id: string) {
    const result = await this.postgresService.query<ReferentielRow>(
      `
        SELECT *
        FROM public.parametres_referentiels
        WHERE id = $1
          AND client_id = $2
        LIMIT 1
      `,
      [id, actor.tenantId]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException('Référentiel non trouvé');
    }

    return this.mapRowToView(row);
  }

  async create(actor: AuthenticatedUser, payload: CreateReferentielDto) {
    const result = await this.postgresService.query<{ id: string }>(
      `
        INSERT INTO public.parametres_referentiels (
          client_id,
          categorie,
          code,
          libelle,
          description,
          ordre,
          actif,
          modifiable,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `,
      [
        actor.tenantId,
        payload.categorie,
        payload.code,
        payload.libelle,
        payload.description?.trim() || null,
        payload.ordre,
        payload.actif,
        payload.modifiable,
        actor.sub
      ]
    );

    const id = result.rows[0]?.id;
    if (!id) {
      throw new NotFoundException('Référentiel non créé');
    }

    return this.getById(actor, id);
  }

  async update(actor: AuthenticatedUser, id: string, payload: UpdateReferentielDto) {
    await this.getById(actor, id);

    const keys = Object.keys(payload) as Array<keyof UpdateReferentielDto>;
    if (keys.length === 0) {
      return this.getById(actor, id);
    }

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    for (const key of keys) {
      const value = payload[key];
      if (value === undefined) continue;

      setClauses.push(`${this.mapUpdateKeyToColumn(key)} = $${index}`);
      values.push(typeof value === 'string' ? (value.trim() ? value.trim() : null) : value);
      index += 1;
    }

    if (setClauses.length === 0) {
      return this.getById(actor, id);
    }

    setClauses.push('updated_at = now()');
    values.push(id, actor.tenantId);

    const result = await this.postgresService.query(
      `
        UPDATE public.parametres_referentiels
        SET ${setClauses.join(', ')}
        WHERE id = $${index}
          AND client_id = $${index + 1}
      `,
      values
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new NotFoundException('Référentiel non trouvé');
    }

    return this.getById(actor, id);
  }

  async delete(actor: AuthenticatedUser, id: string): Promise<void> {
    const result = await this.postgresService.query(
      `
        DELETE FROM public.parametres_referentiels
        WHERE id = $1
          AND client_id = $2
      `,
      [id, actor.tenantId]
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new NotFoundException('Référentiel non trouvé');
    }
  }

  async reorder(actor: AuthenticatedUser, categorie: ReferentielCategorie, orderedIds: string[]): Promise<void> {
    if (orderedIds.length === 0) {
      return;
    }

    await this.postgresService.query(
      `
        UPDATE public.parametres_referentiels pr
        SET
          ordre = data.new_ordre,
          updated_at = now()
        FROM (
          SELECT
            unnest($1::uuid[]) AS id,
            generate_subscripts($1::uuid[], 1) - 1 AS new_ordre
        ) AS data
        WHERE pr.id = data.id
          AND pr.client_id = $2
          AND pr.categorie = $3
      `,
      [orderedIds, actor.tenantId, categorie]
    );
  }

  private mapUpdateKeyToColumn(key: keyof UpdateReferentielDto): string {
    const map: Record<keyof UpdateReferentielDto, string> = {
      code: 'code',
      libelle: 'libelle',
      description: 'description',
      ordre: 'ordre',
      actif: 'actif',
      modifiable: 'modifiable'
    };

    return map[key];
  }

  private mapRowToView(row: ReferentielRow) {
    return {
      id: row.id,
      clientId: row.client_id,
      categorie: row.categorie,
      code: row.code,
      libelle: row.libelle,
      description: row.description ?? undefined,
      ordre: Number(row.ordre ?? 0),
      actif: row.actif,
      modifiable: row.modifiable,
      createdAt: this.toIsoString(row.created_at),
      updatedAt: this.toIsoString(row.updated_at),
      createdBy: row.created_by ?? undefined
    };
  }

  private toIsoString(value: Date | string): string {
    if (value instanceof Date) {
      return value.toISOString();
    }

    return value;
  }
}
