import { Injectable, NotFoundException } from '@nestjs/common';
import { PostgresService } from '../common/postgres.service';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import type { CreateCompteTresorerieDto, UpdateCompteTresorerieDto } from './dto/comptes-tresorerie.dto';

interface CompteTresorerieRow {
  id: string;
  client_id: string;
  code: string;
  libelle: string;
  type: 'banque' | 'caisse';
  banque: string | null;
  numero_compte: string | null;
  devise: string;
  solde_initial: string | number;
  solde_actuel: string | number;
  statut: 'actif' | 'inactif' | 'cloture';
  date_ouverture: string;
  date_cloture: string | null;
  observations: string | null;
  created_by: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface CompteTresorerieView {
  id: string;
  clientId: string;
  code: string;
  libelle: string;
  type: 'banque' | 'caisse';
  banque?: string;
  numeroCompte?: string;
  devise: string;
  soldeInitial: number;
  soldeActuel: number;
  statut: 'actif' | 'inactif' | 'cloture';
  dateOuverture: string;
  dateCloture?: string;
  observations?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class ComptesTresorerieService {
  constructor(private readonly postgresService: PostgresService) {}

  async getAll(actor: AuthenticatedUser): Promise<CompteTresorerieView[]> {
    const result = await this.postgresService.query<CompteTresorerieRow>(
      `
        SELECT *
        FROM public.comptes_tresorerie
        WHERE client_id = $1
        ORDER BY created_at DESC
      `,
      [actor.tenantId]
    );

    return result.rows.map((row) => this.mapRowToView(row));
  }

  async getById(actor: AuthenticatedUser, id: string): Promise<CompteTresorerieView> {
    const result = await this.postgresService.query<CompteTresorerieRow>(
      `
        SELECT *
        FROM public.comptes_tresorerie
        WHERE id = $1
          AND client_id = $2
        LIMIT 1
      `,
      [id, actor.tenantId]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException('Compte de trésorerie introuvable');
    }

    return this.mapRowToView(row);
  }

  async getActifs(actor: AuthenticatedUser): Promise<CompteTresorerieView[]> {
    const result = await this.postgresService.query<CompteTresorerieRow>(
      `
        SELECT *
        FROM public.comptes_tresorerie
        WHERE client_id = $1
          AND statut = 'actif'
        ORDER BY type ASC, libelle ASC
      `,
      [actor.tenantId]
    );

    return result.rows.map((row) => this.mapRowToView(row));
  }

  async create(actor: AuthenticatedUser, payload: CreateCompteTresorerieDto): Promise<CompteTresorerieView> {
    const result = await this.postgresService.query<CompteTresorerieRow>(
      `
        INSERT INTO public.comptes_tresorerie (
          client_id, code, libelle, type, banque, numero_compte, devise,
          solde_initial, solde_actuel, statut, date_ouverture, observations, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13
        )
        RETURNING *
      `,
      [
        actor.tenantId,
        payload.code,
        payload.libelle,
        payload.type,
        payload.banque ?? null,
        payload.numeroCompte ?? null,
        payload.devise ?? 'XOF',
        payload.soldeInitial,
        payload.soldeInitial,
        payload.statut ?? 'actif',
        payload.dateOuverture,
        payload.observations ?? null,
        actor.sub
      ]
    );

    return this.mapRowToView(result.rows[0]);
  }

  async update(actor: AuthenticatedUser, id: string, payload: UpdateCompteTresorerieDto): Promise<void> {
    const keys = Object.keys(payload) as Array<keyof UpdateCompteTresorerieDto>;
    if (keys.length === 0) {
      return;
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

    const result = await this.postgresService.query(
      `
        UPDATE public.comptes_tresorerie
        SET ${setClauses.join(', ')}
        WHERE id = $${index}
          AND client_id = $${index + 1}
      `,
      values
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new NotFoundException('Compte de trésorerie introuvable');
    }
  }

  async delete(actor: AuthenticatedUser, id: string): Promise<void> {
    const result = await this.postgresService.query(
      `
        DELETE FROM public.comptes_tresorerie
        WHERE id = $1
          AND client_id = $2
      `,
      [id, actor.tenantId]
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new NotFoundException('Compte de trésorerie introuvable');
    }
  }

  private mapUpdateKeyToColumn(key: keyof UpdateCompteTresorerieDto): string {
    const map: Record<keyof UpdateCompteTresorerieDto, string> = {
      code: 'code',
      libelle: 'libelle',
      type: 'type',
      banque: 'banque',
      numeroCompte: 'numero_compte',
      devise: 'devise',
      soldeInitial: 'solde_initial',
      dateOuverture: 'date_ouverture',
      observations: 'observations',
      statut: 'statut',
      dateCloture: 'date_cloture'
    };

    return map[key];
  }

  private mapRowToView(row: CompteTresorerieRow): CompteTresorerieView {
    return {
      id: row.id,
      clientId: row.client_id,
      code: row.code,
      libelle: row.libelle,
      type: row.type,
      banque: row.banque ?? undefined,
      numeroCompte: row.numero_compte ?? undefined,
      devise: row.devise,
      soldeInitial: Number(row.solde_initial ?? 0),
      soldeActuel: Number(row.solde_actuel ?? 0),
      statut: row.statut,
      dateOuverture: row.date_ouverture,
      dateCloture: row.date_cloture ?? undefined,
      observations: row.observations ?? undefined,
      createdBy: row.created_by ?? undefined,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString()
    };
  }
}
