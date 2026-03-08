import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PostgresService } from '../common/postgres.service';
import type { CreateRegleComptableDto, UpdateRegleComptableDto } from './dto/regles-comptables.dto';

type TypeOperation = 'reservation' | 'engagement' | 'bon_commande' | 'facture' | 'depense' | 'paiement';
type VersionStatus = 'draft' | 'published' | 'archived';
type ConditionValue = string | number | boolean;

interface RegleCondition {
  champ: string;
  operateur: string;
  valeur: ConditionValue;
}

interface RegleRow {
  id: string;
  client_id: string;
  code: string;
  nom: string;
  description: string | null;
  date_debut: Date | string | null;
  date_fin: Date | string | null;
  permanente: boolean;
  type_operation: TypeOperation;
  conditions: unknown;
  compte_debit_id: string;
  compte_credit_id: string;
  actif: boolean;
  ordre: number;
  version_group_id: string;
  version_number: number;
  version_status: VersionStatus;
  change_reason: string | null;
  published_at: Date | string | null;
  archived_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  created_by: string | null;
  compte_debit_numero: string | null;
  compte_debit_libelle: string | null;
  compte_credit_numero: string | null;
  compte_credit_libelle: string | null;
}

interface ExistingRegleRow {
  id: string;
  code: string;
  nom: string;
  ordre: number;
  date_debut: Date | string | null;
  date_fin: Date | string | null;
  permanente: boolean;
  version_status: VersionStatus;
  conditions: unknown;
}

interface CountRow {
  count: string;
}

type CreateOrUpdatePayload = CreateRegleComptableDto | UpdateRegleComptableDto;

@Injectable()
export class ReglesComptablesService {
  constructor(private readonly postgresService: PostgresService) {}

  async getAll(actor: AuthenticatedUser, typeOperation?: TypeOperation) {
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
ORDER BY
  CASE rc.version_status
    WHEN 'published' THEN 0
    WHEN 'draft' THEN 1
    ELSE 2
  END,
  rc.ordre ASC,
  rc.version_number DESC,
  rc.created_at DESC
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
      throw new NotFoundException('Regle comptable introuvable');
    }

    return this.mapRowToView(row);
  }

  async create(actor: AuthenticatedUser, payload: CreateRegleComptableDto) {
    await this.validatePayload(actor, payload);

    const versionStatus = payload.versionStatus ?? 'draft';
    const publishedAt = versionStatus === 'published' ? new Date().toISOString() : null;

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
          version_group_id,
          version_number,
          version_status,
          change_reason,
          published_at,
          created_by,
          updated_by
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
          gen_random_uuid(),
          1,
          $14,
          $15,
          $16,
          $17,
          $18
        )
        RETURNING id
      `,
      [
        actor.tenantId,
        payload.code.trim(),
        payload.nom.trim(),
        payload.description?.trim() || null,
        payload.permanente ? null : payload.dateDebut?.trim() || null,
        payload.permanente ? null : payload.dateFin?.trim() || null,
        payload.permanente,
        payload.typeOperation,
        JSON.stringify(payload.conditions || []),
        payload.compteDebitId,
        payload.compteCreditId,
        payload.actif ?? true,
        payload.ordre ?? 0,
        versionStatus,
        payload.changeReason?.trim() || null,
        publishedAt,
        actor.sub,
        actor.sub
      ]
    );

    const id = result.rows[0]?.id;
    if (!id) {
      throw new NotFoundException('Regle comptable non creee');
    }

    return this.getById(actor, id);
  }

  async update(actor: AuthenticatedUser, id: string, payload: UpdateRegleComptableDto) {
    const current = await this.getById(actor, id);

    const keys = Object.keys(payload) as Array<keyof UpdateRegleComptableDto>;
    if (keys.length === 0) {
      return current;
    }

    const mergedPayload = {
      code: current.code,
      nom: payload.nom ?? current.nom,
      description: payload.description ?? current.description,
      dateDebut: payload.dateDebut ?? current.dateDebut,
      dateFin: payload.dateFin ?? current.dateFin,
      permanente: payload.permanente ?? current.permanente,
      typeOperation: current.typeOperation,
      conditions: payload.conditions ?? current.conditions,
      compteDebitId: payload.compteDebitId ?? current.compteDebitId,
      compteCreditId: payload.compteCreditId ?? current.compteCreditId,
      actif: payload.actif ?? current.actif,
      ordre: payload.ordre ?? current.ordre,
      versionStatus: payload.versionStatus ?? current.versionStatus,
      changeReason: payload.changeReason ?? current.changeReason
    } satisfies CreateRegleComptableDto;

    await this.validatePayload(actor, mergedPayload, id);

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    for (const key of keys) {
      const value = payload[key];
      if (value === undefined) {
        continue;
      }

      if (key === 'versionStatus' && value === 'published') {
        setClauses.push(`published_at = COALESCE(published_at, now())`);
      }

      if (key === 'versionStatus' && value === 'archived') {
        setClauses.push(`archived_at = COALESCE(archived_at, now())`);
      }

      setClauses.push(`${this.mapUpdateKeyToColumn(key)} = $${index}`);
      values.push(this.normalizeUpdateValue(key, value));
      index += 1;
    }

    if (setClauses.length === 0) {
      return current;
    }

    setClauses.push('updated_at = now()', `updated_by = $${index}`);
    values.push(actor.sub);
    index += 1;
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
      throw new NotFoundException('Regle comptable introuvable');
    }

    return this.getById(actor, id);
  }

  async delete(actor: AuthenticatedUser, id: string): Promise<void> {
    const current = await this.getById(actor, id);
    if (current.versionStatus === 'published') {
      throw new ConflictException('Une version publiee ne peut pas etre supprimee. Archivez-la ou desactivez-la.');
    }

    const result = await this.postgresService.query(
      `
        DELETE FROM public.regles_comptables
        WHERE id = $1
          AND client_id = $2
      `,
      [id, actor.tenantId]
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new NotFoundException('Regle comptable introuvable');
    }
  }

  async reorder(actor: AuthenticatedUser, typeOperation: TypeOperation, orderedIds: string[]): Promise<void> {
    if (orderedIds.length === 0) {
      return;
    }

    await this.postgresService.query(
      `
        UPDATE public.regles_comptables rc
        SET
          ordre = data.new_ordre,
          updated_at = now(),
          updated_by = $4
        FROM (
          SELECT
            unnest($1::uuid[]) AS id,
            generate_subscripts($1::uuid[], 1) - 1 AS new_ordre
        ) AS data
        WHERE rc.id = data.id
          AND rc.client_id = $2
          AND rc.type_operation = $3
          AND rc.version_status <> 'archived'
      `,
      [orderedIds, actor.tenantId, typeOperation, actor.sub]
    );
  }

  private async validatePayload(actor: AuthenticatedUser, payload: CreateRegleComptableDto, currentId?: string) {
    if (!payload.permanente && !payload.dateDebut) {
      throw new BadRequestException("La date de debut est obligatoire pour une regle non permanente.");
    }

    if (!payload.permanente && payload.dateDebut && payload.dateFin && payload.dateFin < payload.dateDebut) {
      throw new BadRequestException("La date de fin doit etre posterieure ou egale a la date de debut.");
    }

    if (payload.compteDebitId === payload.compteCreditId) {
      throw new BadRequestException('Les comptes de debit et de credit doivent etre distincts.');
    }

    await this.assertCompteBelongsToTenant(actor.tenantId, payload.compteDebitId, 'debit');
    await this.assertCompteBelongsToTenant(actor.tenantId, payload.compteCreditId, 'credit');
    await this.assertNoPublishedConflict(actor.tenantId, payload, currentId);
  }

  private async assertCompteBelongsToTenant(tenantId: string, compteId: string, role: 'debit' | 'credit') {
    const result = await this.postgresService.query<CountRow>(
      `
        SELECT COUNT(*)::text AS count
        FROM public.comptes
        WHERE id = $1
          AND client_id = $2
      `,
      [compteId, tenantId]
    );

    if (Number(result.rows[0]?.count ?? '0') === 0) {
      throw new BadRequestException(`Le compte de ${role} doit appartenir au tenant courant.`);
    }
  }

  private async assertNoPublishedConflict(tenantId: string, payload: CreateRegleComptableDto, currentId?: string) {
    if ((payload.versionStatus ?? 'draft') !== 'published' || payload.actif === false) {
      return;
    }

    const values: unknown[] = [tenantId, payload.typeOperation];
    let exclusionSql = '';

    if (currentId) {
      values.push(currentId);
      exclusionSql = `AND rc.id <> $${values.length}`;
    }

    const result = await this.postgresService.query<ExistingRegleRow>(
      `
        SELECT
          rc.id,
          rc.code,
          rc.nom,
          rc.ordre,
          rc.date_debut,
          rc.date_fin,
          rc.permanente,
          rc.version_status,
          rc.conditions
        FROM public.regles_comptables rc
        WHERE rc.client_id = $1
          AND rc.type_operation = $2
          AND rc.actif = TRUE
          AND rc.version_status = 'published'
          ${exclusionSql}
      `,
      values
    );

    const nextConditions = this.normalizeConditions(payload.conditions);
    const nextStart = payload.permanente ? null : payload.dateDebut ?? null;
    const nextEnd = payload.permanente ? null : payload.dateFin ?? null;

    const conflict = result.rows.find((row) => {
      const samePriority = Number(row.ordre ?? 0) === Number(payload.ordre ?? 0);
      const sameConditions = this.normalizeConditions(row.conditions).join('|') === nextConditions.join('|');
      return samePriority && sameConditions && this.periodsOverlap(row, nextStart, nextEnd, payload.permanente);
    });

    if (conflict) {
      throw new ConflictException(
        `Conflit de version publiee avec la regle ${conflict.code}. Ajustez la priorite, les conditions ou la periode d'effet.`
      );
    }
  }

  private periodsOverlap(
    current: Pick<ExistingRegleRow, 'date_debut' | 'date_fin' | 'permanente'>,
    nextStart: string | null,
    nextEnd: string | null,
    nextPermanente: boolean
  ) {
    if (current.permanente || nextPermanente) {
      return true;
    }

    const currentStart = current.date_debut ? this.toDateOnly(current.date_debut) : '0001-01-01';
    const currentEnd = current.date_fin ? this.toDateOnly(current.date_fin) : '9999-12-31';
    const candidateStart = nextStart ?? '0001-01-01';
    const candidateEnd = nextEnd ?? '9999-12-31';

    return currentStart <= candidateEnd && candidateStart <= currentEnd;
  }

  private normalizeConditions(input: unknown): string[] {
    if (!Array.isArray(input)) {
      return [];
    }

    return (input as RegleCondition[])
      .map((condition) => JSON.stringify({
        champ: condition.champ,
        operateur: condition.operateur,
        valeur: condition.valeur
      }))
      .sort();
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
      ordre: 'ordre',
      versionStatus: 'version_status',
      changeReason: 'change_reason'
    };

    return map[key];
  }

  private normalizeUpdateValue(key: keyof UpdateRegleComptableDto, value: unknown): unknown {
    if (key === 'conditions') {
      return JSON.stringify(value ?? []);
    }

    if (typeof value === 'string') {
      if (['description', 'dateDebut', 'dateFin', 'changeReason'].includes(key)) {
        return value.trim() ? value.trim() : null;
      }

      return value.trim();
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
      versionGroupId: row.version_group_id,
      versionNumber: Number(row.version_number ?? 1),
      versionStatus: row.version_status,
      changeReason: row.change_reason ?? undefined,
      publishedAt: row.published_at ? this.toIsoString(row.published_at) : undefined,
      archivedAt: row.archived_at ? this.toIsoString(row.archived_at) : undefined,
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
