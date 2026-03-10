import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { AuthorizationAuditService } from '../auth/authorization-audit.service';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PostgresService } from '../common/postgres.service';
import type {
  ReportingFournisseursAgingBucket,
  ReportingFournisseursExportFormat,
  ReportingFournisseursExportRequestDto,
  ReportingFournisseursQueryDto,
  ReportingFournisseursView
} from './dto/reporting-fournisseurs.dto';

interface DetteRawRow {
  facture_id: string;
  facture_numero: string;
  facture_date: string;
  date_echeance: string | null;
  facture_statut: string;
  fournisseur_id: string;
  fournisseur_code: string;
  fournisseur_nom: string;
  montant_ttc: string | number;
  total_liquide: string | number;
  total_paye: string | number;
  dernier_paiement: string | null;
  paiements_count: string | number;
  ecritures_count: string | number;
}

interface AvanceRawRow {
  depense_id: string;
  depense_numero: string;
  depense_date: string;
  depense_statut: string;
  fournisseur_id: string;
  fournisseur_code: string;
  fournisseur_nom: string;
  avance_initiale: string | number;
  consommation: string | number;
  ecritures_count: string | number;
}

interface DetteFournisseurRow {
  factureId: string;
  factureNumero: string;
  dateFacture: string;
  dateEcheance: string | null;
  fournisseurId: string;
  fournisseurCode: string;
  fournisseurNom: string;
  statut: string;
  agingBucket: ReportingFournisseursAgingBucket;
  joursRetard: number;
  montantFacture: number;
  montantLiquide: number;
  montantPaye: number;
  resteAPayer: number;
  ecartRegularisation: number;
  statutRegularisation: 'regularisee' | 'partielle' | 'a-regulariser';
  dernierPaiement: string | null;
  nombrePaiements: number;
  ecrituresAssociees: number;
}

interface AvanceRegularisationRow {
  fournisseurId: string;
  fournisseurCode: string;
  fournisseurNom: string;
  avanceInitiale: number;
  consommation: number;
  ecart: number;
  statutRegularisation: 'regularisee' | 'surconsommation' | 'a-regulariser';
  depensesCount: number;
  ecrituresAssociees: number;
  derniereActivite: string | null;
}

interface ReportingFournisseursFilters {
  periode: string;
  dateDebut: string;
  dateFin: string;
  entite?: string;
  fournisseurId?: string;
  statut?: string;
  agingBucket?: ReportingFournisseursAgingBucket;
  page: number;
  pageSize: number;
}

type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface ExportJob {
  exportId: string;
  tenantId: string;
  userId: string;
  view: ReportingFournisseursView;
  format: ReportingFournisseursExportFormat;
  status: ExportStatus;
  filename: string;
  mimeType: string;
  content: Buffer | null;
  errorMessage?: string;
  createdAt: string;
  expiresAt: number;
}

interface ReportSummary {
  count: number;
  totalMontant: number;
  totalResteOuEcart: number;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;
const ASYNC_EXPORT_ROW_THRESHOLD = 1000;
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
export class ReportingFournisseursService {
  private readonly logger = new Logger(ReportingFournisseursService.name);
  private readonly exportJobs = new Map<string, ExportJob>();
  private readonly signingSecret = process.env.EXPORT_SIGNING_SECRET || process.env.JWT_SECRET || randomUUID();

  constructor(
    private readonly postgresService: PostgresService,
    private readonly authorizationAuditService: AuthorizationAuditService
  ) {}

  async getEtatDettesFournisseurs(actor: AuthenticatedUser, query: ReportingFournisseursQueryDto) {
    const filters = this.normalizeQuery(query);
    const rows = await this.loadDettesRows(actor, filters);

    const filteredRows = filters.agingBucket ? rows.filter((row) => row.agingBucket === filters.agingBucket) : rows;

    const paginatedRows = this.paginateRows(filteredRows, filters.page, filters.pageSize);

    return {
      view: 'etat-dettes-fournisseurs' as const,
      filters,
      summary: this.buildDettesSummary(filteredRows),
      pagination: {
        total: filteredRows.length,
        page: filters.page,
        pageSize: filters.pageSize
      },
      rows: paginatedRows
    };
  }

  async getEtatAvancesRegularisations(actor: AuthenticatedUser, query: ReportingFournisseursQueryDto) {
    const filters = this.normalizeQuery(query);
    const rows = await this.loadAvancesRows(actor, filters);
    const paginatedRows = this.paginateRows(rows, filters.page, filters.pageSize);

    return {
      view: 'etat-avances-regularisations' as const,
      filters,
      summary: this.buildAvancesSummary(rows),
      pagination: {
        total: rows.length,
        page: filters.page,
        pageSize: filters.pageSize
      },
      rows: paginatedRows
    };
  }

  async startExport(actor: AuthenticatedUser, query: ReportingFournisseursExportRequestDto): Promise<{ exportId: string; status: ExportStatus }> {
    const report =
      query.view === 'etat-dettes-fournisseurs'
        ? await this.getEtatDettesFournisseurs(actor, query)
        : await this.getEtatAvancesRegularisations(actor, query);
    const rowCount = this.getReportRowCount(report);
    const shouldRunAsync = query.format !== 'csv' || rowCount > ASYNC_EXPORT_ROW_THRESHOLD;

    const exportId = randomUUID();
    const filename = this.buildFilename(query.view, query.format);
    const mimeType = this.resolveMimeType(query.format);

    this.authorizationAuditService.logDecision({
      userId: actor.sub,
      tenantId: actor.tenantId,
      action: `reporting-fournisseurs:export:start:${query.view}`,
      decision: 'allow'
    });

    this.logger.log(
      JSON.stringify({
        event: 'reporting_fournisseurs_export_started',
        exportId,
        tenantId: actor.tenantId,
        userId: actor.sub,
        view: query.view,
        format: query.format,
        timestamp: new Date().toISOString()
      })
    );

    const job: ExportJob = {
      exportId,
      tenantId: actor.tenantId,
      userId: actor.sub,
      view: query.view,
      format: query.format,
      status: shouldRunAsync ? 'pending' : 'completed',
      filename,
      mimeType,
      content: shouldRunAsync ? null : this.buildExportContent(report, query.view, query.format),
      createdAt: new Date().toISOString(),
      expiresAt: Date.now() + 30 * 60 * 1000
    };

    this.exportJobs.set(exportId, job);

    if (shouldRunAsync) {
      setTimeout(() => {
        const current = this.exportJobs.get(exportId);
        if (!current) {
          return;
        }
        current.status = 'processing';
        this.exportJobs.set(exportId, current);
      }, 100);

      setTimeout(() => {
        const current = this.exportJobs.get(exportId);
        if (!current) {
          return;
        }

        try {
          current.content = this.buildExportContent(report, query.view, query.format);
          current.status = 'completed';
        } catch (error) {
          current.status = 'failed';
          current.errorMessage = error instanceof Error ? error.message : 'Echec de generation export';
        }

        this.exportJobs.set(exportId, current);
      }, 300);
    }

    return {
      exportId,
      status: job.status
    };
  }

  getExportStatus(actor: AuthenticatedUser, exportId: string): {
    exportId: string;
    status: ExportStatus;
    downloadUrl?: string;
    filename?: string;
    errorMessage?: string;
  } {
    const job = this.getExportJobForActor(actor, exportId);

    if (job.status !== 'completed') {
      return {
        exportId,
        status: job.status,
        errorMessage: job.errorMessage
      };
    }

    const token = this.signDownloadToken(job);

    return {
      exportId,
      status: job.status,
      downloadUrl: `/reporting-fournisseurs/exports/${encodeURIComponent(exportId)}/download?token=${encodeURIComponent(token)}`,
      filename: job.filename
    };
  }

  downloadExport(actor: AuthenticatedUser, exportId: string, token: string): { filename: string; mimeType: string; content: Buffer } {
    const job = this.getExportJobForActor(actor, exportId);

    if (!job.content || job.status !== 'completed') {
      throw new NotFoundException('Export non disponible');
    }

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
      action: `reporting-fournisseurs:export:download:${job.view}`,
      decision: 'allow'
    });

    this.logger.log(
      JSON.stringify({
        event: 'reporting_fournisseurs_export_downloaded',
        exportId,
        tenantId: actor.tenantId,
        userId: actor.sub,
        view: job.view,
        format: job.format,
        timestamp: new Date().toISOString()
      })
    );

    return {
      filename: job.filename,
      mimeType: job.mimeType,
      content: job.content
    };
  }

  private normalizeQuery(query: ReportingFournisseursQueryDto): ReportingFournisseursFilters {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;

    const periodBounds = this.resolvePeriodBounds(query.periode);

    return {
      periode: query.periode,
      dateDebut: periodBounds.dateDebut,
      dateFin: periodBounds.dateFin,
      entite: query.entite,
      fournisseurId: query.fournisseurId,
      statut: query.statut,
      agingBucket: query.agingBucket,
      page,
      pageSize
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

  private async loadDettesRows(actor: AuthenticatedUser, filters: ReportingFournisseursFilters): Promise<DetteFournisseurRow[]> {
    const params: unknown[] = [actor.tenantId, filters.dateDebut, filters.dateFin];
    const where = ['f.client_id = $1', 'f.date_facture >= $2::date', 'f.date_facture <= $3::date'];

    if (filters.entite) {
      params.push(filters.entite);
      where.push(`f.projet_id = $${params.length}`);
    }

    if (filters.fournisseurId) {
      params.push(filters.fournisseurId);
      where.push(`f.fournisseur_id = $${params.length}`);
    }

    if (filters.statut) {
      params.push(filters.statut);
      where.push(`f.statut = $${params.length}`);
    }

    const result = await this.postgresService.query<DetteRawRow>(
      `
        WITH liquidations AS (
          SELECT
            df.facture_id,
            COALESCE(SUM(df.montant), 0)::numeric AS total_liquide
          FROM public.depense_factures df
          INNER JOIN public.depenses d ON d.id = df.depense_id
          WHERE d.client_id = $1
            AND d.statut <> 'annulee'
          GROUP BY df.facture_id
        ),
        depense_totaux AS (
          SELECT
            df.depense_id,
            COALESCE(SUM(df.montant), 0)::numeric AS total_liquide_depense
          FROM public.depense_factures df
          GROUP BY df.depense_id
        ),
        paiements_depenses AS (
          SELECT
            p.depense_id,
            COALESCE(SUM(CASE WHEN p.statut = 'valide' THEN p.montant ELSE 0 END), 0)::numeric AS total_paye_depense,
            MAX(CASE WHEN p.statut = 'valide' THEN p.date_paiement END)::text AS dernier_paiement,
            COUNT(*) FILTER (WHERE p.statut = 'valide')::int AS paiements_count
          FROM public.paiements p
          GROUP BY p.depense_id
        ),
        paiements_factures AS (
          SELECT
            df.facture_id,
            COALESCE(
              SUM(
                CASE
                  WHEN dt.total_liquide_depense > 0 THEN pd.total_paye_depense * (df.montant / dt.total_liquide_depense)
                  ELSE 0
                END
              ),
              0
            )::numeric AS total_paye,
            MAX(pd.dernier_paiement)::text AS dernier_paiement,
            COALESCE(SUM(pd.paiements_count), 0)::int AS paiements_count
          FROM public.depense_factures df
          INNER JOIN public.depenses d ON d.id = df.depense_id AND d.client_id = $1
          INNER JOIN depense_totaux dt ON dt.depense_id = d.id
          LEFT JOIN paiements_depenses pd ON pd.depense_id = d.id
          GROUP BY df.facture_id
        ),
        ecritures_factures AS (
          SELECT
            ec.facture_id,
            COUNT(DISTINCT ec.id)::int AS ecritures_count
          FROM public.ecritures_comptables ec
          WHERE ec.client_id = $1
            AND ec.facture_id IS NOT NULL
          GROUP BY ec.facture_id
        )
        SELECT
          f.id AS facture_id,
          f.numero AS facture_numero,
          f.date_facture::text AS facture_date,
          f.date_echeance::text AS date_echeance,
          f.statut AS facture_statut,
          fr.id AS fournisseur_id,
          fr.code AS fournisseur_code,
          fr.nom AS fournisseur_nom,
          f.montant_ttc,
          COALESCE(l.total_liquide, 0) AS total_liquide,
          COALESCE(pf.total_paye, 0) AS total_paye,
          pf.dernier_paiement,
          COALESCE(pf.paiements_count, 0) AS paiements_count,
          COALESCE(ef.ecritures_count, 0) AS ecritures_count
        FROM public.factures f
        INNER JOIN public.fournisseurs fr ON fr.id = f.fournisseur_id AND fr.client_id = f.client_id
        LEFT JOIN liquidations l ON l.facture_id = f.id
        LEFT JOIN paiements_factures pf ON pf.facture_id = f.id
        LEFT JOIN ecritures_factures ef ON ef.facture_id = f.id
        WHERE ${where.join('\n          AND ')}
        ORDER BY fr.nom ASC, f.date_facture ASC, f.numero ASC
      `,
      params
    );

    const referenceDate = new Date(filters.dateFin);

    return result.rows.map((row) => {
      const montantFacture = Number(row.montant_ttc ?? 0);
      const montantLiquide = Number(row.total_liquide ?? 0);
      const montantPaye = Number(row.total_paye ?? 0);
      const resteAPayer = round2(Math.max(0, montantFacture - montantPaye));
      const ecartRegularisation = round2(montantFacture - montantLiquide);

      const dueDateString = row.date_echeance ?? row.facture_date;
      const dueDate = new Date(dueDateString);
      const daysDiff = Math.floor((referenceDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const joursRetard = Math.max(0, Number.isNaN(daysDiff) ? 0 : daysDiff);

      const agingBucket = this.resolveAgingBucket(joursRetard);

      return {
        factureId: row.facture_id,
        factureNumero: row.facture_numero,
        dateFacture: row.facture_date,
        dateEcheance: row.date_echeance,
        fournisseurId: row.fournisseur_id,
        fournisseurCode: row.fournisseur_code,
        fournisseurNom: row.fournisseur_nom,
        statut: row.facture_statut,
        agingBucket,
        joursRetard,
        montantFacture: round2(montantFacture),
        montantLiquide: round2(montantLiquide),
        montantPaye: round2(montantPaye),
        resteAPayer,
        ecartRegularisation,
        statutRegularisation:
          Math.abs(ecartRegularisation) <= 0.01 ? 'regularisee' : montantLiquide > 0 ? 'partielle' : 'a-regulariser',
        dernierPaiement: row.dernier_paiement,
        nombrePaiements: Number(row.paiements_count ?? 0),
        ecrituresAssociees: Number(row.ecritures_count ?? 0)
      };
    });
  }

  private async loadAvancesRows(actor: AuthenticatedUser, filters: ReportingFournisseursFilters): Promise<AvanceRegularisationRow[]> {
    const params: unknown[] = [actor.tenantId, filters.dateDebut, filters.dateFin];
    const where = [
      'd.client_id = $1',
      'd.date_depense >= $2::date',
      'd.date_depense <= $3::date',
      "d.statut <> 'annulee'",
      'd.fournisseur_id IS NOT NULL'
    ];

    if (filters.entite) {
      params.push(filters.entite);
      where.push(`d.projet_id = $${params.length}`);
    }

    if (filters.fournisseurId) {
      params.push(filters.fournisseurId);
      where.push(`d.fournisseur_id = $${params.length}`);
    }

    if (filters.statut) {
      params.push(filters.statut);
      where.push(`d.statut = $${params.length}`);
    }

    const result = await this.postgresService.query<AvanceRawRow>(
      `
        WITH consommation AS (
          SELECT
            df.depense_id,
            COALESCE(SUM(df.montant), 0)::numeric AS consommation
          FROM public.depense_factures df
          GROUP BY df.depense_id
        ),
        ecritures_depenses AS (
          SELECT
            ec.depense_id,
            COUNT(DISTINCT ec.id)::int AS ecritures_count
          FROM public.ecritures_comptables ec
          WHERE ec.client_id = $1
            AND ec.depense_id IS NOT NULL
          GROUP BY ec.depense_id
        )
        SELECT
          d.id AS depense_id,
          d.numero AS depense_numero,
          d.date_depense::text AS depense_date,
          d.statut AS depense_statut,
          fr.id AS fournisseur_id,
          fr.code AS fournisseur_code,
          fr.nom AS fournisseur_nom,
          d.montant AS avance_initiale,
          COALESCE(c.consommation, 0) AS consommation,
          COALESCE(ed.ecritures_count, 0) AS ecritures_count
        FROM public.depenses d
        INNER JOIN public.fournisseurs fr ON fr.id = d.fournisseur_id AND fr.client_id = d.client_id
        LEFT JOIN consommation c ON c.depense_id = d.id
        LEFT JOIN ecritures_depenses ed ON ed.depense_id = d.id
        WHERE ${where.join('\n          AND ')}
        ORDER BY fr.nom ASC, d.date_depense ASC, d.numero ASC
      `,
      params
    );

    const byFournisseur = new Map<string, AvanceRegularisationRow>();

    for (const row of result.rows) {
      const key = row.fournisseur_id;
      const current = byFournisseur.get(key) ?? {
        fournisseurId: row.fournisseur_id,
        fournisseurCode: row.fournisseur_code,
        fournisseurNom: row.fournisseur_nom,
        avanceInitiale: 0,
        consommation: 0,
        ecart: 0,
        statutRegularisation: 'regularisee' as const,
        depensesCount: 0,
        ecrituresAssociees: 0,
        derniereActivite: null
      };

      current.avanceInitiale = round2(current.avanceInitiale + Number(row.avance_initiale ?? 0));
      current.consommation = round2(current.consommation + Number(row.consommation ?? 0));
      current.ecart = round2(current.avanceInitiale - current.consommation);
      current.depensesCount += 1;
      current.ecrituresAssociees += Number(row.ecritures_count ?? 0);
      current.derniereActivite = !current.derniereActivite || row.depense_date > current.derniereActivite ? row.depense_date : current.derniereActivite;

      current.statutRegularisation =
        Math.abs(current.ecart) <= 0.01 ? 'regularisee' : current.ecart < 0 ? 'surconsommation' : 'a-regulariser';

      byFournisseur.set(key, current);
    }

    return Array.from(byFournisseur.values()).sort((left, right) => left.fournisseurNom.localeCompare(right.fournisseurNom));
  }

  private resolveAgingBucket(joursRetard: number): ReportingFournisseursAgingBucket {
    if (joursRetard <= 30) {
      return 'J0-30';
    }

    if (joursRetard <= 60) {
      return 'J31-60';
    }

    if (joursRetard <= 90) {
      return 'J61-90';
    }

    return 'J90+';
  }

  private buildDettesSummary(rows: DetteFournisseurRow[]): ReportSummary {
    return {
      count: rows.length,
      totalMontant: round2(rows.reduce((sum, row) => sum + row.montantFacture, 0)),
      totalResteOuEcart: round2(rows.reduce((sum, row) => sum + row.resteAPayer, 0))
    };
  }

  private buildAvancesSummary(rows: AvanceRegularisationRow[]): ReportSummary {
    return {
      count: rows.length,
      totalMontant: round2(rows.reduce((sum, row) => sum + row.avanceInitiale, 0)),
      totalResteOuEcart: round2(rows.reduce((sum, row) => sum + row.ecart, 0))
    };
  }

  private paginateRows<T>(rows: T[], page: number, pageSize: number): T[] {
    return rows.slice((page - 1) * pageSize, page * pageSize);
  }

  private buildExportContent(
    report:
      | Awaited<ReturnType<ReportingFournisseursService['getEtatDettesFournisseurs']>>
      | Awaited<ReturnType<ReportingFournisseursService['getEtatAvancesRegularisations']>>,
    view: ReportingFournisseursView,
    format: ReportingFournisseursExportFormat
  ): Buffer {
    if (format === 'csv') {
      return Buffer.from(this.buildDelimitedText(report, view, ';'), 'utf-8');
    }

    if (format === 'xlsx') {
      return this.buildXlsxWorkbook(report, view);
    }

    return this.buildPdfDocument(report, view);
  }

  private buildDelimitedText(
    report:
      | Awaited<ReturnType<ReportingFournisseursService['getEtatDettesFournisseurs']>>
      | Awaited<ReturnType<ReportingFournisseursService['getEtatAvancesRegularisations']>>,
    view: ReportingFournisseursView,
    delimiter: ';' | '\t'
  ): string {
    const escapeDelimitedCell = (value: string | number): string => {
      const raw = `${value}`;
      const neutralized = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
      const escaped = neutralized.replace(/"/g, '""');

      if (escaped.includes(delimiter) || escaped.includes('\n') || escaped.includes('\r') || escaped.includes('"')) {
        return `"${escaped}"`;
      }

      return escaped;
    };

    const join = (values: Array<string | number>) => values.map((value) => escapeDelimitedCell(value)).join(delimiter);

    if (view === 'etat-dettes-fournisseurs') {
      const dettesReport = report as Awaited<ReturnType<ReportingFournisseursService['getEtatDettesFournisseurs']>>;
      const lines = [
        join([
          'Fournisseur',
          'Code',
          'Facture',
          'Date facture',
          'Date echeance',
          'Statut',
          'Aging',
          'Jours retard',
          'Montant facture',
          'Montant liquide',
          'Montant paye',
          'Reste a payer',
          'Ecart regularisation',
          'Statut regularisation'
        ])
      ];

      for (const row of dettesReport.rows) {
        lines.push(
          join([
            row.fournisseurNom,
            row.fournisseurCode,
            row.factureNumero,
            row.dateFacture,
            row.dateEcheance ?? '',
            row.statut,
            row.agingBucket,
            row.joursRetard,
            row.montantFacture,
            row.montantLiquide,
            row.montantPaye,
            row.resteAPayer,
            row.ecartRegularisation,
            row.statutRegularisation
          ])
        );
      }

      return lines.join('\n');
    }

    const avancesReport = report as Awaited<ReturnType<ReportingFournisseursService['getEtatAvancesRegularisations']>>;
    const lines = [
      join(['Fournisseur', 'Code', 'Avance initiale', 'Consommation', 'Ecart', 'Statut regularisation', 'Nombre depenses'])
    ];

    for (const row of avancesReport.rows) {
      lines.push(
        join([
          row.fournisseurNom,
          row.fournisseurCode,
          row.avanceInitiale,
          row.consommation,
          row.ecart,
          row.statutRegularisation,
          row.depensesCount
        ])
      );
    }

    return lines.join('\n');
  }

  private buildFilename(view: ReportingFournisseursView, format: ReportingFournisseursExportFormat): string {
    const sanitizedView = view.replace(/[^a-z-]/gi, '-');
    return `${sanitizedView}-${Date.now()}.${format}`;
  }

  private resolveMimeType(format: ReportingFournisseursExportFormat): string {
    if (format === 'csv') {
      return 'text/csv; charset=utf-8';
    }

    if (format === 'xlsx') {
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    return 'application/pdf';
  }

  private getExportJobForActor(actor: AuthenticatedUser, exportId: string): ExportJob {
    const job = this.exportJobs.get(exportId);
    if (!job) {
      throw new NotFoundException('Export introuvable');
    }

    if (job.tenantId !== actor.tenantId || job.userId !== actor.sub) {
      throw new NotFoundException('Export introuvable pour ce tenant');
    }

    if (Date.now() >= job.expiresAt) {
      this.exportJobs.delete(exportId);
      throw new NotFoundException('Export expire');
    }

    return job;
  }

  private getSigningSecret(): string {
    return this.signingSecret;
  }

  private signDownloadToken(job: ExportJob): string {
    const payload = JSON.stringify({
      exportId: job.exportId,
      tenantId: job.tenantId,
      userId: job.userId,
      exp: Date.now() + 10 * 60 * 1000
    });

    const encodedPayload = Buffer.from(payload, 'utf-8').toString('base64url');
    const signature = createHmac('sha256', this.getSigningSecret()).update(encodedPayload).digest('base64url');

    return `${encodedPayload}.${signature}`;
  }

  private verifyDownloadToken(token: string): { exportId: string; tenantId: string; userId: string; exp: number } {
    const [encodedPayload, signature] = token.split('.');

    if (!encodedPayload || !signature) {
      throw new BadRequestException('Jeton de telechargement invalide');
    }

    const expectedSignature = createHmac('sha256', this.getSigningSecret()).update(encodedPayload).digest('base64url');

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

  private getReportRowCount(
    report:
      | Awaited<ReturnType<ReportingFournisseursService['getEtatDettesFournisseurs']>>
      | Awaited<ReturnType<ReportingFournisseursService['getEtatAvancesRegularisations']>>
  ): number {
    return report.rows.length;
  }

  private buildExportRows(
    report:
      | Awaited<ReturnType<ReportingFournisseursService['getEtatDettesFournisseurs']>>
      | Awaited<ReturnType<ReportingFournisseursService['getEtatAvancesRegularisations']>>,
    view: ReportingFournisseursView
  ): Array<Array<string | number>> {
    if (view === 'etat-dettes-fournisseurs') {
      const dettesReport = report as Awaited<ReturnType<ReportingFournisseursService['getEtatDettesFournisseurs']>>;
      const rows: Array<Array<string | number>> = [
        [
          'Fournisseur',
          'Code',
          'Facture',
          'Date facture',
          'Date echeance',
          'Statut',
          'Aging',
          'Jours retard',
          'Montant facture',
          'Montant liquide',
          'Montant paye',
          'Reste a payer',
          'Ecart regularisation',
          'Statut regularisation'
        ]
      ];

      for (const row of dettesReport.rows) {
        rows.push([
          row.fournisseurNom,
          row.fournisseurCode,
          row.factureNumero,
          row.dateFacture,
          row.dateEcheance ?? '',
          row.statut,
          row.agingBucket,
          row.joursRetard,
          row.montantFacture,
          row.montantLiquide,
          row.montantPaye,
          row.resteAPayer,
          row.ecartRegularisation,
          row.statutRegularisation
        ]);
      }

      return rows;
    }

    const avancesReport = report as Awaited<ReturnType<ReportingFournisseursService['getEtatAvancesRegularisations']>>;
    const rows: Array<Array<string | number>> = [['Fournisseur', 'Code', 'Avance initiale', 'Consommation', 'Ecart', 'Statut regularisation', 'Nombre depenses']];

    for (const row of avancesReport.rows) {
      rows.push([row.fournisseurNom, row.fournisseurCode, row.avanceInitiale, row.consommation, row.ecart, row.statutRegularisation, row.depensesCount]);
    }

    return rows;
  }

  private buildXlsxWorkbook(
    report:
      | Awaited<ReturnType<ReportingFournisseursService['getEtatDettesFournisseurs']>>
      | Awaited<ReturnType<ReportingFournisseursService['getEtatAvancesRegularisations']>>,
    view: ReportingFournisseursView
  ): Buffer {
    const rows = this.buildExportRows(report, view);
    const worksheetXml = this.buildWorksheetXml(rows);

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
    <sheet name="Rapport" sheetId="1" r:id="rId1"/>
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
      { name: 'xl/worksheets/sheet1.xml', content: worksheetXml }
    ];

    return this.buildZipArchive(files);
  }

  private buildWorksheetXml(rows: Array<Array<string | number>>): string {
    const cells: string[] = [];

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      const rowNumber = rowIndex + 1;
      const values = rows[rowIndex] ?? [];
      const rowCells: string[] = [];
      for (let colIndex = 0; colIndex < values.length; colIndex += 1) {
        const cellRef = `${this.toExcelColumnName(colIndex)}${rowNumber}`;
        const value = values[colIndex];
        if (typeof value === 'number' && Number.isFinite(value)) {
          rowCells.push(`<c r="${cellRef}"><v>${value}</v></c>`);
          continue;
        }

        const escaped = this.escapeXml(`${value ?? ''}`);
        rowCells.push(`<c r="${cellRef}" t="inlineStr"><is><t>${escaped}</t></is></c>`);
      }
      cells.push(`<row r="${rowNumber}">${rowCells.join('')}</row>`);
    }

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${cells.join('')}</sheetData>
</worksheet>`;
  }

  private buildPdfDocument(
    report:
      | Awaited<ReturnType<ReportingFournisseursService['getEtatDettesFournisseurs']>>
      | Awaited<ReturnType<ReportingFournisseursService['getEtatAvancesRegularisations']>>,
    view: ReportingFournisseursView
  ): Buffer {
    const title = view === 'etat-dettes-fournisseurs' ? 'Etat dettes fournisseurs' : 'Etat avances regularisations';
    const lines = [
      title,
      `Periode: ${report.filters.dateDebut} -> ${report.filters.dateFin}`,
      `Lignes: ${report.rows.length}`,
      `Total: ${report.summary.totalMontant}`,
      `Reste/Ecart: ${report.summary.totalResteOuEcart}`
    ];
    const contentLines = lines.map((line, index) => `BT /F1 12 Tf 72 ${760 - index * 18} Td (${this.escapePdfText(line)}) Tj ET`);
    const contentStream = contentLines.join('\n');

    const objects = [
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj',
      '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
      '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
      `5 0 obj << /Length ${Buffer.byteLength(contentStream, 'utf-8')} >> stream
${contentStream}
endstream endobj`
    ];

    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [0];
    for (const object of objects) {
      offsets.push(Buffer.byteLength(pdf, 'utf-8'));
      pdf += `${object}\n`;
    }

    const xrefOffset = Buffer.byteLength(pdf, 'utf-8');
    pdf += `xref
0 ${objects.length + 1}
0000000000 65535 f 
`;

    for (let index = 1; index <= objects.length; index += 1) {
      pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
    }

    pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>
startxref
${xrefOffset}
%%EOF`;

    return Buffer.from(pdf, 'utf-8');
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
}
