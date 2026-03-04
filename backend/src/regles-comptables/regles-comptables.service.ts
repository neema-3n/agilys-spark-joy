import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PostgresService } from '../common/postgres.service';
import type { CreateRegleComptableDto, UpdateRegleComptableDto } from './dto/regles-comptables.dto';

interface RegleRow {
  id: string;
  client_id: string;
  code: string;
  nom: string;
  description: string | null;
  date_debut: Date | string | null;
  date_fin: Date | string | null;
  permanente: boolean;
  type_operation: 'reservation' | 'engagement' | 'bon_commande' | 'facture' | 'depense' | 'paiement';
  conditions: unknown;
  compte_debit_id: string;
  compte_credit_id: string;
  actif: boolean;
  ordre: number;
  created_at: Date | string;
  updated_at: Date | string;
  created_by: string | null;
  compte_debit_numero: string | null;
  compte_debit_libelle: string | null;
  compte_credit_numero: string | null;
  compte_credit_libelle: string | null;
}

@Injectable()
export class ReglesComptablesService {
  constructor(private readonly postgresService: PostgresService) {}

  async getAll(
    actor: AuthenticatedUser,
    typeOperation?: 'reservation' | 'engagement' | 'bon_commande' | 'facture' | 'depense' | 'paiement'
  ) {
    const values: unknown[] = [actor.tenantId];
    let whereSql = 'WHERE rc.client_id = $1';

    if (typeOperation) {
      values.push(typeOperation);
      whereSql += '\n  AND rc.type_operation = $2';
    }

    const result = await this.postgresService.query<RegleRow>(
      this.baseSelect() +
        `
${whereSql}
ORDER BY rc.ordre ASC
        `,
      values
    );

    return result.rows.map((row) => this.mapRowToView(row));
  }

  async getById(actor: AuthenticatedUser, id: string) {
    const result = await this.postgresService.query<RegleRow>(
      this.baseSelect() +
        `
          WHERE rc.client_id = $1
            AND rc.id = $2
          LIMIT 1
        `,
      [actor.tenantId, id]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException('Règle comptable introuvable');
    }

    return this.mapRowToView(row);
  }

  async create(actor: AuthenticatedUser, payload: CreateRegleComptableDto) {
    const result = await this.postgresService.query<{ id: string }>(
      `
        INSERT INTO public.regles_comptables (
          client_id,
          code,
          nom,
          description,
          date_debut,
          date_fin,
          permanente,
          type_operation,
          conditions,
          compte_debit_id,
          compte_credit_id,
          actif,
          ordre,
          created_by
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9::jsonb,
          $10,
          $11,
          $12,
          $13,
          $14
        )
        RETURNING id
      `,
      [
        actor.tenantId,
        payload.code,
        payload.nom,
        payload.description?.trim() || null,
        payload.dateDebut?.trim() || null,
        payload.dateFin?.trim() || null,
        payload.permanente,
        payload.typeOperation,
        JSON.stringify(payload.conditions || []),
        payload.compteDebitId,
        payload.compteCreditId,
        payload.actif ?? true,
        payload.ordre ?? 0,
        actor.sub
      ]
    );

    const id = result.rows[0]?.id;
    if (!id) {
      throw new NotFoundException('Règle comptable non créée');
    }

    return this.getById(actor, id);
  }

  async update(actor: AuthenticatedUser, id: string, payload: UpdateRegleComptableDto) {
    await this.getById(actor, id);

    const keys = Object.keys(payload) as Array<keyof UpdateRegleComptableDto>;
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
      values.push(this.normalizeUpdateValue(key, value));
      index += 1;
    }

    if (setClauses.length === 0) {
      return this.getById(actor, id);
    }

    setClauses.push('updated_at = now()');
    values.push(id, actor.tenantId);

    const result = await this.postgresService.query(
      `
        UPDATE public.regles_comptables
        SET ${setClauses.join(', ')}
        WHERE id = $${index}
          AND client_id = $${index + 1}
      `,
      values
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new NotFoundException('Règle comptable introuvable');
    }

    return this.getById(actor, id);
  }

  async delete(actor: AuthenticatedUser, id: string): Promise<void> {
    const result = await this.postgresService.query(
      `
        DELETE FROM public.regles_comptables
        WHERE id = $1
          AND client_id = $2
      `,
      [id, actor.tenantId]
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new NotFoundException('Règle comptable introuvable');
    }
  }

  async reorder(
    actor: AuthenticatedUser,
    typeOperation: 'reservation' | 'engagement' | 'bon_commande' | 'facture' | 'depense' | 'paiement',
    orderedIds: string[]
  ): Promise<void> {
    if (orderedIds.length === 0) {
      return;
    }

    await this.postgresService.query(
      `
        UPDATE public.regles_comptables rc
        SET
          ordre = data.new_ordre,
          updated_at = now()
        FROM (
          SELECT
            unnest($1::uuid[]) AS id,
            generate_subscripts($1::uuid[], 1) - 1 AS new_ordre
        ) AS data
        WHERE rc.id = data.id
          AND rc.client_id = $2
          AND rc.type_operation = $3
      `,
      [orderedIds, actor.tenantId, typeOperation]
    );
  }

  private baseSelect(): string {
    return `
      SELECT
        rc.*,
        cd.numero AS compte_debit_numero,
        cd.libelle AS compte_debit_libelle,
        cc.numero AS compte_credit_numero,
        cc.libelle AS compte_credit_libelle
      FROM public.regles_comptables rc
      LEFT JOIN public.comptes cd ON cd.id = rc.compte_debit_id
      LEFT JOIN public.comptes cc ON cc.id = rc.compte_credit_id
    `;
  }

  private mapUpdateKeyToColumn(key: keyof UpdateRegleComptableDto): string {
    const map: Record<keyof UpdateRegleComptableDto, string> = {
      nom: 'nom',
      description: 'description',
      dateDebut: 'date_debut',
      dateFin: 'date_fin',
      permanente: 'permanente',
      conditions: 'conditions',
      compteDebitId: 'compte_debit_id',
      compteCreditId: 'compte_credit_id',
      actif: 'actif',
      ordre: 'ordre'
    };

    return map[key];
  }

  private normalizeUpdateValue(key: keyof UpdateRegleComptableDto, value: unknown): unknown {
    if (key === 'conditions') {
      return JSON.stringify(value ?? []);
    }

    if (typeof value === 'string') {
      if (['description', 'dateDebut', 'dateFin'].includes(key)) {
        return value.trim() ? value.trim() : null;
      }

      return value;
    }

    return value;
  }

  private mapRowToView(row: RegleRow) {
    return {
      id: row.id,
      clientId: row.client_id,
      code: row.code,
      nom: row.nom,
      description: row.description ?? undefined,
      dateDebut: row.date_debut ? this.toDateOnly(row.date_debut) : undefined,
      dateFin: row.date_fin ? this.toDateOnly(row.date_fin) : undefined,
      permanente: row.permanente,
      typeOperation: row.type_operation,
      conditions: Array.isArray(row.conditions) ? row.conditions : [],
      compteDebitId: row.compte_debit_id,
      compteCreditId: row.compte_credit_id,
      actif: row.actif,
      ordre: Number(row.ordre ?? 0),
      createdAt: this.toIsoString(row.created_at),
      updatedAt: this.toIsoString(row.updated_at),
      createdBy: row.created_by ?? undefined,
      compteDebit:
        row.compte_debit_numero && row.compte_debit_libelle
          ? { numero: row.compte_debit_numero, libelle: row.compte_debit_libelle }
          : undefined,
      compteCredit:
        row.compte_credit_numero && row.compte_credit_libelle
          ? { numero: row.compte_credit_numero, libelle: row.compte_credit_libelle }
          : undefined
    };
  }

  private toDateOnly(value: Date | string): string {
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }

    return value.slice(0, 10);
  }

  private toIsoString(value: Date | string): string {
    if (value instanceof Date) {
      return value.toISOString();
    }

    return value;
  }
}
