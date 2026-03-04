import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PostgresService } from '../common/postgres.service';
import type {
  CreateLignePrevisionDto,
  CreateScenarioDto,
  DupliquerScenarioDto,
  GenererPrevisionsDto,
  LignesPrevisionQueryDto,
  UpdateLignePrevisionDto,
  UpdateScenarioDto
} from './dto/previsions.dto';

interface ScenarioRow {
  id: string;
  client_id: string;
  code: string;
  nom: string;
  description: string | null;
  type_scenario: 'optimiste' | 'pessimiste' | 'realiste' | 'personnalise';
  annee_reference: number;
  exercice_reference_id: string | null;
  statut: 'brouillon' | 'valide' | 'archive';
  created_at: Date | string;
  updated_at: Date | string;
  created_by: string | null;
}

interface LignePrevisionRow {
  id: string;
  scenario_id: string;
  client_id: string;
  annee: number;
  section_code: string | null;
  programme_code: string | null;
  action_code: string | null;
  compte_numero: string | null;
  enveloppe_id: string | null;
  libelle: string;
  montant_prevu: string | number;
  taux_croissance: string | number | null;
  hypotheses: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface LigneBudgetaireRow {
  enveloppe_id: string | null;
  libelle: string;
  montant_initial: string | number;
  montant_modifie: string | number;
}

@Injectable()
export class PrevisionsService {
  constructor(private readonly postgresService: PostgresService) {}

  async getScenarios(actor: AuthenticatedUser): Promise<ReturnType<PrevisionsService['mapScenarioRowToView']>[]> {
    const result = await this.postgresService.query<ScenarioRow>(
      `
        SELECT *
        FROM public.scenarios_prevision
        WHERE client_id = $1
        ORDER BY created_at DESC
      `,
      [actor.tenantId]
    );

    return result.rows.map((row) => this.mapScenarioRowToView(row));
  }

  async getScenarioById(actor: AuthenticatedUser, scenarioId: string): Promise<ReturnType<PrevisionsService['mapScenarioRowToView']>> {
    const scenario = await this.findScenario(actor.tenantId, scenarioId);
    return this.mapScenarioRowToView(scenario);
  }

  async createScenario(actor: AuthenticatedUser, payload: CreateScenarioDto): Promise<ReturnType<PrevisionsService['mapScenarioRowToView']>> {
    const result = await this.postgresService.query<ScenarioRow>(
      `
        INSERT INTO public.scenarios_prevision (
          client_id,
          code,
          nom,
          description,
          type_scenario,
          annee_reference,
          exercice_reference_id,
          statut,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `,
      [
        actor.tenantId,
        payload.code,
        payload.nom,
        payload.description?.trim() || null,
        payload.typeScenario,
        payload.anneeReference,
        payload.exerciceReferenceId ?? null,
        payload.statut ?? 'brouillon',
        payload.createdBy ?? actor.sub
      ]
    );

    return this.mapScenarioRowToView(result.rows[0]);
  }

  async updateScenario(
    actor: AuthenticatedUser,
    scenarioId: string,
    payload: UpdateScenarioDto
  ): Promise<ReturnType<PrevisionsService['mapScenarioRowToView']>> {
    const keys = Object.keys(payload) as Array<keyof UpdateScenarioDto>;
    if (keys.length === 0) {
      return this.getScenarioById(actor, scenarioId);
    }

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    for (const key of keys) {
      const value = payload[key];
      if (value === undefined) {
        continue;
      }

      setClauses.push(`${this.mapScenarioUpdateKeyToColumn(key)} = $${index}`);
      values.push(this.normalizeNullableString(value));
      index += 1;
    }

    setClauses.push('updated_at = now()');
    values.push(scenarioId, actor.tenantId);

    const result = await this.postgresService.query<ScenarioRow>(
      `
        UPDATE public.scenarios_prevision
        SET ${setClauses.join(', ')}
        WHERE id = $${index}
          AND client_id = $${index + 1}
        RETURNING *
      `,
      values
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException('Scénario introuvable');
    }

    return this.mapScenarioRowToView(row);
  }

  async deleteScenario(actor: AuthenticatedUser, scenarioId: string): Promise<void> {
    const result = await this.postgresService.query(
      `
        DELETE FROM public.scenarios_prevision
        WHERE id = $1
          AND client_id = $2
      `,
      [scenarioId, actor.tenantId]
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new NotFoundException('Scénario introuvable');
    }
  }

  async validerScenario(actor: AuthenticatedUser, scenarioId: string): Promise<ReturnType<PrevisionsService['mapScenarioRowToView']>> {
    return this.updateScenario(actor, scenarioId, { statut: 'valide' });
  }

  async archiverScenario(actor: AuthenticatedUser, scenarioId: string): Promise<ReturnType<PrevisionsService['mapScenarioRowToView']>> {
    return this.updateScenario(actor, scenarioId, { statut: 'archive' });
  }

  async dupliquerScenario(
    actor: AuthenticatedUser,
    scenarioId: string,
    payload: DupliquerScenarioDto
  ): Promise<ReturnType<PrevisionsService['mapScenarioRowToView']>> {
    const sourceScenario = await this.findScenario(actor.tenantId, scenarioId);

    const insertScenario = await this.postgresService.query<ScenarioRow>(
      `
        INSERT INTO public.scenarios_prevision (
          client_id,
          code,
          nom,
          description,
          type_scenario,
          annee_reference,
          exercice_reference_id,
          statut,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'brouillon', $8)
        RETURNING *
      `,
      [
        actor.tenantId,
        payload.code,
        payload.nom,
        `Copie de ${sourceScenario.nom}`,
        sourceScenario.type_scenario,
        sourceScenario.annee_reference,
        sourceScenario.exercice_reference_id,
        actor.sub
      ]
    );

    const newScenario = insertScenario.rows[0];

    await this.postgresService.query(
      `
        INSERT INTO public.lignes_prevision (
          scenario_id,
          client_id,
          annee,
          section_code,
          programme_code,
          action_code,
          compte_numero,
          enveloppe_id,
          libelle,
          montant_prevu,
          taux_croissance,
          hypotheses
        )
        SELECT
          $1,
          client_id,
          annee,
          section_code,
          programme_code,
          action_code,
          compte_numero,
          enveloppe_id,
          libelle,
          montant_prevu,
          taux_croissance,
          hypotheses
        FROM public.lignes_prevision
        WHERE scenario_id = $2
          AND client_id = $3
      `,
      [newScenario.id, sourceScenario.id, actor.tenantId]
    );

    return this.mapScenarioRowToView(newScenario);
  }

  async getLignesPrevision(
    actor: AuthenticatedUser,
    query: LignesPrevisionQueryDto
  ): Promise<ReturnType<PrevisionsService['mapLigneRowToView']>[]> {
    await this.findScenario(actor.tenantId, query.scenarioId);

    const values: unknown[] = [actor.tenantId, query.scenarioId];
    let index = 3;

    let filterSql = 'WHERE client_id = $1 AND scenario_id = $2';
    if (query.annee !== undefined) {
      filterSql += ` AND annee = $${index}`;
      values.push(query.annee);
      index += 1;
    }

    const result = await this.postgresService.query<LignePrevisionRow>(
      `
        SELECT *
        FROM public.lignes_prevision
        ${filterSql}
        ORDER BY annee ASC, created_at ASC
      `,
      values
    );

    return result.rows.map((row) => this.mapLigneRowToView(row));
  }

  async createLignePrevision(
    actor: AuthenticatedUser,
    payload: CreateLignePrevisionDto
  ): Promise<ReturnType<PrevisionsService['mapLigneRowToView']>> {
    await this.findScenario(actor.tenantId, payload.scenarioId);

    const result = await this.postgresService.query<LignePrevisionRow>(
      `
        INSERT INTO public.lignes_prevision (
          scenario_id,
          client_id,
          annee,
          section_code,
          programme_code,
          action_code,
          compte_numero,
          enveloppe_id,
          libelle,
          montant_prevu,
          taux_croissance,
          hypotheses
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `,
      [
        payload.scenarioId,
        actor.tenantId,
        payload.annee,
        payload.sectionCode ?? null,
        payload.programmeCode ?? null,
        payload.actionCode ?? null,
        payload.compteNumero ?? null,
        payload.enveloppeId ?? null,
        payload.libelle,
        payload.montantPrevu,
        payload.tauxCroissance ?? null,
        payload.hypotheses ?? null
      ]
    );

    return this.mapLigneRowToView(result.rows[0]);
  }

  async updateLignePrevision(
    actor: AuthenticatedUser,
    ligneId: string,
    payload: UpdateLignePrevisionDto
  ): Promise<ReturnType<PrevisionsService['mapLigneRowToView']>> {
    const keys = Object.keys(payload) as Array<keyof UpdateLignePrevisionDto>;
    if (keys.length === 0) {
      const ligne = await this.findLigne(actor.tenantId, ligneId);
      return this.mapLigneRowToView(ligne);
    }

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    for (const key of keys) {
      const value = payload[key];
      if (value === undefined) {
        continue;
      }

      setClauses.push(`${this.mapLigneUpdateKeyToColumn(key)} = $${index}`);
      values.push(this.normalizeNullableString(value));
      index += 1;
    }

    setClauses.push('updated_at = now()');
    values.push(ligneId, actor.tenantId);

    const result = await this.postgresService.query<LignePrevisionRow>(
      `
        UPDATE public.lignes_prevision
        SET ${setClauses.join(', ')}
        WHERE id = $${index}
          AND client_id = $${index + 1}
        RETURNING *
      `,
      values
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException('Ligne de prévision introuvable');
    }

    return this.mapLigneRowToView(row);
  }

  async deleteLignePrevision(actor: AuthenticatedUser, ligneId: string): Promise<void> {
    const result = await this.postgresService.query(
      `
        DELETE FROM public.lignes_prevision
        WHERE id = $1
          AND client_id = $2
      `,
      [ligneId, actor.tenantId]
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new NotFoundException('Ligne de prévision introuvable');
    }
  }

  async genererPrevisions(
    actor: AuthenticatedUser,
    payload: GenererPrevisionsDto
  ): Promise<{ insertedCount: number }> {
    const scenario = await this.findScenario(actor.tenantId, payload.scenarioId);

    const lignesBudget = await this.postgresService.query<LigneBudgetaireRow>(
      `
        SELECT enveloppe_id, libelle, montant_initial, montant_modifie
        FROM public.lignes_budgetaires
        WHERE client_id = $1
          AND exercice_id = $2
          AND statut = 'actif'
      `,
      [actor.tenantId, payload.exerciceReferenceId]
    );

    if (lignesBudget.rows.length === 0) {
      return { insertedCount: 0 };
    }

    const rowsToInsert: unknown[][] = [];

    for (let i = 1; i <= payload.nombreAnnees; i += 1) {
      const annee = scenario.annee_reference + i;
      for (const ligne of lignesBudget.rows) {
        const montantBase = Number(ligne.montant_modifie || ligne.montant_initial || 0);

        let tauxCroissance = payload.tauxCroissanceGlobal ?? 0;
        if (payload.inclureInflation && payload.tauxInflation !== undefined) {
          tauxCroissance += payload.tauxInflation;
        }

        const montantPrevu = montantBase * Math.pow(1 + tauxCroissance / 100, i);

        rowsToInsert.push([
          payload.scenarioId,
          actor.tenantId,
          annee,
          ligne.enveloppe_id,
          ligne.libelle,
          montantPrevu,
          tauxCroissance,
          `Projection automatique avec taux de ${tauxCroissance}% pour l'année ${annee}`
        ]);
      }
    }

    const batchSize = 200;
    let insertedCount = 0;

    for (let start = 0; start < rowsToInsert.length; start += batchSize) {
      const batch = rowsToInsert.slice(start, start + batchSize);
      const values: unknown[] = [];
      const placeholders: string[] = [];

      batch.forEach((row, rowIndex) => {
        const base = rowIndex * 8;
        placeholders.push(
          `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`
        );
        values.push(...row);
      });

      await this.postgresService.query(
        `
          INSERT INTO public.lignes_prevision (
            scenario_id,
            client_id,
            annee,
            enveloppe_id,
            libelle,
            montant_prevu,
            taux_croissance,
            hypotheses
          )
          VALUES ${placeholders.join(', ')}
        `,
        values
      );

      insertedCount += batch.length;
    }

    return { insertedCount };
  }

  private async findScenario(clientId: string, scenarioId: string): Promise<ScenarioRow> {
    const result = await this.postgresService.query<ScenarioRow>(
      `
        SELECT *
        FROM public.scenarios_prevision
        WHERE id = $1
          AND client_id = $2
        LIMIT 1
      `,
      [scenarioId, clientId]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException('Scénario introuvable');
    }

    return row;
  }

  private async findLigne(clientId: string, ligneId: string): Promise<LignePrevisionRow> {
    const result = await this.postgresService.query<LignePrevisionRow>(
      `
        SELECT *
        FROM public.lignes_prevision
        WHERE id = $1
          AND client_id = $2
        LIMIT 1
      `,
      [ligneId, clientId]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException('Ligne de prévision introuvable');
    }

    return row;
  }

  private mapScenarioUpdateKeyToColumn(key: keyof UpdateScenarioDto): string {
    const map: Record<keyof UpdateScenarioDto, string> = {
      code: 'code',
      nom: 'nom',
      description: 'description',
      typeScenario: 'type_scenario',
      anneeReference: 'annee_reference',
      exerciceReferenceId: 'exercice_reference_id',
      statut: 'statut'
    };

    return map[key];
  }

  private mapLigneUpdateKeyToColumn(key: keyof UpdateLignePrevisionDto): string {
    const map: Record<keyof UpdateLignePrevisionDto, string> = {
      annee: 'annee',
      sectionCode: 'section_code',
      programmeCode: 'programme_code',
      actionCode: 'action_code',
      compteNumero: 'compte_numero',
      enveloppeId: 'enveloppe_id',
      libelle: 'libelle',
      montantPrevu: 'montant_prevu',
      tauxCroissance: 'taux_croissance',
      hypotheses: 'hypotheses'
    };

    return map[key];
  }

  private normalizeNullableString(value: unknown): unknown {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }

  private mapScenarioRowToView(row: ScenarioRow) {
    return {
      id: row.id,
      clientId: row.client_id,
      code: row.code,
      nom: row.nom,
      description: row.description ?? undefined,
      typeScenario: row.type_scenario,
      anneeReference: Number(row.annee_reference ?? 0),
      exerciceReferenceId: row.exercice_reference_id ?? undefined,
      statut: row.statut,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      createdBy: row.created_by ?? undefined
    };
  }

  private mapLigneRowToView(row: LignePrevisionRow) {
    return {
      id: row.id,
      scenarioId: row.scenario_id,
      clientId: row.client_id,
      annee: Number(row.annee ?? 0),
      sectionCode: row.section_code ?? undefined,
      programmeCode: row.programme_code ?? undefined,
      actionCode: row.action_code ?? undefined,
      compteNumero: row.compte_numero ?? undefined,
      enveloppeId: row.enveloppe_id ?? undefined,
      libelle: row.libelle,
      montantPrevu: Number(row.montant_prevu ?? 0),
      tauxCroissance: row.taux_croissance === null ? undefined : Number(row.taux_croissance),
      hypotheses: row.hypotheses ?? undefined,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString()
    };
  }
}
