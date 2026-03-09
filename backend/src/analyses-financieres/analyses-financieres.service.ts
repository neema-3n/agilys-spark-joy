import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PostgresService } from '../common/postgres.service';
import type { AnalysesFinancieresQueryDto } from './dto/analyses-financieres.dto';

interface ProjetAggregateRow {
  projet_id: string;
  projet_code: string;
  projet_nom: string;
  budget_alloue: string | number;
  engage: string | number;
  paye: string | number;
  structure_id: string | null;
  structure_code: string | null;
  structure_nom: string | null;
}

interface AxeAggregateRow {
  section_id: string | null;
  section_code: string | null;
  programme_id: string | null;
  programme_code: string | null;
  action_id: string | null;
  action_code: string | null;
  budget_alloue: string | number;
  engage: string | number;
  paye: string | number;
}

interface CountRow {
  value: string | number;
}

interface AnalyseRowView {
  id: string;
  dimensionType: 'projet' | 'structure' | 'axe';
  dimensionLabel: string;
  structureLabel?: string;
  budgetAlloue: number;
  engage: number;
  paye: number;
  disponible: number;
  ecart: number;
  tauxExecution: number;
}

interface AnalysesResponse {
  kpis: {
    budgetAlloue: number;
    engage: number;
    paye: number;
    disponible: number;
    tauxExecution: number;
  };
  counts: {
    projets: number;
    structures: number;
    axes: number;
  };
  projetRows: AnalyseRowView[];
  structureRows: AnalyseRowView[];
  axeRows: AnalyseRowView[];
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

const toMetrics = (budgetAlloue: number, engage: number, paye: number) => {
  const disponible = budgetAlloue - engage;
  const ecart = budgetAlloue - paye;
  const tauxExecution = budgetAlloue > 0 ? (paye / budgetAlloue) * 100 : 0;

  return {
    budgetAlloue: round2(budgetAlloue),
    engage: round2(engage),
    paye: round2(paye),
    disponible: round2(disponible),
    ecart: round2(ecart),
    tauxExecution: round2(tauxExecution)
  };
};

@Injectable()
export class AnalysesFinancieresService {
  constructor(private readonly postgresService: PostgresService) {}

  async getAggregation(actor: AuthenticatedUser, query: AnalysesFinancieresQueryDto): Promise<AnalysesResponse> {
    const projetRows = await this.loadProjetRows(actor, query);
    const structureRows = this.aggregateStructures(projetRows);
    const axeRows = await this.loadAxeRows(actor, query);

    const kpisSource = axeRows.length > 0 ? axeRows : projetRows;
    const kpisMetrics = toMetrics(
      kpisSource.reduce((sum, row) => sum + row.budgetAlloue, 0),
      kpisSource.reduce((sum, row) => sum + row.engage, 0),
      kpisSource.reduce((sum, row) => sum + row.paye, 0)
    );
    const kpis = {
      budgetAlloue: kpisMetrics.budgetAlloue,
      engage: kpisMetrics.engage,
      paye: kpisMetrics.paye,
      disponible: kpisMetrics.disponible,
      tauxExecution: kpisMetrics.tauxExecution
    };

    const counts = {
      projets: await this.countDistinct('projets', actor, query),
      structures: await this.countDistinct('structures', actor, query),
      axes: await this.countDistinct('axes', actor, query)
    };

    return {
      kpis,
      counts,
      projetRows,
      structureRows,
      axeRows
    };
  }

  private async loadProjetRows(actor: AuthenticatedUser, query: AnalysesFinancieresQueryDto): Promise<AnalyseRowView[]> {
    const params: unknown[] = [actor.tenantId, query.exerciceId];
    const where: string[] = ['p.client_id = $1', 'p.exercice_id = $2'];

    if (query.projetId) {
      params.push(query.projetId);
      where.push(`p.id = $${params.length}`);
    }

    if (query.structureId) {
      params.push(query.structureId);
      where.push(`s.id = $${params.length}`);
    }

    if (query.periode) {
      params.push(`${query.periode}%`);
      where.push(`(e.date_creation::text LIKE $${params.length} OR f.date_facture::text LIKE $${params.length})`);
    }

    const result = await this.postgresService.query<ProjetAggregateRow>(
      `
        SELECT
          p.id AS projet_id,
          p.code AS projet_code,
          p.nom AS projet_nom,
          COALESCE(MAX(p.budget_alloue), 0) AS budget_alloue,
          COALESCE(SUM(DISTINCT e.montant) FILTER (WHERE e.id IS NOT NULL), 0) AS engage,
          COALESCE(SUM(DISTINCT f.montant_liquide) FILTER (WHERE f.id IS NOT NULL), 0) AS paye,
          s.id AS structure_id,
          s.code AS structure_code,
          s.nom AS structure_nom
        FROM public.projets p
        LEFT JOIN public.structures s
          ON s.client_id = p.client_id
          AND s.exercice_id = p.exercice_id
          AND s.type = 'centre_cout'
          AND p.code LIKE (s.code || '%')
        LEFT JOIN public.engagements e
          ON e.client_id = p.client_id
          AND e.exercice_id = p.exercice_id
          AND e.projet_id = p.id
        LEFT JOIN public.factures f
          ON f.client_id = p.client_id
          AND f.exercice_id = p.exercice_id
          AND f.projet_id = p.id
        WHERE ${where.join('\n          AND ')}
        GROUP BY p.id, p.code, p.nom, s.id, s.code, s.nom
        ORDER BY budget_alloue DESC
      `,
      params
    );

    return result.rows.map((row) => {
      const budgetAlloue = Number(row.budget_alloue ?? 0);
      const engage = Number(row.engage ?? 0);
      const paye = Number(row.paye ?? 0);

      return {
        id: `projet-${row.projet_id}`,
        dimensionType: 'projet',
        dimensionLabel: `${row.projet_code} - ${row.projet_nom}`,
        structureLabel:
          row.structure_id && row.structure_code && row.structure_nom
            ? `${row.structure_code} - ${row.structure_nom}`
            : 'Non rattachee',
        ...toMetrics(budgetAlloue, engage, paye)
      };
    });
  }

  private aggregateStructures(projetRows: AnalyseRowView[]): AnalyseRowView[] {
    const byStructure = new Map<string, AnalyseRowView>();

    projetRows.forEach((row) => {
      const label = row.structureLabel ?? 'Non rattachee';
      if (!byStructure.has(label)) {
        byStructure.set(label, {
          id: `structure-${label}`,
          dimensionType: 'structure',
          dimensionLabel: label,
          ...toMetrics(0, 0, 0)
        });
      }

      const current = byStructure.get(label);
      if (!current) {
        return;
      }

      current.budgetAlloue += row.budgetAlloue;
      current.engage += row.engage;
      current.paye += row.paye;
      current.disponible += row.disponible;
      current.ecart += row.ecart;
      current.tauxExecution = current.budgetAlloue > 0 ? round2((current.paye / current.budgetAlloue) * 100) : 0;
    });

    return Array.from(byStructure.values())
      .map((row) => ({
        ...row,
        budgetAlloue: round2(row.budgetAlloue),
        engage: round2(row.engage),
        paye: round2(row.paye),
        disponible: round2(row.disponible),
        ecart: round2(row.ecart),
        tauxExecution: round2(row.tauxExecution)
      }))
      .sort((a, b) => b.budgetAlloue - a.budgetAlloue);
  }

  private async loadAxeRows(actor: AuthenticatedUser, query: AnalysesFinancieresQueryDto): Promise<AnalyseRowView[]> {
    const params: unknown[] = [actor.tenantId, query.exerciceId];
    const where: string[] = ['lb.client_id = $1', 'lb.exercice_id = $2'];

    if (query.sectionId) {
      params.push(query.sectionId);
      where.push(`sec.id = $${params.length}`);
    }
    if (query.programmeId) {
      params.push(query.programmeId);
      where.push(`prg.id = $${params.length}`);
    }
    if (query.actionId) {
      params.push(query.actionId);
      where.push(`act.id = $${params.length}`);
    }

    const result = await this.postgresService.query<AxeAggregateRow>(
      `
        SELECT
          sec.id AS section_id,
          sec.code AS section_code,
          prg.id AS programme_id,
          prg.code AS programme_code,
          act.id AS action_id,
          act.code AS action_code,
          COALESCE(SUM(lb.montant_modifie), 0) AS budget_alloue,
          COALESCE(SUM(lb.montant_engage), 0) AS engage,
          COALESCE(SUM(lb.montant_paye), 0) AS paye
        FROM public.lignes_budgetaires lb
        INNER JOIN public.actions act ON act.id = lb.action_id
        INNER JOIN public.programmes prg ON prg.id = act.programme_id
        INNER JOIN public.sections sec ON sec.id = prg.section_id
        WHERE ${where.join('\n          AND ')}
        GROUP BY sec.id, sec.code, prg.id, prg.code, act.id, act.code
        ORDER BY budget_alloue DESC
      `,
      params
    );

    return result.rows.map((row) => {
      const budgetAlloue = Number(row.budget_alloue ?? 0);
      const engage = Number(row.engage ?? 0);
      const paye = Number(row.paye ?? 0);

      return {
        id: `axe-${row.section_id ?? 'na'}-${row.programme_id ?? 'na'}-${row.action_id ?? 'na'}`,
        dimensionType: 'axe',
        dimensionLabel: `${row.section_code ?? 'SEC-NA'} / ${row.programme_code ?? 'PRG-NA'} / ${row.action_code ?? 'ACT-NA'}`,
        ...toMetrics(budgetAlloue, engage, paye)
      };
    });
  }

  private async countDistinct(
    dimension: 'projets' | 'structures' | 'axes',
    actor: AuthenticatedUser,
    query: AnalysesFinancieresQueryDto
  ): Promise<number> {
    if (dimension === 'projets') {
      const result = await this.postgresService.query<CountRow>(
        `
          SELECT COUNT(*)::bigint AS value
          FROM public.projets
          WHERE client_id = $1
            AND exercice_id = $2
        `,
        [actor.tenantId, query.exerciceId]
      );
      return Number(result.rows[0]?.value ?? 0);
    }

    if (dimension === 'structures') {
      const result = await this.postgresService.query<CountRow>(
        `
          SELECT COUNT(*)::bigint AS value
          FROM public.structures
          WHERE client_id = $1
            AND exercice_id = $2
            AND type = COALESCE($3, 'centre_cout')
        `,
        [actor.tenantId, query.exerciceId, query.typeStructure ?? null]
      );
      return Number(result.rows[0]?.value ?? 0);
    }

    const result = await this.postgresService.query<CountRow>(
      `
        SELECT COUNT(*)::bigint AS value
        FROM (
          SELECT sec.id, prg.id, act.id
          FROM public.lignes_budgetaires lb
          INNER JOIN public.actions act ON act.id = lb.action_id
          INNER JOIN public.programmes prg ON prg.id = act.programme_id
          INNER JOIN public.sections sec ON sec.id = prg.section_id
          WHERE lb.client_id = $1
            AND lb.exercice_id = $2
          GROUP BY sec.id, prg.id, act.id
        ) axes
      `,
      [actor.tenantId, query.exerciceId]
    );
    return Number(result.rows[0]?.value ?? 0);
  }
}
