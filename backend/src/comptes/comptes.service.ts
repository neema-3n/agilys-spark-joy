import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PostgresService } from '../common/postgres.service';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import type { CreateCompteDto, ImportComptesCsvDto, UpdateCompteDto } from './dto/comptes.dto';

interface CompteRow {
  id: string;
  client_id: string;
  numero: string;
  libelle: string;
  type: 'actif' | 'passif' | 'charge' | 'produit' | 'resultat';
  categorie:
    | 'immobilisation'
    | 'stock'
    | 'creance'
    | 'tresorerie'
    | 'dette'
    | 'capital'
    | 'exploitation'
    | 'financier'
    | 'exceptionnel'
    | 'autre';
  parent_id: string | null;
  niveau: number;
  statut: 'actif' | 'inactif';
  version_group_id: string;
  version_number: number;
  version_status: 'draft' | 'published' | 'archived';
  effective_start_date: string | null;
  effective_end_date: string | null;
  change_reason: string | null;
  published_at: Date | string | null;
  archived_at: Date | string | null;
  superseded_by_id: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  created_by: string | null;
}

interface CompteView {
  id: string;
  clientId: string;
  numero: string;
  libelle: string;
  type: CompteRow['type'];
  categorie: CompteRow['categorie'];
  parentId?: string;
  niveau: number;
  statut: CompteRow['statut'];
  versionGroupId: string;
  versionNumber: number;
  versionStatus: CompteRow['version_status'];
  effectiveStartDate?: string;
  effectiveEndDate?: string;
  changeReason?: string;
  publishedAt?: string;
  archivedAt?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

type CompteVersionStatus = CompteRow['version_status'];

interface CsvCompteRow {
  code: string;
  intitule: string;
  nbChiffres: number;
  codeParent?: string;
}

interface EnrichedCompteRow extends CsvCompteRow {
  niveau: number;
  type: CompteRow['type'];
  categorie: CompteRow['categorie'];
}

interface ImportComptesReport {
  success: boolean;
  stats: {
    total: number;
    created: number;
    skipped: number;
    errors: Array<{ code: string; error: string }>;
  };
  byLevel: Record<number, { created: number; skipped: number }>;
}

@Injectable()
export class ComptesService {
  constructor(private readonly postgresService: PostgresService) {}

  async getAll(actor: AuthenticatedUser): Promise<CompteView[]> {
    const result = await this.postgresService.query<CompteRow>(
      `
        SELECT *
        FROM public.comptes
        WHERE client_id = $1
          AND superseded_by_id IS NULL
        ORDER BY numero ASC
      `,
      [actor.tenantId]
    );

    return result.rows.map((row) => this.mapRowToView(row));
  }

  async getById(actor: AuthenticatedUser, id: string): Promise<CompteView> {
    const result = await this.postgresService.query<CompteRow>(
      `
        SELECT *
        FROM public.comptes
        WHERE id = $1
          AND client_id = $2
        LIMIT 1
      `,
      [id, actor.tenantId]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException('Compte introuvable');
    }

    return this.mapRowToView(row);
  }

  async create(actor: AuthenticatedUser, payload: CreateCompteDto): Promise<CompteView> {
    this.validateEffectiveDates(payload.effectiveStartDate, payload.effectiveEndDate);
    this.validateVersionMetadata(payload.versionStatus ?? 'draft', payload.changeReason);
    await this.ensureNumeroIsAvailable(actor, payload.numero);

    const versionStatus = payload.versionStatus ?? 'draft';
    const publishedAt = versionStatus === 'published' ? new Date().toISOString() : null;
    const archivedAt = versionStatus === 'archived' ? new Date().toISOString() : null;

    const result = await this.postgresService.query<CompteRow>(
      `
        INSERT INTO public.comptes (
          client_id,
          numero,
          libelle,
          type,
          categorie,
          parent_id,
          niveau,
          statut,
          version_status,
          effective_start_date,
          effective_end_date,
          change_reason,
          published_at,
          archived_at,
          created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
        )
        RETURNING *
      `,
      [
        actor.tenantId,
        payload.numero,
        payload.libelle,
        payload.type,
        payload.categorie,
        payload.parentId ?? null,
        payload.niveau ?? 1,
        payload.statut ?? 'actif',
        versionStatus,
        payload.effectiveStartDate ?? null,
        payload.effectiveEndDate ?? null,
        payload.changeReason?.trim() || null,
        publishedAt,
        archivedAt,
        actor.sub
      ]
    );

    return this.mapRowToView(result.rows[0]);
  }

  async update(actor: AuthenticatedUser, id: string, payload: UpdateCompteDto): Promise<CompteView> {
    const current = await this.getById(actor, id);
    const keys = Object.keys(payload) as Array<keyof UpdateCompteDto>;
    if (keys.length === 0) {
      return current;
    }

    const nextVersionStatus = payload.versionStatus ?? current.versionStatus;
    const nextEffectiveStartDate = payload.effectiveStartDate ?? current.effectiveStartDate;
    const nextEffectiveEndDate = payload.effectiveEndDate ?? current.effectiveEndDate;
    const nextNumero = payload.numero ?? current.numero;
    this.validateEffectiveDates(nextEffectiveStartDate, nextEffectiveEndDate);
    this.validateVersionMetadata(nextVersionStatus, payload.changeReason ?? current.changeReason);

    if (current.versionStatus === 'published') {
      await this.ensureNumeroIsAvailable(actor, nextNumero, { excludeVersionGroupId: current.versionGroupId });
      return this.createSuccessorVersion(actor, current, payload, nextVersionStatus, nextEffectiveStartDate, nextEffectiveEndDate);
    }

    await this.ensureNumeroIsAvailable(actor, nextNumero, { excludeCompteId: current.id });

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    for (const key of keys) {
      const value = payload[key];
      if (value === undefined) {
        continue;
      }

      setClauses.push(`${this.mapUpdateKeyToColumn(key)} = $${index}`);
      values.push(this.normalizeUpdateValue(key, value));
      index += 1;

      if (key === 'versionStatus' && value === 'published') {
        setClauses.push('published_at = COALESCE(published_at, now())');
      }

      if (key === 'versionStatus' && value === 'archived') {
        setClauses.push('archived_at = COALESCE(archived_at, now())');
      }
    }

    setClauses.push('updated_at = now()');
    values.push(id, actor.tenantId);

    const result = await this.postgresService.query<CompteRow>(
      `
        UPDATE public.comptes
        SET ${setClauses.join(', ')}
        WHERE id = $${index}
          AND client_id = $${index + 1}
        RETURNING *
      `,
      values
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException('Compte introuvable');
    }

    return this.mapRowToView(row);
  }

  async delete(actor: AuthenticatedUser, id: string): Promise<void> {
    const current = await this.getById(actor, id);
    if (current.versionStatus === 'published') {
      throw new ConflictException('Une version publiee du plan comptable ne peut pas etre supprimee. Creez une nouvelle version ou archivez-la.');
    }

    const result = await this.postgresService.query(
      `
        DELETE FROM public.comptes
        WHERE id = $1
          AND client_id = $2
      `,
      [id, actor.tenantId]
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new NotFoundException('Compte introuvable');
    }
  }

  async deleteAll(actor: AuthenticatedUser): Promise<number> {
    const publishedVersions = await this.postgresService.query<{ count: string }>(
      `
        SELECT COUNT(*)::text AS count
        FROM public.comptes
        WHERE client_id = $1
          AND version_status = 'published'
      `,
      [actor.tenantId]
    );

    if (Number(publishedVersions.rows[0]?.count ?? 0) > 0) {
      throw new ConflictException('Le vidage global est bloque tant que des versions publiees du plan comptable existent.');
    }

    const result = await this.postgresService.query(
      `
        DELETE FROM public.comptes
        WHERE client_id = $1
      `,
      [actor.tenantId]
    );

    return result.rowCount ?? 0;
  }

  async importFromCsv(actor: AuthenticatedUser, payload: ImportComptesCsvDto): Promise<ImportComptesReport> {
    const rows = this.parseCsvRows(payload.csv);
    const enrichedData: EnrichedCompteRow[] = [];
    const validationErrors: Array<{ code: string; error: string }> = [];
    const seenCodes = new Map<string, number>();

    rows.forEach((row, index) => {
      if (seenCodes.has(row.code)) {
        validationErrors.push({
          code: row.code,
          error: `Compte en double dans le fichier CSV (ligne ${index + 2} et ligne ${seenCodes.get(row.code)! + 2})`
        });
        return;
      }

      seenCodes.set(row.code, index);

      if (!row.nbChiffres || row.nbChiffres < 2) {
        validationErrors.push({
          code: row.code,
          error: `Nombre de chiffres invalide (${row.nbChiffres}). Doit être >= 2`
        });
        return;
      }

      const { type, categorie } = this.detectTypeAndCategorie(row.code);
      enrichedData.push({
        ...row,
        niveau: row.nbChiffres - 1,
        type,
        categorie
      });
    });

    enrichedData.sort((a, b) => a.niveau - b.niveau);

    const report: ImportComptesReport = {
      success: true,
      stats: {
        total: rows.length,
        created: 0,
        skipped: 0,
        errors: validationErrors
      },
      byLevel: {}
    };

    const byLevel = new Map<number, EnrichedCompteRow[]>();
    for (const compte of enrichedData) {
      const level = compte.niveau;
      const list = byLevel.get(level) ?? [];
      list.push(compte);
      byLevel.set(level, list);
    }

    const codeToUuid = new Map<string, string>();
    const skipDuplicates = payload.skipDuplicates !== false;

    for (const [niveau, comptes] of Array.from(byLevel.entries()).sort((a, b) => a[0] - b[0])) {
      report.byLevel[niveau] = { created: 0, skipped: 0 };
      const codes = comptes.map((c) => c.code);

      const existing = await this.postgresService.query<{ id: string; numero: string }>(
        `
          SELECT id, numero
          FROM public.comptes
          WHERE client_id = $1
            AND numero = ANY($2::text[])
        `,
        [actor.tenantId, codes]
      );

      const existingCodes = new Set(existing.rows.map((item) => item.numero));
      existing.rows.forEach((item) => codeToUuid.set(item.numero, item.id));

      const accountsToInsert: EnrichedCompteRow[] = [];

      for (const compte of comptes) {
        if (existingCodes.has(compte.code)) {
          if (skipDuplicates) {
            report.stats.skipped += 1;
            report.byLevel[niveau].skipped += 1;
          } else {
            report.stats.skipped += 1;
            report.byLevel[niveau].skipped += 1;
            report.stats.errors.push({
              code: compte.code,
              error: 'Ce compte existe déjà dans votre plan comptable'
            });
          }
          continue;
        }

        if (compte.codeParent && !codeToUuid.has(compte.codeParent)) {
          report.stats.skipped += 1;
          report.byLevel[niveau].skipped += 1;
          report.stats.errors.push({
            code: compte.code,
            error: `Compte parent ${compte.codeParent} inexistant. Ce compte ne peut pas être importé sans son parent.`
          });
          continue;
        }

        accountsToInsert.push(compte);
      }

      if (accountsToInsert.length === 0) {
        continue;
      }

      const values: unknown[] = [];
      const placeholders: string[] = [];

      accountsToInsert.forEach((compte, rowIndex) => {
        const parentId = compte.codeParent ? codeToUuid.get(compte.codeParent) ?? null : null;
        const base = rowIndex * 13;
        placeholders.push(
          `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12}, $${base + 13})`
        );
        values.push(
          actor.tenantId,
          compte.code,
          compte.intitule,
          compte.type,
          compte.categorie,
          parentId,
          compte.niveau,
          'actif',
          'published',
          new Date().toISOString().slice(0, 10),
          'Import CSV du plan comptable',
          new Date().toISOString(),
          actor.sub
        );
      });

      const inserted = await this.postgresService.query<{ id: string; numero: string }>(
        `
          INSERT INTO public.comptes (
          client_id,
          numero,
          libelle,
          type,
          categorie,
          parent_id,
          niveau,
          statut,
          version_status,
          effective_start_date,
          change_reason,
          published_at,
          created_by
        )
          VALUES ${placeholders.join(', ')}
          RETURNING id, numero
        `,
        values
      );

      inserted.rows.forEach((row) => codeToUuid.set(row.numero, row.id));
      report.stats.created += inserted.rows.length;
      report.byLevel[niveau].created += inserted.rows.length;
    }

    return report;
  }

  private mapUpdateKeyToColumn(key: keyof UpdateCompteDto): string {
    const map: Record<keyof UpdateCompteDto, string> = {
      numero: 'numero',
      libelle: 'libelle',
      type: 'type',
      categorie: 'categorie',
      parentId: 'parent_id',
      niveau: 'niveau',
      statut: 'statut',
      versionStatus: 'version_status',
      effectiveStartDate: 'effective_start_date',
      effectiveEndDate: 'effective_end_date',
      changeReason: 'change_reason'
    };

    return map[key];
  }

  private mapRowToView(row: CompteRow): CompteView {
    return {
      id: row.id,
      clientId: row.client_id,
      numero: row.numero,
      libelle: row.libelle,
      type: row.type,
      categorie: row.categorie,
      parentId: row.parent_id ?? undefined,
      niveau: row.niveau,
      statut: row.statut,
      versionGroupId: row.version_group_id,
      versionNumber: Number(row.version_number ?? 1),
      versionStatus: row.version_status,
      effectiveStartDate: row.effective_start_date ?? undefined,
      effectiveEndDate: row.effective_end_date ?? undefined,
      changeReason: row.change_reason ?? undefined,
      publishedAt: row.published_at ? new Date(row.published_at).toISOString() : undefined,
      archivedAt: row.archived_at ? new Date(row.archived_at).toISOString() : undefined,
      createdBy: row.created_by ?? undefined,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString()
    };
  }

  private async createSuccessorVersion(
    actor: AuthenticatedUser,
    current: CompteView,
    payload: UpdateCompteDto,
    nextVersionStatus: CompteVersionStatus,
    nextEffectiveStartDate?: string,
    nextEffectiveEndDate?: string
  ): Promise<CompteView> {
    const nextVersionNumber = current.versionNumber + 1;
    const publishedAt = nextVersionStatus === 'published' ? new Date().toISOString() : null;
    const archivedAt = nextVersionStatus === 'archived' ? new Date().toISOString() : null;

    const result = await this.postgresService.query<CompteRow>(
      `
        WITH marked_previous AS (
          UPDATE public.comptes current
          SET superseded_by_id = current.id
          WHERE current.id = $18
            AND current.client_id = $1
          RETURNING current.id
        ),
        inserted AS (
          INSERT INTO public.comptes (
            client_id,
            numero,
            libelle,
            type,
            categorie,
            parent_id,
            niveau,
            statut,
            version_group_id,
            version_number,
            version_status,
            effective_start_date,
            effective_end_date,
            change_reason,
            published_at,
            archived_at,
            created_by
          )
          SELECT
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
          FROM marked_previous
          RETURNING *
        ),
        finalized AS (
          UPDATE public.comptes current
          SET superseded_by_id = (SELECT id FROM inserted)
          WHERE current.id = $18
            AND current.client_id = $1
          RETURNING current.id
        )
        SELECT *
        FROM inserted
      `,
      [
        actor.tenantId,
        payload.numero ?? current.numero,
        payload.libelle ?? current.libelle,
        payload.type ?? current.type,
        payload.categorie ?? current.categorie,
        payload.parentId ?? current.parentId ?? null,
        payload.niveau ?? current.niveau,
        payload.statut ?? current.statut,
        current.versionGroupId,
        nextVersionNumber,
        nextVersionStatus,
        nextEffectiveStartDate ?? null,
        nextEffectiveEndDate ?? null,
        payload.changeReason?.trim() || current.changeReason || 'Nouvelle version du plan comptable',
        publishedAt,
        archivedAt,
        actor.sub,
        current.id
      ]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException('Compte introuvable');
    }

    return this.mapRowToView(row);
  }

  private normalizeUpdateValue(key: keyof UpdateCompteDto, value: UpdateCompteDto[keyof UpdateCompteDto]) {
    if (['changeReason'].includes(key) && typeof value === 'string') {
      return value.trim() ? value.trim() : null;
    }

    return value;
  }

  private validateEffectiveDates(start?: string, end?: string) {
    if (!start || !end) {
      return;
    }

    if (new Date(end).getTime() < new Date(start).getTime()) {
      throw new BadRequestException("La date d'effet de fin doit etre posterieure ou egale a la date d'effet de debut.");
    }
  }

  private validateVersionMetadata(status: CompteVersionStatus, changeReason?: string) {
    if ((status === 'published' || status === 'archived') && !changeReason?.trim()) {
      throw new BadRequestException('Le motif de changement est obligatoire pour une version publiee ou archivee.');
    }
  }

  private async ensureNumeroIsAvailable(
    actor: AuthenticatedUser,
    numero: string,
    options?: { excludeCompteId?: string; excludeVersionGroupId?: string }
  ) {
    const result = await this.postgresService.query<{ id: string }>(
      `
        SELECT id
        FROM public.comptes
        WHERE client_id = $1
          AND numero = $2
          AND superseded_by_id IS NULL
          AND ($3::uuid IS NULL OR id <> $3::uuid)
          AND ($4::uuid IS NULL OR version_group_id <> $4::uuid)
        LIMIT 1
      `,
      [actor.tenantId, numero, options?.excludeCompteId ?? null, options?.excludeVersionGroupId ?? null]
    );

    if (result.rows[0]) {
      throw new ConflictException(
        'Ce compte existe deja dans votre plan comptable. Creez une nouvelle version au lieu de dupliquer le numero.'
      );
    }
  }

  private parseCsvRows(csvBase64: string): CsvCompteRow[] {
    const csvContent = Buffer.from(csvBase64, 'base64').toString('utf-8');
    const lines = csvContent
      .trim()
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length <= 1) {
      return [];
    }

    const headers = this.parseCsvLine(lines[0].replace(/^\uFEFF/, ''));
    const rows: CsvCompteRow[] = [];

    for (let i = 1; i < lines.length; i += 1) {
      const values = this.parseCsvLine(lines[i]);
      const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));

      const code = String(row.code ?? '').trim();
      const intitule = String(row.intitule ?? '').trim();
      const nbChiffres = Number(row.nb_chiffres ?? 0);

      if (!code || !intitule || !Number.isFinite(nbChiffres)) {
        continue;
      }

      rows.push({
        code,
        intitule,
        nbChiffres,
        codeParent: String(row.code_parent ?? '').trim() || undefined
      });
    }

    return rows;
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];

      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  private detectTypeAndCategorie(code: string): Pick<CompteRow, 'type' | 'categorie'> {
    const firstDigit = Number(code.charAt(0));
    const firstTwoDigits = Number(code.slice(0, 2));

    switch (firstDigit) {
      case 1:
        return { type: 'passif', categorie: 'capital' };
      case 2:
        return { type: 'actif', categorie: 'immobilisation' };
      case 3:
        return { type: 'actif', categorie: 'stock' };
      case 4:
        return firstTwoDigits <= 45
          ? { type: 'passif', categorie: 'dette' }
          : { type: 'actif', categorie: 'creance' };
      case 5:
        return { type: 'actif', categorie: 'tresorerie' };
      case 6:
        return firstTwoDigits >= 66 && firstTwoDigits <= 67
          ? { type: 'charge', categorie: 'financier' }
          : { type: 'charge', categorie: 'exploitation' };
      case 7:
        return firstTwoDigits >= 76 && firstTwoDigits <= 77
          ? { type: 'produit', categorie: 'financier' }
          : { type: 'produit', categorie: 'exploitation' };
      case 8:
        return { type: 'resultat', categorie: 'autre' };
      default:
        return { type: 'actif', categorie: 'autre' };
    }
  }
}
