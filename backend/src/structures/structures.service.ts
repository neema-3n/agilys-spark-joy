import { Injectable, NotFoundException } from '@nestjs/common';
import { PostgresService } from '../common/postgres.service';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import type { CreateStructureDto, UpdateStructureDto } from './dto/structures.dto';

interface StructureRow {
  id: string;
  client_id: string;
  exercice_id: string | null;
  code: string;
  nom: string;
  type: 'entite' | 'service' | 'centre_cout' | 'direction';
  parent_id: string | null;
  responsable: string | null;
  statut: 'actif' | 'inactif';
  created_at: Date | string;
  updated_at: Date | string;
}

interface StructureView {
  id: string;
  clientId: string;
  exerciceId?: string;
  code: string;
  nom: string;
  type: 'entite' | 'service' | 'centre_cout' | 'direction';
  parentId?: string;
  responsable?: string;
  statut: 'actif' | 'inactif';
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class StructuresService {
  constructor(private readonly postgresService: PostgresService) {}

  async getAll(actor: AuthenticatedUser, exerciceId?: string): Promise<StructureView[]> {
    const values: unknown[] = [actor.tenantId];
    let query = `
      SELECT *
      FROM public.structures
      WHERE client_id = $1
    `;

    if (exerciceId) {
      query += ` AND exercice_id = $2`;
      values.push(exerciceId);
    }

    query += ` ORDER BY code ASC`;

    const result = await this.postgresService.query<StructureRow>(query, values);
    return result.rows.map((row) => this.mapRowToView(row));
  }

  async getById(actor: AuthenticatedUser, id: string): Promise<StructureView> {
    const result = await this.postgresService.query<StructureRow>(
      `
        SELECT *
        FROM public.structures
        WHERE id = $1
          AND client_id = $2
        LIMIT 1
      `,
      [id, actor.tenantId]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException('Structure introuvable');
    }

    return this.mapRowToView(row);
  }

  async create(actor: AuthenticatedUser, payload: CreateStructureDto): Promise<StructureView> {
    const result = await this.postgresService.query<StructureRow>(
      `
        INSERT INTO public.structures (
          client_id, exercice_id, code, nom, type, parent_id, responsable, statut, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9
        )
        RETURNING *
      `,
      [
        actor.tenantId,
        payload.exerciceId ?? null,
        payload.code,
        payload.nom,
        payload.type,
        payload.parentId ?? null,
        payload.responsable ?? null,
        payload.statut ?? 'actif',
        actor.sub
      ]
    );

    return this.mapRowToView(result.rows[0]);
  }

  async update(actor: AuthenticatedUser, id: string, payload: UpdateStructureDto): Promise<StructureView> {
    const keys = Object.keys(payload) as Array<keyof UpdateStructureDto>;
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

      setClauses.push(`${this.mapUpdateKeyToColumn(key)} = $${index}`);
      values.push(value);
      index += 1;
    }

    setClauses.push('updated_at = now()');
    values.push(id, actor.tenantId);

    const result = await this.postgresService.query<StructureRow>(
      `
        UPDATE public.structures
        SET ${setClauses.join(', ')}
        WHERE id = $${index}
          AND client_id = $${index + 1}
        RETURNING *
      `,
      values
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException('Structure introuvable');
    }

    return this.mapRowToView(row);
  }

  async delete(actor: AuthenticatedUser, id: string): Promise<void> {
    const result = await this.postgresService.query(
      `
        DELETE FROM public.structures
        WHERE id = $1
          AND client_id = $2
      `,
      [id, actor.tenantId]
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new NotFoundException('Structure introuvable');
    }
  }

  private mapUpdateKeyToColumn(key: keyof UpdateStructureDto): string {
    const map: Record<keyof UpdateStructureDto, string> = {
      code: 'code',
      nom: 'nom',
      type: 'type',
      parentId: 'parent_id',
      responsable: 'responsable',
      statut: 'statut'
    };

    return map[key];
  }

  private mapRowToView(row: StructureRow): StructureView {
    return {
      id: row.id,
      clientId: row.client_id,
      exerciceId: row.exercice_id ?? undefined,
      code: row.code,
      nom: row.nom,
      type: row.type,
      parentId: row.parent_id ?? undefined,
      responsable: row.responsable ?? undefined,
      statut: row.statut,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString()
    };
  }
}
