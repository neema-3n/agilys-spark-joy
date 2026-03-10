import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { deflateRawSync } from 'zlib';
import { AuthorizationAuditService } from '../auth/authorization-audit.service';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PostgresService } from '../common/postgres.service';
import type {
  ReportingExecutionTresorerieExportFormat,
  ReportingExecutionTresorerieExportRequestDto,
  ReportingExecutionTresorerieQueryDto,
  ReportingExecutionTresorerieView
} from './dto/reporting-execution-tresorerie.dto';

interface ExecutionBudgetaireRawRow {
  ligne_id: string;
  ligne_libelle: string;
  section_code: string | null;
  section_libelle: string | null;
  programme_code: string | null;
  programme_libelle: string | null;
  action_id: string | null;
  action_code: string | null;
  action_libelle: string | null;
  montant_initial: string | number;
  montant_modifie: string | number;
  montant_engage: string | number;
  montant_paye: string | number;
  disponible: string | number;
}

interface FluxRawRow {
  id: string;
  numero: string;
  date_operation: string;
  type_operation: 'encaissement' | 'decaissement' | 'transfert';
  libelle: string;
  reference_bancaire: string | null;
  compte_code: string | null;
  compte_libelle: string | null;
  montant: string | number;
  statut: string;
  rapproche: boolean;
}

interface CompteSituationRawRow {
  compte_id: string;
  compte_code: string;
  compte_libelle: string;
  solde_actuel: string | number;
  total_encaissements: string | number;
  total_decaissements: string | number;
  total_transferts: string | number;
}

interface PaiementEtatRawRow {
  statut: string;
  count: string | number;
  montant: string | number;
}

interface RapprochementEtatRawRow {
  statut_detaille: string;
  count: string | number;
  ecart_total: string | number;
}

interface DepensePrevisionRawRow {
  date_depense: string;
  montant: string | number;
  montant_paye: string | number;
}

interface ExecutionBudgetaireRow {
  ligneId: string;
  ligneLibelle: string;
  composante: string;
  axeAnalytique: string;
  budgetInitial: number;
  budgetModifie: number;
  engage: number;
  paye: number;
  disponible: number;
  ecartPrevisionExecution: number;
  alerteSeuil: boolean;
}

interface ExecutionBudgetaireFilters {
  exerciceId: string;
  periode: string;
  dateDebut: string;
  dateFin: string;
  entite?: string;
  axeAnalytique?: string;
  seuil: number;
  page: number;
  pageSize: number;
  correlationId?: string;
}

interface TresorerieFilters extends ExecutionBudgetaireFilters {}

type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface ExportJob {
  exportId: string;
  tenantId: string;
  userId: string;
  correlationId?: string;
  view: ReportingExecutionTresorerieView;
  format: ReportingExecutionTresorerieExportFormat;
  status: ExportStatus;
  filename: string;
  mimeType: string;
  content: Buffer | null;
  errorMessage?: string;
  createdAt: string;
  expiresAt: number;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

@Injectable()
export class ReportingExecutionTresorerieService {
  private readonly logger = new Logger(ReportingExecutionTresorerieService.name);
  private readonly exportJobs = new Map<string, ExportJob>();
  private readonly maxExportJobs = 500;
  private readonly signingSecret = process.env.EXPORT_SIGNING_SECRET || process.env.JWT_SECRET || randomUUID();

  constructor(
    private readonly postgresService: PostgresService,
    private readonly authorizationAuditService: AuthorizationAuditService
  ) {}

  async getExecutionBudgetaire(actor: AuthenticatedUser, query: ReportingExecutionTresorerieQueryDto) {
    const filters = this.normalizeQuery(query);
    const rows = await this.loadExecutionRows(actor, filters);
    const paginatedRows = this.paginateRows(rows, filters.page, filters.pageSize);

    return {
      view: 'execution-budgetaire' as const,
      filters,
      summary: {
        count: rows.length,
        totalBudgetModifie: round2(rows.reduce((sum, row) => sum + row.budgetModifie, 0)),
        totalPaye: round2(rows.reduce((sum, row) => sum + row.paye, 0)),
        totalEcart: round2(rows.reduce((sum, row) => sum + row.ecartPrevisionExecution, 0)),
        totalAlertes: rows.filter((row) => row.alerteSeuil).length
      },
      pagination: {
        total: rows.length,
        page: filters.page,
        pageSize: filters.pageSize
      },
      rows: paginatedRows
    };
  }

  async getTresorerie(actor: AuthenticatedUser, query: ReportingExecutionTresorerieQueryDto) {
    const filters = this.normalizeQuery(query);

    const [journalFlux, situationComptes, previsions, etatPaiements, etatRapprochements] = await Promise.all([
      this.loadJournalFlux(actor, filters),
      this.loadSituationComptes(actor, filters),
      this.loadPrevisions(actor, filters),
      this.loadEtatPaiements(actor, filters),
      this.loadEtatRapprochements(actor, filters)
    ]);

    const positionCourante = round2(situationComptes.reduce((sum, compte) => sum + compte.soldeActuel, 0));
    const projectionDecaissements = round2(previsions.reduce((sum, row) => sum + row.decaissementsPrevus, 0));
    const projectionSolde = round2(positionCourante - projectionDecaissements);

    const alertes = [
      {
        code: 'SEUIL_SOLDE',
        severity: projectionSolde < 0 ? 'critical' : projectionSolde <= filters.seuil ? 'high' : 'low',
        message:
          projectionSolde < 0
            ? `Projection de tresorerie negative: ${projectionSolde.toFixed(2)}`
            : `Projection de tresorerie sous seuil: ${projectionSolde.toFixed(2)}`,
        active: projectionSolde <= filters.seuil
      },
      {
        code: 'PENDING_RAPPROCHEMENT',
        severity: 'medium',
        message: `${etatRapprochements.reduce((sum, row) => sum + row.count, 0)} rapprochement(s) en cours ou a traiter`,
        active: etatRapprochements.some((row) => row.count > 0)
      }
    ].filter((alerte) => alerte.active);

    return {
      view: 'tresorerie' as const,
      filters,
      summary: {
        positionCourante,
        projectionSolde,
        totalFlux: journalFlux.length,
        totalAlertes: alertes.length
      },
      journalFlux,
      situationComptes,
      previsions,
      alertes,
      etatPaiements,
      etatRapprochements
    };
  }

  async startExport(actor: AuthenticatedUser, query: ReportingExecutionTresorerieExportRequestDto): Promise<{ exportId: string; status: ExportStatus }> {
    this.cleanupExpiredExportJobs();

    const report =
      query.view === 'execution-budgetaire'
        ? await this.getExecutionBudgetaire(actor, query)
        : await this.getTresorerie(actor, query);

    const exportId = randomUUID();
    const filename = this.buildFilename(query.view, query.format);
    const mimeType = this.resolveMimeType(query.format);

    this.authorizationAuditService.logDecision({
      userId: actor.sub,
      tenantId: actor.tenantId,
      action: `reporting-execution-tresorerie:export:start:${query.view}`,
      decision: 'allow'
    });

    this.logger.log(
      JSON.stringify({
        event: 'reporting_execution_tresorerie_export_started',
        exportId,
        tenantId: actor.tenantId,
        userId: actor.sub,
        view: query.view,
        format: query.format,
        correlationId: query.correlationId ?? null,
        timestamp: new Date().toISOString()
      })
    );

    const job: ExportJob = {
      exportId,
      tenantId: actor.tenantId,
      userId: actor.sub,
      correlationId: query.correlationId,
      view: query.view,
      format: query.format,
      status: 'pending',
      filename,
      mimeType,
      content: null,
      createdAt: new Date().toISOString(),
      expiresAt: Date.now() + 30 * 60 * 1000
    };
    try {
      job.status = 'processing';
      job.content = this.buildExportContent(report, query.view, query.format);
      job.status = 'completed';
    } catch (error) {
      job.status = 'failed';
      job.errorMessage = error instanceof Error ? error.message : 'Echec de generation export';
      this.logger.error(
        JSON.stringify({
          event: 'reporting_execution_tresorerie_export_failed',
          exportId,
          tenantId: actor.tenantId,
          userId: actor.sub,
          view: query.view,
          format: query.format,
          correlationId: query.correlationId ?? null,
          message: job.errorMessage,
          timestamp: new Date().toISOString()
        })
      );
    }

    this.storeExportJob(job);

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
    this.cleanupExpiredExportJobs();
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
      downloadUrl: `/reporting-execution-tresorerie/exports/${encodeURIComponent(exportId)}/download?token=${encodeURIComponent(token)}`,
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
      action: `reporting-execution-tresorerie:export:download:${job.view}`,
      decision: 'allow'
    });

    this.logger.log(
      JSON.stringify({
        event: 'reporting_execution_tresorerie_export_downloaded',
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

  private normalizeQuery(query: ReportingExecutionTresorerieQueryDto): ExecutionBudgetaireFilters {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const threshold = query.seuil ?? 0;
    const periodBounds = this.resolvePeriodBounds(query.periode);

    return {
      exerciceId: query.exerciceId,
      periode: query.periode,
      dateDebut: periodBounds.dateDebut,
      dateFin: periodBounds.dateFin,
      entite: query.entite,
      axeAnalytique: query.axeAnalytique,
      seuil: threshold,
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

  private async loadExecutionRows(actor: AuthenticatedUser, filters: ExecutionBudgetaireFilters): Promise<ExecutionBudgetaireRow[]> {
    const params: unknown[] = [actor.tenantId, filters.exerciceId];
    const where = ['lb.client_id = $1', 'lb.exercice_id = $2'];

    if (filters.entite) {
      params.push(filters.entite);
      where.push(`lb.projet_id = $${params.length}`);
    }

    if (filters.axeAnalytique) {
      params.push(filters.axeAnalytique);
      where.push(`act.id = $${params.length}`);
    }

    const result = await this.postgresService.query<ExecutionBudgetaireRawRow>(
      `
        SELECT
          lb.id AS ligne_id,
          lb.libelle AS ligne_libelle,
          sec.code AS section_code,
          sec.libelle AS section_libelle,
          prg.code AS programme_code,
          prg.libelle AS programme_libelle,
          act.id AS action_id,
          act.code AS action_code,
          act.libelle AS action_libelle,
          lb.montant_initial,
          lb.montant_modifie,
          lb.montant_engage,
          lb.montant_paye,
          lb.disponible
        FROM public.lignes_budgetaires lb
        INNER JOIN public.actions act ON act.id = lb.action_id
        INNER JOIN public.programmes prg ON prg.id = act.programme_id
        INNER JOIN public.sections sec ON sec.id = prg.section_id
        WHERE ${where.join('\n          AND ')}
        ORDER BY sec.code ASC, prg.code ASC, act.code ASC, lb.libelle ASC
      `,
      params
    );

    return result.rows.map((row) => {
      const budgetModifie = Number(row.montant_modifie ?? 0);
      const paye = Number(row.montant_paye ?? 0);
      const ecart = round2(budgetModifie - paye);

      return {
        ligneId: row.ligne_id,
        ligneLibelle: row.ligne_libelle,
        composante: `${row.section_code ?? 'SEC-NA'} / ${row.programme_code ?? 'PRG-NA'} / ${row.action_code ?? 'ACT-NA'}`,
        axeAnalytique: row.action_libelle ?? row.action_code ?? 'Axe non defini',
        budgetInitial: round2(Number(row.montant_initial ?? 0)),
        budgetModifie: round2(budgetModifie),
        engage: round2(Number(row.montant_engage ?? 0)),
        paye: round2(paye),
        disponible: round2(Number(row.disponible ?? 0)),
        ecartPrevisionExecution: ecart,
        alerteSeuil: Math.abs(ecart) >= filters.seuil
      };
    });
  }

  private async loadJournalFlux(actor: AuthenticatedUser, filters: TresorerieFilters) {
    const params: unknown[] = [actor.tenantId, filters.exerciceId, filters.dateDebut, filters.dateFin];
    const where = [
      'ot.client_id = $1',
      'ot.exercice_id = $2',
      'ot.date_operation >= $3::date',
      'ot.date_operation <= $4::date',
      "ot.statut <> 'annulee'"
    ];

    if (filters.entite) {
      params.push(filters.entite);
      where.push(`d.projet_id = $${params.length}`);
    }

    if (filters.axeAnalytique) {
      params.push(filters.axeAnalytique);
      where.push(`lb.action_id = $${params.length}`);
    }

    const result = await this.postgresService.query<FluxRawRow>(
      `
        SELECT
          ot.id,
          ot.numero,
          ot.date_operation::text AS date_operation,
          ot.type_operation,
          ot.libelle,
          ot.reference_bancaire,
          ct.code AS compte_code,
          ct.libelle AS compte_libelle,
          ot.montant,
          ot.statut,
          ot.rapproche
        FROM public.operations_tresorerie ot
        LEFT JOIN public.comptes_tresorerie ct ON ct.id = ot.compte_id
        LEFT JOIN public.depenses d ON d.id = ot.depense_id
        LEFT JOIN public.lignes_budgetaires lb ON lb.id = d.ligne_budgetaire_id
        WHERE ${where.join('\n          AND ')}
        ORDER BY ot.date_operation DESC, ot.numero DESC
      `,
      params
    );

    return result.rows.map((row) => ({
      id: row.id,
      numero: row.numero,
      dateOperation: row.date_operation,
      typeOperation: row.type_operation,
      libelle: row.libelle,
      referenceBancaire: row.reference_bancaire,
      compte: row.compte_code && row.compte_libelle ? `${row.compte_code} - ${row.compte_libelle}` : 'Compte non renseigne',
      montant: round2(Number(row.montant ?? 0)),
      statut: row.statut,
      rapproche: row.rapproche
    }));
  }

  private async loadSituationComptes(actor: AuthenticatedUser, filters: TresorerieFilters) {
    const result = await this.postgresService.query<CompteSituationRawRow>(
      `
        SELECT
          ct.id AS compte_id,
          ct.code AS compte_code,
          ct.libelle AS compte_libelle,
          ct.solde_actuel,
          COALESCE(SUM(CASE WHEN ot.type_operation = 'encaissement' THEN ot.montant ELSE 0 END), 0) AS total_encaissements,
          COALESCE(SUM(CASE WHEN ot.type_operation = 'decaissement' THEN ot.montant ELSE 0 END), 0) AS total_decaissements,
          COALESCE(SUM(CASE WHEN ot.type_operation = 'transfert' THEN ot.montant ELSE 0 END), 0) AS total_transferts
        FROM public.comptes_tresorerie ct
        LEFT JOIN public.operations_tresorerie ot
          ON ot.compte_id = ct.id
          AND ot.client_id = ct.client_id
          AND ot.exercice_id = $2
          AND ot.date_operation >= $3::date
          AND ot.date_operation <= $4::date
          AND ot.statut <> 'annulee'
        WHERE ct.client_id = $1
          AND ct.statut = 'actif'
        GROUP BY ct.id, ct.code, ct.libelle, ct.solde_actuel
        ORDER BY ct.code ASC
      `,
      [actor.tenantId, filters.exerciceId, filters.dateDebut, filters.dateFin]
    );

    return result.rows.map((row) => ({
      compteId: row.compte_id,
      compte: `${row.compte_code} - ${row.compte_libelle}`,
      soldeActuel: round2(Number(row.solde_actuel ?? 0)),
      totalEncaissements: round2(Number(row.total_encaissements ?? 0)),
      totalDecaissements: round2(Number(row.total_decaissements ?? 0)),
      totalTransferts: round2(Number(row.total_transferts ?? 0))
    }));
  }

  private async loadPrevisions(actor: AuthenticatedUser, filters: TresorerieFilters) {
    const params: unknown[] = [actor.tenantId, filters.exerciceId, filters.dateDebut, filters.dateFin];
    const where = [
      'd.client_id = $1',
      'd.exercice_id = $2',
      'd.date_depense >= $3::date',
      'd.date_depense <= $4::date',
      "d.statut IN ('ordonnancee', 'validee', 'partiellement_payee')"
    ];

    if (filters.entite) {
      params.push(filters.entite);
      where.push(`d.projet_id = $${params.length}`);
    }

    if (filters.axeAnalytique) {
      params.push(filters.axeAnalytique);
      where.push(`lb.action_id = $${params.length}`);
    }

    const result = await this.postgresService.query<DepensePrevisionRawRow>(
      `
        SELECT d.date_depense::text AS date_depense, d.montant, d.montant_paye
        FROM public.depenses d
        LEFT JOIN public.lignes_budgetaires lb ON lb.id = d.ligne_budgetaire_id
        WHERE ${where.join('\n          AND ')}
      `,
      params
    );

    const byMonth = new Map<string, { decaissementsPrevus: number }>();

    for (const row of result.rows) {
      const month = row.date_depense.slice(0, 7);
      const reste = Math.max(Number(row.montant ?? 0) - Number(row.montant_paye ?? 0), 0);
      const current = byMonth.get(month) ?? { decaissementsPrevus: 0 };
      current.decaissementsPrevus += reste;
      byMonth.set(month, current);
    }

    let soldeProjection = 0;

    return Array.from(byMonth.entries())
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([periode, row]) => {
        soldeProjection -= row.decaissementsPrevus;

        return {
          periode,
          decaissementsPrevus: round2(row.decaissementsPrevus),
          soldeProjection: round2(soldeProjection)
        };
      });
  }

  private async loadEtatPaiements(actor: AuthenticatedUser, filters: TresorerieFilters) {
    const params: unknown[] = [actor.tenantId, filters.exerciceId, filters.dateDebut, filters.dateFin];
    const where = [
      'p.client_id = $1',
      'p.exercice_id = $2',
      'p.date_paiement >= $3::date',
      'p.date_paiement <= $4::date'
    ];

    if (filters.entite) {
      params.push(filters.entite);
      where.push(`d.projet_id = $${params.length}`);
    }

    if (filters.axeAnalytique) {
      params.push(filters.axeAnalytique);
      where.push(`lb.action_id = $${params.length}`);
    }

    const result = await this.postgresService.query<PaiementEtatRawRow>(
      `
        SELECT p.statut, COUNT(*)::bigint AS count, COALESCE(SUM(p.montant), 0) AS montant
        FROM public.paiements p
        LEFT JOIN public.depenses d ON d.id = p.depense_id
        LEFT JOIN public.lignes_budgetaires lb ON lb.id = d.ligne_budgetaire_id
        WHERE ${where.join('\n          AND ')}
        GROUP BY p.statut
        ORDER BY p.statut ASC
      `,
      params
    );

    return result.rows.map((row) => ({
      statut: row.statut,
      count: Number(row.count ?? 0),
      montant: round2(Number(row.montant ?? 0))
    }));
  }

  private async loadEtatRapprochements(actor: AuthenticatedUser, filters: TresorerieFilters) {
    const params: unknown[] = [actor.tenantId, filters.exerciceId, filters.dateDebut, filters.dateFin];
    const where = [
      'rb.client_id = $1',
      'rb.exercice_id = $2',
      'rb.date_debut >= $3::date',
      'rb.date_fin <= $4::date',
      "rb.statut <> 'annule'"
    ];

    if (filters.entite) {
      params.push(filters.entite);
      where.push(`
        EXISTS (
          SELECT 1
          FROM public.operations_tresorerie ot
          LEFT JOIN public.depenses d ON d.id = ot.depense_id
          WHERE ot.client_id = rb.client_id
            AND ot.exercice_id = rb.exercice_id
            AND ot.compte_id = rb.compte_id
            AND ot.date_operation >= rb.date_debut
            AND ot.date_operation <= rb.date_fin
            AND d.projet_id = $${params.length}
        )
      `);
    }

    if (filters.axeAnalytique) {
      params.push(filters.axeAnalytique);
      where.push(`
        EXISTS (
          SELECT 1
          FROM public.operations_tresorerie ot
          LEFT JOIN public.depenses d ON d.id = ot.depense_id
          LEFT JOIN public.lignes_budgetaires lb ON lb.id = d.ligne_budgetaire_id
          WHERE ot.client_id = rb.client_id
            AND ot.exercice_id = rb.exercice_id
            AND ot.compte_id = rb.compte_id
            AND ot.date_operation >= rb.date_debut
            AND ot.date_operation <= rb.date_fin
            AND lb.action_id = $${params.length}
        )
      `);
    }

    const result = await this.postgresService.query<RapprochementEtatRawRow>(
      `
        SELECT
          rb.statut_detaille,
          COUNT(*)::bigint AS count,
          COALESCE(SUM(rb.ecart), 0) AS ecart_total
        FROM public.rapprochements_bancaires rb
        WHERE ${where.join('\n          AND ')}
        GROUP BY rb.statut_detaille
        ORDER BY rb.statut_detaille ASC
      `,
      params
    );

    return result.rows.map((row) => ({
      statut: row.statut_detaille,
      count: Number(row.count ?? 0),
      ecartTotal: round2(Number(row.ecart_total ?? 0))
    }));
  }

  private paginateRows<T>(rows: T[], page: number, pageSize: number): T[] {
    return rows.slice((page - 1) * pageSize, page * pageSize);
  }

  private buildExportContent(
    report: Awaited<ReturnType<ReportingExecutionTresorerieService['getExecutionBudgetaire']>> | Awaited<ReturnType<ReportingExecutionTresorerieService['getTresorerie']>>,
    view: ReportingExecutionTresorerieView,
    format: ReportingExecutionTresorerieExportFormat
  ): Buffer {
    if (format === 'csv') {
      return Buffer.from(this.buildDelimitedText(report, view, ';'), 'utf-8');
    }

    if (format === 'xlsx') {
      return this.buildXlsxContent(report, view);
    }

    return this.buildPdfContent(report, view);
  }

  private buildDelimitedText(
    report: Awaited<ReturnType<ReportingExecutionTresorerieService['getExecutionBudgetaire']>> | Awaited<ReturnType<ReportingExecutionTresorerieService['getTresorerie']>>,
    view: ReportingExecutionTresorerieView,
    delimiter: ';' | '\t'
  ): string {
    const escapeDelimitedCell = (value: string | number | boolean): string => {
      const raw = `${value}`;
      const neutralized = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
      const escaped = neutralized.replace(/"/g, '""');
      if (escaped.includes(delimiter) || escaped.includes('\n') || escaped.includes('\r') || escaped.includes('"')) {
        return `"${escaped}"`;
      }
      return escaped;
    };

    const join = (values: Array<string | number | boolean>) => values.map((value) => escapeDelimitedCell(value)).join(delimiter);

    if (view === 'execution-budgetaire') {
      const executionReport = report as Awaited<ReturnType<ReportingExecutionTresorerieService['getExecutionBudgetaire']>>;
      const lines = [
        join([
          'Ligne',
          'Composante',
          'Axe',
          'Budget initial',
          'Budget modifie',
          'Engage',
          'Paye',
          'Disponible',
          'Ecart prevision/execution',
          'Alerte seuil'
        ])
      ];

      for (const row of executionReport.rows) {
        lines.push(
          join([
            row.ligneLibelle,
            row.composante,
            row.axeAnalytique,
            row.budgetInitial,
            row.budgetModifie,
            row.engage,
            row.paye,
            row.disponible,
            row.ecartPrevisionExecution,
            row.alerteSeuil
          ])
        );
      }

      return lines.join('\n');
    }

    const tresorerieReport = report as Awaited<ReturnType<ReportingExecutionTresorerieService['getTresorerie']>>;
    const lines = [join(['Type', 'Identifiant', 'Libelle', 'Valeur'])];

    for (const row of tresorerieReport.journalFlux) {
      lines.push(join(['Journal flux', row.numero, `${row.typeOperation} - ${row.libelle}`, row.montant]));
    }

    for (const row of tresorerieReport.situationComptes) {
      lines.push(join(['Situation compte', row.compteId, row.compte, row.soldeActuel]));
    }

    for (const row of tresorerieReport.previsions) {
      lines.push(join(['Prevision', row.periode, 'Decaissements prevus', row.decaissementsPrevus]));
    }

    for (const row of tresorerieReport.etatPaiements) {
      lines.push(join(['Etat paiements', row.statut, 'Montant', row.montant]));
    }

    for (const row of tresorerieReport.etatRapprochements) {
      lines.push(join(['Etat rapprochements', row.statut, 'Ecart total', row.ecartTotal]));
    }

    return lines.join('\n');
  }

  private buildPdfLikeText(
    report: Awaited<ReturnType<ReportingExecutionTresorerieService['getExecutionBudgetaire']>> | Awaited<ReturnType<ReportingExecutionTresorerieService['getTresorerie']>>,
    view: ReportingExecutionTresorerieView
  ): string {
    const title = view === 'execution-budgetaire' ? 'Execution budgetaire' : 'Tresorerie operationnelle';

    return [
      title,
      `Periode: ${report.filters.dateDebut} -> ${report.filters.dateFin}`,
      '',
      this.buildDelimitedText(report, view, ';')
    ].join('\n');
  }

  private buildXlsxContent(
    report: Awaited<ReturnType<ReportingExecutionTresorerieService['getExecutionBudgetaire']>> | Awaited<ReturnType<ReportingExecutionTresorerieService['getTresorerie']>>,
    view: ReportingExecutionTresorerieView
  ): Buffer {
    const rows = this.buildRowsForExport(report, view);
    const escapeXml = (value: string): string =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

    const sheetRows = rows
      .map((row, rowIndex) => {
        const cells = row
          .map((cell, cellIndex) => {
            const cellRef = `${this.toExcelColumn(cellIndex + 1)}${rowIndex + 1}`;
            return `<c r="${cellRef}" t="inlineStr"><is><t>${escapeXml(cell)}</t></is></c>`;
          })
          .join('');
        return `<row r="${rowIndex + 1}">${cells}</row>`;
      })
      .join('');

    const workbookXml =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheets><sheet name="Reporting" sheetId="1" r:id="rId1"/></sheets></workbook>';

    const worksheetXml =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      `<sheetData>${sheetRows}</sheetData></worksheet>`;

    const contentTypesXml =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      '</Types>';

    const relsXml =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '</Relationships>';

    const workbookRelsXml =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
      '</Relationships>';

    return this.buildZipBuffer([
      { name: '[Content_Types].xml', data: Buffer.from(contentTypesXml, 'utf-8') },
      { name: '_rels/.rels', data: Buffer.from(relsXml, 'utf-8') },
      { name: 'xl/workbook.xml', data: Buffer.from(workbookXml, 'utf-8') },
      { name: 'xl/_rels/workbook.xml.rels', data: Buffer.from(workbookRelsXml, 'utf-8') },
      { name: 'xl/worksheets/sheet1.xml', data: Buffer.from(worksheetXml, 'utf-8') }
    ]);
  }

  private buildPdfContent(
    report: Awaited<ReturnType<ReportingExecutionTresorerieService['getExecutionBudgetaire']>> | Awaited<ReturnType<ReportingExecutionTresorerieService['getTresorerie']>>,
    view: ReportingExecutionTresorerieView
  ): Buffer {
    const title = view === 'execution-budgetaire' ? 'Execution budgetaire' : 'Tresorerie operationnelle';
    const rows = this.buildRowsForExport(report, view);
    const lines = [title, `Periode: ${report.filters.dateDebut} -> ${report.filters.dateFin}`, ...rows.map((row) => row.join(' | '))];
    const contentLines = lines.slice(0, 120);
    const escapePdfText = (value: string) => value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

    const textOps = ['BT', '/F1 10 Tf', '36 806 Td', '14 TL'];
    for (const line of contentLines) {
      textOps.push(`(${escapePdfText(line)}) Tj`);
      textOps.push('T*');
    }
    textOps.push('ET');
    const streamContent = `${textOps.join('\n')}\n`;

    const objects: string[] = [
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
      '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
      '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
      `5 0 obj << /Length ${Buffer.byteLength(streamContent, 'utf-8')} >> stream\n${streamContent}endstream endobj`
    ];

    let body = '';
    const offsets: number[] = [];
    let cursor = Buffer.byteLength('%PDF-1.4\n', 'utf-8');
    for (const object of objects) {
      offsets.push(cursor);
      const serialized = `${object}\n`;
      body += serialized;
      cursor += Buffer.byteLength(serialized, 'utf-8');
    }

    const xrefStart = cursor;
    const xrefRows = ['0000000000 65535 f '];
    for (const offset of offsets) {
      xrefRows.push(`${String(offset).padStart(10, '0')} 00000 n `);
    }
    const xref = `xref\n0 ${objects.length + 1}\n${xrefRows.join('\n')}\n`;
    const trailer = `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

    return Buffer.from(`%PDF-1.4\n${body}${xref}${trailer}`, 'utf-8');
  }

  private buildRowsForExport(
    report: Awaited<ReturnType<ReportingExecutionTresorerieService['getExecutionBudgetaire']>> | Awaited<ReturnType<ReportingExecutionTresorerieService['getTresorerie']>>,
    view: ReportingExecutionTresorerieView
  ): string[][] {
    if (view === 'execution-budgetaire') {
      const executionReport = report as Awaited<ReturnType<ReportingExecutionTresorerieService['getExecutionBudgetaire']>>;
      const rows: string[][] = [
        [
          'Ligne',
          'Composante',
          'Axe',
          'Budget initial',
          'Budget modifie',
          'Engage',
          'Paye',
          'Disponible',
          'Ecart prevision/execution',
          'Alerte seuil'
        ]
      ];
      for (const row of executionReport.rows) {
        rows.push([
          row.ligneLibelle,
          row.composante,
          row.axeAnalytique,
          `${row.budgetInitial}`,
          `${row.budgetModifie}`,
          `${row.engage}`,
          `${row.paye}`,
          `${row.disponible}`,
          `${row.ecartPrevisionExecution}`,
          `${row.alerteSeuil}`
        ]);
      }
      return rows;
    }

    const tresorerieReport = report as Awaited<ReturnType<ReportingExecutionTresorerieService['getTresorerie']>>;
    const rows: string[][] = [['Type', 'Identifiant', 'Libelle', 'Valeur']];
    for (const row of tresorerieReport.journalFlux) {
      rows.push(['Journal flux', row.numero, `${row.typeOperation} - ${row.libelle}`, `${row.montant}`]);
    }
    for (const row of tresorerieReport.situationComptes) {
      rows.push(['Situation compte', row.compteId, row.compte, `${row.soldeActuel}`]);
    }
    for (const row of tresorerieReport.previsions) {
      rows.push(['Prevision', row.periode, 'Decaissements prevus', `${row.decaissementsPrevus}`]);
    }
    for (const row of tresorerieReport.etatPaiements) {
      rows.push(['Etat paiements', row.statut, 'Montant', `${row.montant}`]);
    }
    for (const row of tresorerieReport.etatRapprochements) {
      rows.push(['Etat rapprochements', row.statut, 'Ecart total', `${row.ecartTotal}`]);
    }
    return rows;
  }

  private toExcelColumn(index: number): string {
    let value = index;
    let column = '';
    while (value > 0) {
      const remainder = (value - 1) % 26;
      column = String.fromCharCode(65 + remainder) + column;
      value = Math.floor((value - 1) / 26);
    }
    return column;
  }

  private buildZipBuffer(entries: Array<{ name: string; data: Buffer }>): Buffer {
    const localChunks: Buffer[] = [];
    const centralChunks: Buffer[] = [];
    let localOffset = 0;

    for (const entry of entries) {
      const fileNameBuffer = Buffer.from(entry.name, 'utf-8');
      const compressedData = deflateRawSync(entry.data);
      const crc = this.crc32(entry.data);

      const localHeader = Buffer.alloc(30);
      localHeader.writeUInt32LE(0x04034b50, 0);
      localHeader.writeUInt16LE(20, 4);
      localHeader.writeUInt16LE(0, 6);
      localHeader.writeUInt16LE(8, 8);
      localHeader.writeUInt16LE(0, 10);
      localHeader.writeUInt16LE(0, 12);
      localHeader.writeUInt32LE(crc, 14);
      localHeader.writeUInt32LE(compressedData.length, 18);
      localHeader.writeUInt32LE(entry.data.length, 22);
      localHeader.writeUInt16LE(fileNameBuffer.length, 26);
      localHeader.writeUInt16LE(0, 28);

      localChunks.push(localHeader, fileNameBuffer, compressedData);

      const centralHeader = Buffer.alloc(46);
      centralHeader.writeUInt32LE(0x02014b50, 0);
      centralHeader.writeUInt16LE(20, 4);
      centralHeader.writeUInt16LE(20, 6);
      centralHeader.writeUInt16LE(0, 8);
      centralHeader.writeUInt16LE(8, 10);
      centralHeader.writeUInt16LE(0, 12);
      centralHeader.writeUInt16LE(0, 14);
      centralHeader.writeUInt32LE(crc, 16);
      centralHeader.writeUInt32LE(compressedData.length, 20);
      centralHeader.writeUInt32LE(entry.data.length, 24);
      centralHeader.writeUInt16LE(fileNameBuffer.length, 28);
      centralHeader.writeUInt16LE(0, 30);
      centralHeader.writeUInt16LE(0, 32);
      centralHeader.writeUInt16LE(0, 34);
      centralHeader.writeUInt16LE(0, 36);
      centralHeader.writeUInt32LE(0, 38);
      centralHeader.writeUInt32LE(localOffset, 42);

      centralChunks.push(centralHeader, fileNameBuffer);

      localOffset += localHeader.length + fileNameBuffer.length + compressedData.length;
    }

    const centralDirectory = Buffer.concat(centralChunks);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(0, 4);
    end.writeUInt16LE(0, 6);
    end.writeUInt16LE(entries.length, 8);
    end.writeUInt16LE(entries.length, 10);
    end.writeUInt32LE(centralDirectory.length, 12);
    end.writeUInt32LE(localOffset, 16);
    end.writeUInt16LE(0, 20);

    return Buffer.concat([...localChunks, centralDirectory, end]);
  }

  private crc32(input: Buffer): number {
    let crc = 0xffffffff;
    for (const byte of input) {
      crc ^= byte;
      for (let i = 0; i < 8; i += 1) {
        const mask = -(crc & 1);
        crc = (crc >>> 1) ^ (0xedb88320 & mask);
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  private buildFilename(view: ReportingExecutionTresorerieView, format: ReportingExecutionTresorerieExportFormat): string {
    const sanitizedView = view.replace(/[^a-z-]/gi, '-');
    return `${sanitizedView}-${Date.now()}.${format}`;
  }

  private resolveMimeType(format: ReportingExecutionTresorerieExportFormat): string {
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

  private cleanupExpiredExportJobs(): void {
    const now = Date.now();
    for (const [id, job] of this.exportJobs.entries()) {
      if (job.expiresAt <= now) {
        this.exportJobs.delete(id);
      }
    }
  }

  private storeExportJob(job: ExportJob): void {
    this.exportJobs.set(job.exportId, job);
    if (this.exportJobs.size <= this.maxExportJobs) {
      return;
    }

    const sorted = Array.from(this.exportJobs.values()).sort((a, b) => a.expiresAt - b.expiresAt);
    const toDelete = this.exportJobs.size - this.maxExportJobs;
    for (let index = 0; index < toDelete; index += 1) {
      const candidate = sorted[index];
      if (!candidate) {
        continue;
      }
      this.exportJobs.delete(candidate.exportId);
    }
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
}
