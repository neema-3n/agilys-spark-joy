import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { AuthorizationAuditService } from '../auth/authorization-audit.service';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PostgresService } from '../common/postgres.service';
import type {
  ReportingAnalytiqueDimension,
  ReportingAnalytiqueExportFormat,
  ReportingAnalytiqueExportRequestDto,
  ReportingAnalytiqueMeasure,
  ReportingAnalytiqueQueryDto,
  ReportingAnalytiqueView
} from './dto/reporting-analytique.dto';

interface AnalytiqueRawRow {
  depense_id: string;
  date_depense: string;
  projet_id: string | null;
  projet_code: string | null;
  projet_nom: string | null;
  section_code: string | null;
  programme_code: string | null;
  action_id: string | null;
  action_code: string | null;
  fournisseur_id: string | null;
  fournisseur_code: string | null;
  fournisseur_nom: string | null;
  depense_statut: string;
  montant_budget_modifie: string | number;
  montant_engage: string | number;
  montant_paye_ligne: string | number;
  montant_depense: string | number;
  montant_paye_depense: string | number;
}

interface AnalytiqueDatasetRow {
  periode: string;
  entite: string;
  axeAnalytique: string;
  composanteBudgetaire: string;
  fournisseur: string;
  statut: string;
  montantBudgetModifie: number;
  montantEngage: number;
  montantPaye: number;
  montantDepense: number;
  count: number;
}

interface PivotCell {
  rowKey: string;
  columnKey: string;
  value: number;
}

interface PivotFilters {
  exerciceId: string;
  periode: string;
  dateDebut: string;
  dateFin: string;
  entite?: string;
  axeAnalytique?: string;
  composanteBudgetaire?: string;
  fournisseurId?: string;
  statut?: string;
  rowDimension: ReportingAnalytiqueDimension;
  columnDimension: ReportingAnalytiqueDimension;
  measure: ReportingAnalytiqueMeasure;
  page: number;
  pageSize: number;
  correlationId?: string;
}

interface ExportJob {
  exportId: string;
  tenantId: string;
  userId: string;
  view: ReportingAnalytiqueView;
  format: ReportingAnalytiqueExportFormat;
  filename: string;
  mimeType: string;
  content: Buffer;
  createdAt: string;
  expiresAt: number;
  correlationId?: string;
}

type ExportStatus = 'completed';

const round2 = (value: number): number => Math.round(value * 100) / 100;
const EMPTY_KEY = 'Non renseigne';

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let crc = index;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) !== 0 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
    table[index] = crc >>> 0;
  }
  return table;
})();

@Injectable()
export class ReportingAnalytiqueService {
  private readonly logger = new Logger(ReportingAnalytiqueService.name);
  private readonly exportJobs = new Map<string, ExportJob>();
  private readonly signingSecret = process.env.EXPORT_SIGNING_SECRET || process.env.JWT_SECRET || randomUUID();

  constructor(
    private readonly postgresService: PostgresService,
    private readonly authorizationAuditService: AuthorizationAuditService
  ) {}

  async getTableauCroise(actor: AuthenticatedUser, query: ReportingAnalytiqueQueryDto) {
    const filters = this.normalizeQuery(query);
    const dataset = await this.loadDataset(actor, filters);
    const pivot = this.buildPivot(dataset, filters);

    const rowCount = pivot.rowKeys.length;
    const pageStart = (filters.page - 1) * filters.pageSize;
    const pageEnd = pageStart + filters.pageSize;
    const pagedRowKeys = pivot.rowKeys.slice(pageStart, pageEnd);

    const cellMap = new Map<string, number>();
    for (const cell of pivot.cells) {
      cellMap.set(`${cell.rowKey}::${cell.columnKey}`, cell.value);
    }

    const rows = pagedRowKeys.map((rowKey) => ({
      rowKey,
      values: pivot.columnKeys.map((columnKey) => ({
        columnKey,
        value: cellMap.get(`${rowKey}::${columnKey}`) ?? 0
      }))
    }));

    return {
      view: 'tableau-croise' as const,
      filters,
      pagination: {
        total: rowCount,
        page: filters.page,
        pageSize: filters.pageSize
      },
      summary: {
        totalRows: rowCount,
        totalColumns: pivot.columnKeys.length,
        grandTotal: round2(pivot.grandTotal)
      },
      rowKeys: pagedRowKeys,
      columnKeys: pivot.columnKeys,
      rows
    };
  }

  async getDashboard(actor: AuthenticatedUser, query: ReportingAnalytiqueQueryDto) {
    const filters = this.normalizeQuery(query);
    const dataset = await this.loadDataset(actor, filters);
    const pivot = this.buildPivot(dataset, filters);

    const topRows = [...pivot.rowTotals]
      .sort((left, right) => right.total - left.total)
      .slice(0, 10)
      .map((item) => ({ ...item, total: round2(item.total) }));

    const topColumns = [...pivot.columnTotals]
      .sort((left, right) => right.total - left.total)
      .slice(0, 10)
      .map((item) => ({ ...item, total: round2(item.total) }));

    const anomalies = dataset
      .filter((row) => row.montantEngage > row.montantBudgetModifie)
      .slice(0, 10)
      .map((row) => ({
        entite: row.entite,
        axeAnalytique: row.axeAnalytique,
        composanteBudgetaire: row.composanteBudgetaire,
        statut: row.statut,
        ecart: round2(row.montantEngage - row.montantBudgetModifie)
      }));

    return {
      view: 'dashboard' as const,
      filters,
      kpis: {
        totalMesure: round2(pivot.grandTotal),
        volumeLignes: dataset.length,
        totalMontantBudgetModifie: round2(dataset.reduce((sum, row) => sum + row.montantBudgetModifie, 0)),
        totalMontantPaye: round2(dataset.reduce((sum, row) => sum + row.montantPaye, 0))
      },
      topRows,
      topColumns,
      anomalies,
      chart: {
        rowDimension: filters.rowDimension,
        measure: filters.measure,
        points: topRows
      }
    };
  }

  async startExport(actor: AuthenticatedUser, query: ReportingAnalytiqueExportRequestDto): Promise<{ exportId: string; status: ExportStatus }> {
    this.cleanupExpiredExportJobs();

    const report = query.view === 'tableau-croise' ? await this.getTableauCroise(actor, query) : await this.getDashboard(actor, query);

    const exportId = randomUUID();
    const filename = this.buildFilename(query.view, query.format);
    const mimeType = this.resolveMimeType(query.format);
    const content = this.buildExportContent(report, query.view, query.format);

    this.authorizationAuditService.logDecision({
      userId: actor.sub,
      tenantId: actor.tenantId,
      action: `reporting-analytique:export:start:${query.view}`,
      decision: 'allow'
    });

    this.logger.log(
      JSON.stringify({
        event: 'reporting_analytique_export_started',
        exportId,
        tenantId: actor.tenantId,
        userId: actor.sub,
        view: query.view,
        format: query.format,
        correlationId: query.correlationId ?? null,
        timestamp: new Date().toISOString()
      })
    );

    this.exportJobs.set(exportId, {
      exportId,
      tenantId: actor.tenantId,
      userId: actor.sub,
      view: query.view,
      format: query.format,
      filename,
      mimeType,
      content,
      createdAt: new Date().toISOString(),
      expiresAt: Date.now() + 30 * 60 * 1000,
      correlationId: query.correlationId
    });

    return { exportId, status: 'completed' };
  }

  getExportStatus(actor: AuthenticatedUser, exportId: string): {
    exportId: string;
    status: ExportStatus;
    downloadUrl: string;
    filename: string;
  } {
    this.cleanupExpiredExportJobs();
    const job = this.getExportJobForActor(actor, exportId);
    const token = this.signDownloadToken(job);

    return {
      exportId,
      status: 'completed',
      downloadUrl: `/reporting-analytique/exports/${encodeURIComponent(exportId)}/download?token=${encodeURIComponent(token)}`,
      filename: job.filename
    };
  }

  downloadExport(actor: AuthenticatedUser, exportId: string, token: string): { filename: string; mimeType: string; content: Buffer } {
    this.cleanupExpiredExportJobs();
    const job = this.getExportJobForActor(actor, exportId);
    const parsedToken = this.verifyDownloadToken(token);

    if (parsedToken.exportId !== exportId || parsedToken.tenantId !== actor.tenantId || parsedToken.userId !== actor.sub) {
      throw new BadRequestException('Jeton de telechargement invalide pour cet utilisateur');
    }

    if (Date.now() >= parsedToken.exp) {
      throw new BadRequestException('Lien de telechargement expire');
    }

    this.authorizationAuditService.logDecision({
      userId: actor.sub,
      tenantId: actor.tenantId,
      action: `reporting-analytique:export:download:${job.view}`,
      decision: 'allow'
    });

    this.logger.log(
      JSON.stringify({
        event: 'reporting_analytique_export_downloaded',
        exportId,
        tenantId: actor.tenantId,
        userId: actor.sub,
        view: job.view,
        format: job.format,
        correlationId: job.correlationId ?? null,
        timestamp: new Date().toISOString()
      })
    );

    return {
      filename: job.filename,
      mimeType: job.mimeType,
      content: job.content
    };
  }

  private normalizeQuery(query: ReportingAnalytiqueQueryDto): PivotFilters {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const periodBounds = this.resolvePeriodBounds(query.periode);

    return {
      exerciceId: query.exerciceId,
      periode: query.periode,
      dateDebut: periodBounds.dateDebut,
      dateFin: periodBounds.dateFin,
      entite: query.entite,
      axeAnalytique: query.axeAnalytique,
      composanteBudgetaire: query.composanteBudgetaire,
      fournisseurId: query.fournisseurId,
      statut: query.statut,
      rowDimension: query.rowDimension ?? 'axe-analytique',
      columnDimension: query.columnDimension ?? 'periode',
      measure: query.measure ?? 'montant-depense',
      page,
      pageSize,
      correlationId: query.correlationId
    };
  }

  private resolvePeriodBounds(periode: string): { dateDebut: string; dateFin: string } {
    if (!periode || typeof periode !== 'string') {
      throw new BadRequestException('Le filtre periode est obligatoire');
    }

    const trimmed = periode.trim();

    const monthPattern = /^\d{4}-\d{2}$/;
    if (monthPattern.test(trimmed)) {
      const [yearRaw, monthRaw] = trimmed.split('-');
      const year = Number(yearRaw);
      const month = Number(monthRaw);
      const dateDebut = `${yearRaw}-${monthRaw}-01`;
      const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
      const dateFin = `${yearRaw}-${monthRaw}-${String(lastDay).padStart(2, '0')}`;
      return { dateDebut, dateFin };
    }

    const rangePattern = /^(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2})$/;
    const rangeMatch = trimmed.match(rangePattern);
    if (rangeMatch) {
      const [, dateDebut, dateFin] = rangeMatch;
      const start = Date.parse(dateDebut);
      const end = Date.parse(dateFin);

      if (Number.isNaN(start) || Number.isNaN(end) || start > end) {
        throw new BadRequestException('Periode invalide: format attendu YYYY-MM ou YYYY-MM-DD:YYYY-MM-DD');
      }

      return { dateDebut, dateFin };
    }

    throw new BadRequestException('Periode invalide: format attendu YYYY-MM ou YYYY-MM-DD:YYYY-MM-DD');
  }

  private async loadDataset(actor: AuthenticatedUser, filters: PivotFilters): Promise<AnalytiqueDatasetRow[]> {
    const params: unknown[] = [actor.tenantId, filters.exerciceId, filters.dateDebut, filters.dateFin];
    const where = [
      'd.client_id = $1',
      'd.exercice_id = $2',
      'd.date_depense >= $3::date',
      'd.date_depense <= $4::date',
      "d.statut <> 'annulee'"
    ];

    if (filters.entite) {
      params.push(filters.entite);
      where.push(`d.projet_id = $${params.length}`);
    }

    if (filters.axeAnalytique) {
      params.push(filters.axeAnalytique);
      where.push(`lb.action_id = $${params.length}`);
    }

    if (filters.composanteBudgetaire) {
      params.push(filters.composanteBudgetaire);
      where.push(`(sec.code || ' / ' || prg.code || ' / ' || act.code) = $${params.length}`);
    }

    if (filters.fournisseurId) {
      params.push(filters.fournisseurId);
      where.push(`d.fournisseur_id = $${params.length}`);
    }

    if (filters.statut) {
      params.push(filters.statut);
      where.push(`d.statut = $${params.length}`);
    }

    const result = await this.postgresService.query<AnalytiqueRawRow>(
      `
        WITH paiements_agg AS (
          SELECT
            p.depense_id,
            COALESCE(SUM(CASE WHEN p.statut IN ('execute', 'reconcilie') THEN p.montant ELSE 0 END), 0)::numeric AS montant_paye_depense
          FROM public.paiements p
          WHERE p.client_id = $1
          GROUP BY p.depense_id
        )
        SELECT
          d.id AS depense_id,
          d.date_depense::text AS date_depense,
          prj.id AS projet_id,
          prj.code AS projet_code,
          prj.nom AS projet_nom,
          sec.code AS section_code,
          prg.code AS programme_code,
          act.id AS action_id,
          act.code AS action_code,
          fr.id AS fournisseur_id,
          fr.code AS fournisseur_code,
          fr.nom AS fournisseur_nom,
          d.statut AS depense_statut,
          COALESCE(lb.montant_modifie, 0) AS montant_budget_modifie,
          COALESCE(lb.montant_engage, 0) AS montant_engage,
          COALESCE(lb.montant_paye, 0) AS montant_paye_ligne,
          COALESCE(d.montant, 0) AS montant_depense,
          COALESCE(pa.montant_paye_depense, 0) AS montant_paye_depense
        FROM public.depenses d
        LEFT JOIN public.lignes_budgetaires lb ON lb.id = d.ligne_budgetaire_id AND lb.client_id = d.client_id
        LEFT JOIN public.actions act ON act.id = lb.action_id
        LEFT JOIN public.programmes prg ON prg.id = act.programme_id
        LEFT JOIN public.sections sec ON sec.id = prg.section_id
        LEFT JOIN public.projets prj ON prj.id = d.projet_id AND prj.client_id = d.client_id
        LEFT JOIN public.fournisseurs fr ON fr.id = d.fournisseur_id AND fr.client_id = d.client_id
        LEFT JOIN paiements_agg pa ON pa.depense_id = d.id
        WHERE ${where.join('\n          AND ')}
        ORDER BY d.date_depense ASC, d.id ASC
      `,
      params
    );

    return result.rows.map((row) => {
      const period = row.date_depense.slice(0, 7);
      const composante = `${row.section_code ?? 'SEC-NA'} / ${row.programme_code ?? 'PRG-NA'} / ${row.action_code ?? 'ACT-NA'}`;

      return {
        periode: period,
        entite: row.projet_code && row.projet_nom ? `${row.projet_code} - ${row.projet_nom}` : EMPTY_KEY,
        axeAnalytique: row.action_code ?? EMPTY_KEY,
        composanteBudgetaire: composante,
        fournisseur: row.fournisseur_code && row.fournisseur_nom ? `${row.fournisseur_code} - ${row.fournisseur_nom}` : EMPTY_KEY,
        statut: row.depense_statut,
        montantBudgetModifie: round2(Number(row.montant_budget_modifie ?? 0)),
        montantEngage: round2(Number(row.montant_engage ?? 0)),
        montantPaye: round2(Number(row.montant_paye_depense ?? row.montant_paye_ligne ?? 0)),
        montantDepense: round2(Number(row.montant_depense ?? 0)),
        count: 1
      };
    });
  }

  private buildPivot(rows: AnalytiqueDatasetRow[], filters: PivotFilters): {
    rowKeys: string[];
    columnKeys: string[];
    cells: PivotCell[];
    rowTotals: Array<{ key: string; total: number }>;
    columnTotals: Array<{ key: string; total: number }>;
    grandTotal: number;
  } {
    const matrix = new Map<string, number>();
    const rowSet = new Set<string>();
    const columnSet = new Set<string>();
    const rowTotals = new Map<string, number>();
    const columnTotals = new Map<string, number>();

    for (const row of rows) {
      const rowKey = this.resolveDimensionValue(row, filters.rowDimension);
      const columnKey = this.resolveDimensionValue(row, filters.columnDimension);
      const value = this.resolveMeasureValue(row, filters.measure);
      const matrixKey = `${rowKey}::${columnKey}`;

      rowSet.add(rowKey);
      columnSet.add(columnKey);
      matrix.set(matrixKey, round2((matrix.get(matrixKey) ?? 0) + value));
      rowTotals.set(rowKey, round2((rowTotals.get(rowKey) ?? 0) + value));
      columnTotals.set(columnKey, round2((columnTotals.get(columnKey) ?? 0) + value));
    }

    const rowKeys = Array.from(rowSet).sort((left, right) => left.localeCompare(right));
    const columnKeys = Array.from(columnSet).sort((left, right) => left.localeCompare(right));

    const cells: PivotCell[] = [];
    for (const rowKey of rowKeys) {
      for (const columnKey of columnKeys) {
        const value = matrix.get(`${rowKey}::${columnKey}`);
        if (typeof value === 'number' && value !== 0) {
          cells.push({ rowKey, columnKey, value: round2(value) });
        }
      }
    }

    return {
      rowKeys,
      columnKeys,
      cells,
      rowTotals: Array.from(rowTotals.entries()).map(([key, total]) => ({ key, total: round2(total) })),
      columnTotals: Array.from(columnTotals.entries()).map(([key, total]) => ({ key, total: round2(total) })),
      grandTotal: round2(Array.from(rowTotals.values()).reduce((sum, value) => sum + value, 0))
    };
  }

  private resolveDimensionValue(row: AnalytiqueDatasetRow, dimension: ReportingAnalytiqueDimension): string {
    switch (dimension) {
      case 'periode':
        return row.periode || EMPTY_KEY;
      case 'entite':
        return row.entite || EMPTY_KEY;
      case 'axe-analytique':
        return row.axeAnalytique || EMPTY_KEY;
      case 'composante-budgetaire':
        return row.composanteBudgetaire || EMPTY_KEY;
      case 'fournisseur':
        return row.fournisseur || EMPTY_KEY;
      case 'statut':
        return row.statut || EMPTY_KEY;
      default:
        return EMPTY_KEY;
    }
  }

  private resolveMeasureValue(row: AnalytiqueDatasetRow, measure: ReportingAnalytiqueMeasure): number {
    switch (measure) {
      case 'montant-budget-modifie':
        return row.montantBudgetModifie;
      case 'montant-engage':
        return row.montantEngage;
      case 'montant-paye':
        return row.montantPaye;
      case 'montant-depense':
        return row.montantDepense;
      case 'count':
        return row.count;
      default:
        return 0;
    }
  }

  private buildFilename(view: ReportingAnalytiqueView, format: ReportingAnalytiqueExportFormat): string {
    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    return `reporting-analytique-${view}-${timestamp}.${format}`;
  }

  private resolveMimeType(format: ReportingAnalytiqueExportFormat): string {
    if (format === 'csv') {
      return 'text/csv; charset=utf-8';
    }

    if (format === 'xlsx') {
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    return 'application/pdf';
  }

  private buildExportContent(
    report: Awaited<ReturnType<ReportingAnalytiqueService['getTableauCroise']>> | Awaited<ReturnType<ReportingAnalytiqueService['getDashboard']>>,
    view: ReportingAnalytiqueView,
    format: ReportingAnalytiqueExportFormat
  ): Buffer {
    if (format === 'csv') {
      return this.buildCsv(report, view);
    }

    if (format === 'xlsx') {
      return this.buildXlsx(report, view);
    }

    return this.buildPdf(report, view);
  }

  private buildCsv(
    report: Awaited<ReturnType<ReportingAnalytiqueService['getTableauCroise']>> | Awaited<ReturnType<ReportingAnalytiqueService['getDashboard']>>,
    view: ReportingAnalytiqueView
  ): Buffer {
    if (view === 'tableau-croise') {
      const tableReport = report as Awaited<ReturnType<ReportingAnalytiqueService['getTableauCroise']>>;
      const header = ['rowKey', ...tableReport.columnKeys];
      const lines = [header.join(',')];

      for (const row of tableReport.rows) {
        const valueMap = new Map<string, number>(row.values.map((value: { columnKey: string; value: number }) => [value.columnKey, value.value]));
        const values = tableReport.columnKeys.map((columnKey: string) => valueMap.get(columnKey) ?? 0);
        lines.push([this.escapeCsvCell(row.rowKey), ...values].join(','));
      }

      lines.push('');
      lines.push(`# Meta,rowDimension=${tableReport.filters.rowDimension},columnDimension=${tableReport.filters.columnDimension},measure=${tableReport.filters.measure}`);
      lines.push(`# Meta,periode=${tableReport.filters.periode},dateDebut=${tableReport.filters.dateDebut},dateFin=${tableReport.filters.dateFin}`);
      return Buffer.from(lines.join('\n'), 'utf-8');
    }

    const dashboardReport = report as Awaited<ReturnType<ReportingAnalytiqueService['getDashboard']>>;

    const lines = [
      'kpi,valeur',
      `totalMesure,${dashboardReport.kpis.totalMesure}`,
      `volumeLignes,${dashboardReport.kpis.volumeLignes}`,
      `totalMontantBudgetModifie,${dashboardReport.kpis.totalMontantBudgetModifie}`,
      `totalMontantPaye,${dashboardReport.kpis.totalMontantPaye}`,
      '',
      'topRows,key,total',
      ...dashboardReport.topRows.map((item: { key: string; total: number }) => `${this.escapeCsvCell(item.key)},${item.total}`),
      '',
      'topColumns,key,total',
      ...dashboardReport.topColumns.map((item: { key: string; total: number }) => `${this.escapeCsvCell(item.key)},${item.total}`),
      '',
      'anomalies,entite,axeAnalytique,composanteBudgetaire,statut,ecart',
      ...dashboardReport.anomalies.map(
        (item: { entite: string; axeAnalytique: string; composanteBudgetaire: string; statut: string; ecart: number }) =>
          `${this.escapeCsvCell(item.entite)},${this.escapeCsvCell(item.axeAnalytique)},${this.escapeCsvCell(item.composanteBudgetaire)},${this.escapeCsvCell(item.statut)},${item.ecart}`
      ),
      '',
      `# Meta,rowDimension=${dashboardReport.filters.rowDimension},columnDimension=${dashboardReport.filters.columnDimension},measure=${dashboardReport.filters.measure}`,
      `# Meta,periode=${dashboardReport.filters.periode},dateDebut=${dashboardReport.filters.dateDebut},dateFin=${dashboardReport.filters.dateFin}`
    ];

    return Buffer.from(lines.join('\n'), 'utf-8');
  }

  private buildXlsx(
    report: Awaited<ReturnType<ReportingAnalytiqueService['getTableauCroise']>> | Awaited<ReturnType<ReportingAnalytiqueService['getDashboard']>>,
    view: ReportingAnalytiqueView
  ): Buffer {
    const rows = this.buildTabularRows(report, view);

    const files = [
      {
        name: '[Content_Types].xml',
        content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`
      },
      {
        name: '_rels/.rels',
        content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
      },
      {
        name: 'xl/workbook.xml',
        content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="reporting-analytique" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`
      },
      {
        name: 'xl/_rels/workbook.xml.rels',
        content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`
      },
      {
        name: 'xl/worksheets/sheet1.xml',
        content: this.buildWorksheetXml(rows)
      }
    ];

    return this.buildZipArchive(files);
  }

  private buildPdf(
    report: Awaited<ReturnType<ReportingAnalytiqueService['getTableauCroise']>> | Awaited<ReturnType<ReportingAnalytiqueService['getDashboard']>>,
    view: ReportingAnalytiqueView
  ): Buffer {
    const lines = view === 'tableau-croise'
      ? (() => {
          const tableReport = report as Awaited<ReturnType<ReportingAnalytiqueService['getTableauCroise']>>;
          return [
            'Reporting analytique - Tableau croise',
            `Periode: ${tableReport.filters.dateDebut} -> ${tableReport.filters.dateFin}`,
            `Dimensions: ${tableReport.filters.rowDimension} x ${tableReport.filters.columnDimension}`,
            `Mesure: ${tableReport.filters.measure}`,
            `Total: ${tableReport.summary.grandTotal}`,
            `Nombre lignes: ${tableReport.summary.totalRows}`,
            `Nombre colonnes: ${tableReport.summary.totalColumns}`
          ];
        })()
      : (() => {
          const dashboardReport = report as Awaited<ReturnType<ReportingAnalytiqueService['getDashboard']>>;
          return [
            'Reporting analytique - Dashboard',
            `Periode: ${dashboardReport.filters.dateDebut} -> ${dashboardReport.filters.dateFin}`,
            `Dimensions: ${dashboardReport.filters.rowDimension} x ${dashboardReport.filters.columnDimension}`,
            `Mesure: ${dashboardReport.filters.measure}`,
            `Total mesure: ${dashboardReport.kpis.totalMesure}`,
            `Volume lignes: ${dashboardReport.kpis.volumeLignes}`
          ];
        })();

    const contentLines = lines.map((line, index) => `BT /F1 12 Tf 72 ${760 - index * 18} Td (${this.escapePdfText(line)}) Tj ET`);
    const contentStream = contentLines.join('\n');

    const objects = [
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj',
      '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
      '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
      `5 0 obj << /Length ${Buffer.byteLength(contentStream, 'utf-8')} >> stream\n${contentStream}\nendstream endobj`
    ];

    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [0];
    for (const object of objects) {
      offsets.push(Buffer.byteLength(pdf, 'utf-8'));
      pdf += `${object}\n`;
    }

    const xrefOffset = Buffer.byteLength(pdf, 'utf-8');
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;

    for (let index = 1; index <= objects.length; index += 1) {
      pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
    }

    pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return Buffer.from(pdf, 'utf-8');
  }

  private buildWorksheetXml(rows: string[][]): string {
    const sheetRows: string[] = [];
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex] ?? [];
      const rowNumber = rowIndex + 1;
      const cells: string[] = [];

      for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
        const value = row[columnIndex] ?? '';
        const cellRef = `${this.toExcelColumnName(columnIndex)}${rowNumber}`;
        const numeric = Number(value);

        if (value !== '' && Number.isFinite(numeric)) {
          cells.push(`<c r="${cellRef}"><v>${numeric}</v></c>`);
        } else {
          cells.push(`<c r="${cellRef}" t="inlineStr"><is><t>${this.escapeXml(value)}</t></is></c>`);
        }
      }

      sheetRows.push(`<row r="${rowNumber}">${cells.join('')}</row>`);
    }

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${sheetRows.join('')}</sheetData>
</worksheet>`;
  }

  private buildZipArchive(files: Array<{ name: string; content: string }>): Buffer {
    const localParts: Buffer[] = [];
    const centralParts: Buffer[] = [];
    let offset = 0;

    for (const file of files) {
      const nameBuffer = Buffer.from(file.name, 'utf-8');
      const dataBuffer = Buffer.from(file.content, 'utf-8');
      const crc32 = this.computeCrc32(dataBuffer);

      const localHeader = Buffer.alloc(30);
      localHeader.writeUInt32LE(0x04034b50, 0);
      localHeader.writeUInt16LE(20, 4);
      localHeader.writeUInt16LE(0, 6);
      localHeader.writeUInt16LE(0, 8);
      localHeader.writeUInt16LE(0, 10);
      localHeader.writeUInt16LE(0, 12);
      localHeader.writeUInt32LE(crc32, 14);
      localHeader.writeUInt32LE(dataBuffer.length, 18);
      localHeader.writeUInt32LE(dataBuffer.length, 22);
      localHeader.writeUInt16LE(nameBuffer.length, 26);
      localHeader.writeUInt16LE(0, 28);

      localParts.push(localHeader, nameBuffer, dataBuffer);

      const centralHeader = Buffer.alloc(46);
      centralHeader.writeUInt32LE(0x02014b50, 0);
      centralHeader.writeUInt16LE(20, 4);
      centralHeader.writeUInt16LE(20, 6);
      centralHeader.writeUInt16LE(0, 8);
      centralHeader.writeUInt16LE(0, 10);
      centralHeader.writeUInt16LE(0, 12);
      centralHeader.writeUInt16LE(0, 14);
      centralHeader.writeUInt32LE(crc32, 16);
      centralHeader.writeUInt32LE(dataBuffer.length, 20);
      centralHeader.writeUInt32LE(dataBuffer.length, 24);
      centralHeader.writeUInt16LE(nameBuffer.length, 28);
      centralHeader.writeUInt16LE(0, 30);
      centralHeader.writeUInt16LE(0, 32);
      centralHeader.writeUInt16LE(0, 34);
      centralHeader.writeUInt16LE(0, 36);
      centralHeader.writeUInt32LE(0, 38);
      centralHeader.writeUInt32LE(offset, 42);

      centralParts.push(centralHeader, nameBuffer);
      offset += localHeader.length + nameBuffer.length + dataBuffer.length;
    }

    const centralDirectory = Buffer.concat(centralParts);
    const endRecord = Buffer.alloc(22);
    endRecord.writeUInt32LE(0x06054b50, 0);
    endRecord.writeUInt16LE(0, 4);
    endRecord.writeUInt16LE(0, 6);
    endRecord.writeUInt16LE(files.length, 8);
    endRecord.writeUInt16LE(files.length, 10);
    endRecord.writeUInt32LE(centralDirectory.length, 12);
    endRecord.writeUInt32LE(offset, 16);
    endRecord.writeUInt16LE(0, 20);

    return Buffer.concat([...localParts, centralDirectory, endRecord]);
  }

  private buildTabularRows(
    report: Awaited<ReturnType<ReportingAnalytiqueService['getTableauCroise']>> | Awaited<ReturnType<ReportingAnalytiqueService['getDashboard']>>,
    view: ReportingAnalytiqueView
  ): string[][] {
    if (view === 'tableau-croise') {
      const tableReport = report as Awaited<ReturnType<ReportingAnalytiqueService['getTableauCroise']>>;
      const rows: string[][] = [['rowKey', ...tableReport.columnKeys]];

      for (const row of tableReport.rows) {
        const valueMap = new Map<string, number>(row.values.map((value: { columnKey: string; value: number }) => [value.columnKey, value.value]));
        rows.push([row.rowKey, ...tableReport.columnKeys.map((columnKey) => String(valueMap.get(columnKey) ?? 0))]);
      }

      rows.push([]);
      rows.push([
        '# Meta',
        `rowDimension=${tableReport.filters.rowDimension}`,
        `columnDimension=${tableReport.filters.columnDimension}`,
        `measure=${tableReport.filters.measure}`
      ]);
      rows.push([
        '# Meta',
        `periode=${tableReport.filters.periode}`,
        `dateDebut=${tableReport.filters.dateDebut}`,
        `dateFin=${tableReport.filters.dateFin}`
      ]);

      return rows;
    }

    const dashboardReport = report as Awaited<ReturnType<ReportingAnalytiqueService['getDashboard']>>;
    const rows: string[][] = [
      ['kpi', 'valeur'],
      ['totalMesure', String(dashboardReport.kpis.totalMesure)],
      ['volumeLignes', String(dashboardReport.kpis.volumeLignes)],
      ['totalMontantBudgetModifie', String(dashboardReport.kpis.totalMontantBudgetModifie)],
      ['totalMontantPaye', String(dashboardReport.kpis.totalMontantPaye)],
      [],
      ['topRows', 'key', 'total'],
      ...dashboardReport.topRows.map((item: { key: string; total: number }) => [item.key, String(item.total)]),
      [],
      ['topColumns', 'key', 'total'],
      ...dashboardReport.topColumns.map((item: { key: string; total: number }) => [item.key, String(item.total)]),
      [],
      ['anomalies', 'entite', 'axeAnalytique', 'composanteBudgetaire', 'statut', 'ecart'],
      ...dashboardReport.anomalies.map((item: { entite: string; axeAnalytique: string; composanteBudgetaire: string; statut: string; ecart: number }) => [
        item.entite,
        item.axeAnalytique,
        item.composanteBudgetaire,
        item.statut,
        String(item.ecart)
      ]),
      [],
      [
        '# Meta',
        `rowDimension=${dashboardReport.filters.rowDimension}`,
        `columnDimension=${dashboardReport.filters.columnDimension}`,
        `measure=${dashboardReport.filters.measure}`
      ],
      [
        '# Meta',
        `periode=${dashboardReport.filters.periode}`,
        `dateDebut=${dashboardReport.filters.dateDebut}`,
        `dateFin=${dashboardReport.filters.dateFin}`
      ]
    ];

    return rows;
  }

  private computeCrc32(buffer: Buffer): number {
    let crc = 0xffffffff;
    for (const value of buffer) {
      const index = (crc ^ value) & 0xff;
      crc = (crc >>> 8) ^ CRC32_TABLE[index];
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  private toExcelColumnName(index: number): string {
    let dividend = index + 1;
    let columnName = '';
    while (dividend > 0) {
      const modulo = (dividend - 1) % 26;
      columnName = String.fromCharCode(65 + modulo) + columnName;
      dividend = Math.floor((dividend - modulo) / 26);
    }
    return columnName;
  }

  private cleanupExpiredExportJobs() {
    const now = Date.now();
    for (const [exportId, job] of this.exportJobs.entries()) {
      if (job.expiresAt <= now) {
        this.exportJobs.delete(exportId);
      }
    }
  }

  private getExportJobForActor(actor: AuthenticatedUser, exportId: string): ExportJob {
    const job = this.exportJobs.get(exportId);

    if (!job || job.tenantId !== actor.tenantId || job.userId !== actor.sub) {
      throw new NotFoundException('Export introuvable pour ce tenant');
    }

    return job;
  }

  private signDownloadToken(job: ExportJob): string {
    const payload = {
      exportId: job.exportId,
      tenantId: job.tenantId,
      userId: job.userId,
      exp: Date.now() + 5 * 60 * 1000
    };

    const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
    const signature = createHmac('sha256', this.signingSecret).update(encodedPayload).digest('base64url');

    return `${encodedPayload}.${signature}`;
  }

  private verifyDownloadToken(token: string): { exportId: string; tenantId: string; userId: string; exp: number } {
    if (!token || !token.includes('.')) {
      throw new BadRequestException('Jeton de telechargement invalide');
    }

    const [encodedPayload, signature] = token.split('.');
    const expectedSignature = createHmac('sha256', this.signingSecret).update(encodedPayload).digest('base64url');

    const providedBuffer = Buffer.from(signature, 'utf-8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');

    if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) {
      throw new BadRequestException('Signature de telechargement invalide');
    }

    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf-8')) as {
      exportId: string;
      tenantId: string;
      userId: string;
      exp: number;
    };

    if (!payload.exportId || !payload.tenantId || !payload.userId || !payload.exp) {
      throw new BadRequestException('Jeton de telechargement incomplet');
    }

    return payload;
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private escapePdfText(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }

  private escapeCsvCell(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }

    return value;
  }
}
