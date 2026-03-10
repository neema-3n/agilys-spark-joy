import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PostgresService } from '../common/postgres.service';
import type {
  ReportingComptableExportFormat,
  ReportingComptableExportRequestDto,
  ReportingComptableQueryDto,
  ReportingComptableView
} from './dto/reporting-comptable.dto';

interface EcritureRow {
  ecriture_id: string;
  date_ecriture: string;
  numero_piece: string;
  numero_ligne: number;
  libelle: string;
  montant: string | number;
  compte_debit_id: string;
  compte_debit_numero: string;
  compte_debit_libelle: string;
  compte_credit_id: string;
  compte_credit_numero: string;
  compte_credit_libelle: string;
  projet_id: string | null;
  projet_code: string | null;
  projet_nom: string | null;
  action_id: string | null;
  action_code: string | null;
  programme_code: string | null;
  section_code: string | null;
}

interface BalanceRow {
  compteId: string;
  numero: string;
  libelle: string;
  debit: number;
  credit: number;
  solde: number;
}

interface GrandLivreRow {
  ecritureId: string;
  dateEcriture: string;
  numeroPiece: string;
  numeroLigne: number;
  libelle: string;
  montant: number;
  debitCompteId: string;
  debitCompteNumero: string;
  debitCompteLibelle: string;
  creditCompteId: string;
  creditCompteNumero: string;
  creditCompteLibelle: string;
  projetId?: string;
  projetLabel?: string;
  axeLabel?: string;
}

interface FicheCompteMovement {
  ecritureId: string;
  dateEcriture: string;
  numeroPiece: string;
  numeroLigne: number;
  libelle: string;
  debit: number;
  credit: number;
  soldeCumule: number;
}

interface ReportingComptableResponse {
  filters: {
    dateDebut: string;
    dateFin: string;
    compteId?: string;
    entiteId?: string;
    axeId?: string;
    page: number;
    pageSize: number;
  };
  integrity: {
    totalDebit: number;
    totalCredit: number;
    ecart: number;
    isBalanced: boolean;
  };
  balance: {
    rows: BalanceRow[];
  };
  grandLivre: {
    total: number;
    page: number;
    pageSize: number;
    rows: GrandLivreRow[];
  };
  ficheCompte: {
    compteId: string;
    compteNumero: string;
    compteLibelle: string;
    soldeOuverture: number;
    totalDebit: number;
    totalCredit: number;
    soldeCloture: number;
    mouvements: FicheCompteMovement[];
  };
}

type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface ExportJob {
  exportId: string;
  tenantId: string;
  userId: string;
  view: ReportingComptableView;
  format: ReportingComptableExportFormat;
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
export class ReportingComptableService {
  private readonly exportJobs = new Map<string, ExportJob>();
  private readonly signingSecret = process.env.EXPORT_SIGNING_SECRET || process.env.JWT_SECRET || randomUUID();

  constructor(private readonly postgresService: PostgresService) {}

  async getReport(actor: AuthenticatedUser, query: ReportingComptableQueryDto): Promise<ReportingComptableResponse> {
    const normalized = this.normalizeQuery(query);

    const entries = await this.loadEntries(actor, normalized);

    const dedupedGrandLivre = this.dedupeGrandLivre(entries);
    const balanceRows = this.buildBalance(dedupedGrandLivre);

    const totalDebit = round2(balanceRows.reduce((sum, row) => sum + row.debit, 0));
    const totalCredit = round2(balanceRows.reduce((sum, row) => sum + row.credit, 0));
    const ecart = round2(totalDebit - totalCredit);

    const paginatedRows = dedupedGrandLivre.slice(
      (normalized.page - 1) * normalized.pageSize,
      normalized.page * normalized.pageSize
    );

    const ficheCompte = await this.buildFicheCompte(actor, normalized, balanceRows, dedupedGrandLivre);

    return {
      filters: {
        dateDebut: normalized.dateDebut,
        dateFin: normalized.dateFin,
        compteId: normalized.compteId,
        entiteId: normalized.entiteId,
        axeId: normalized.axeId,
        page: normalized.page,
        pageSize: normalized.pageSize
      },
      integrity: {
        totalDebit,
        totalCredit,
        ecart,
        isBalanced: ecart === 0
      },
      balance: {
        rows: balanceRows
      },
      grandLivre: {
        total: dedupedGrandLivre.length,
        page: normalized.page,
        pageSize: normalized.pageSize,
        rows: paginatedRows
      },
      ficheCompte
    };
  }

  async startExport(actor: AuthenticatedUser, query: ReportingComptableExportRequestDto): Promise<{ exportId: string; status: ExportStatus }> {
    const report = await this.getReport(actor, query);
    const exportId = randomUUID();
    const filename = this.buildFilename(query.view, query.format);
    const mimeType = this.resolveMimeType(query.format);

    const job: ExportJob = {
      exportId,
      tenantId: actor.tenantId,
      userId: actor.sub,
      view: query.view,
      format: query.format,
      status: query.format === 'csv' ? 'completed' : 'pending',
      filename,
      mimeType,
      content: query.format === 'csv' ? this.buildExportContent(report, query.view, query.format) : null,
      createdAt: new Date().toISOString(),
      expiresAt: Date.now() + 30 * 60 * 1000
    };

    this.exportJobs.set(exportId, job);

    if (query.format !== 'csv') {
      setTimeout(() => {
        const current = this.exportJobs.get(exportId);
        if (!current) {
          return;
        }
        current.status = 'processing';
        this.exportJobs.set(exportId, current);
      }, 75);

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
      }, 250);
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
      downloadUrl: `/reporting-comptable/exports/${encodeURIComponent(exportId)}/download?token=${encodeURIComponent(token)}`,
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

    return {
      filename: job.filename,
      mimeType: job.mimeType,
      content: job.content
    };
  }

  private normalizeQuery(query: ReportingComptableQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;

    const startTs = Date.parse(query.dateDebut);
    const endTs = Date.parse(query.dateFin);

    if (Number.isNaN(startTs) || Number.isNaN(endTs)) {
      throw new BadRequestException('La periode est invalide: dates non parseables');
    }

    if (startTs > endTs) {
      throw new BadRequestException('La periode est invalide: dateDebut doit etre <= dateFin');
    }

    return {
      dateDebut: query.dateDebut,
      dateFin: query.dateFin,
      compteId: query.compteId,
      entiteId: query.entiteId,
      axeId: query.axeId,
      page,
      pageSize
    };
  }

  private async loadEntries(
    actor: AuthenticatedUser,
    query: {
      dateDebut: string;
      dateFin: string;
      compteId?: string;
      entiteId?: string;
      axeId?: string;
    }
  ): Promise<GrandLivreRow[]> {
    const params: unknown[] = [actor.tenantId, query.dateDebut, query.dateFin];
    const where = ['ec.client_id = $1', 'ec.date_ecriture >= $2::date', 'ec.date_ecriture <= $3::date'];

    if (query.compteId) {
      params.push(query.compteId);
      where.push(`(ec.compte_debit_id = $${params.length} OR ec.compte_credit_id = $${params.length})`);
    }

    if (query.entiteId) {
      params.push(query.entiteId);
      where.push(`COALESCE(eng.projet_id, rsv.projet_id, bc.projet_id, fac.projet_id, dep.projet_id, dep_from_pay.projet_id) = $${params.length}`);
    }

    if (query.axeId) {
      params.push(query.axeId);
      where.push(`lb.action_id = $${params.length}`);
    }

    const result = await this.postgresService.query<EcritureRow>(
      `
        SELECT
          ec.id AS ecriture_id,
          ec.date_ecriture::text AS date_ecriture,
          ec.numero_piece,
          ec.numero_ligne,
          ec.libelle,
          ec.montant,
          ec.compte_debit_id,
          cd.numero AS compte_debit_numero,
          cd.libelle AS compte_debit_libelle,
          ec.compte_credit_id,
          cc.numero AS compte_credit_numero,
          cc.libelle AS compte_credit_libelle,
          p.id AS projet_id,
          p.code AS projet_code,
          p.nom AS projet_nom,
          act.id AS action_id,
          act.code AS action_code,
          prg.code AS programme_code,
          sec.code AS section_code
        FROM public.ecritures_comptables ec
        INNER JOIN public.comptes cd ON cd.id = ec.compte_debit_id
        INNER JOIN public.comptes cc ON cc.id = ec.compte_credit_id
        LEFT JOIN public.engagements eng ON eng.id = ec.engagement_id
        LEFT JOIN public.reservations_credits rsv ON rsv.id = ec.reservation_id
        LEFT JOIN public.bons_commande bc ON bc.id = ec.bon_commande_id
        LEFT JOIN public.factures fac ON fac.id = ec.facture_id
        LEFT JOIN public.depenses dep ON dep.id = ec.depense_id
        LEFT JOIN public.paiements pay ON pay.id = ec.paiement_id
        LEFT JOIN public.depenses dep_from_pay ON dep_from_pay.id = pay.depense_id
        LEFT JOIN public.projets p ON p.id = COALESCE(eng.projet_id, rsv.projet_id, bc.projet_id, fac.projet_id, dep.projet_id, dep_from_pay.projet_id)
          AND p.client_id = ec.client_id
        LEFT JOIN public.lignes_budgetaires lb ON lb.id = COALESCE(
          eng.ligne_budgetaire_id,
          rsv.ligne_budgetaire_id,
          bc.ligne_budgetaire_id,
          fac.ligne_budgetaire_id,
          dep.ligne_budgetaire_id,
          dep_from_pay.ligne_budgetaire_id
        )
        LEFT JOIN public.actions act ON act.id = lb.action_id
        LEFT JOIN public.programmes prg ON prg.id = act.programme_id
        LEFT JOIN public.sections sec ON sec.id = prg.section_id
        WHERE ${where.join('\n          AND ')}
        ORDER BY ec.date_ecriture ASC, ec.numero_piece ASC, ec.numero_ligne ASC, ec.id ASC
      `,
      params
    );

    return result.rows.map((row) => {
      const montant = Number(row.montant ?? 0);
      const projetLabel = row.projet_code && row.projet_nom ? `${row.projet_code} - ${row.projet_nom}` : undefined;
      const axeLabel =
        row.section_code && row.programme_code && row.action_code
          ? `${row.section_code}/${row.programme_code}/${row.action_code}`
          : undefined;

      return {
        ecritureId: row.ecriture_id,
        dateEcriture: row.date_ecriture,
        numeroPiece: row.numero_piece,
        numeroLigne: Number(row.numero_ligne ?? 0),
        libelle: row.libelle,
        montant,
        debitCompteId: row.compte_debit_id,
        debitCompteNumero: row.compte_debit_numero,
        debitCompteLibelle: row.compte_debit_libelle,
        creditCompteId: row.compte_credit_id,
        creditCompteNumero: row.compte_credit_numero,
        creditCompteLibelle: row.compte_credit_libelle,
        projetId: row.projet_id ?? undefined,
        projetLabel,
        axeLabel
      };
    });
  }

  private buildBalance(entries: GrandLivreRow[]): BalanceRow[] {
    const byCompte = new Map<string, BalanceRow>();

    const ensureCompte = (compteId: string, numero: string, libelle: string): BalanceRow => {
      const existing = byCompte.get(compteId);
      if (existing) {
        return existing;
      }

      const created: BalanceRow = {
        compteId,
        numero,
        libelle,
        debit: 0,
        credit: 0,
        solde: 0
      };
      byCompte.set(compteId, created);
      return created;
    };

    for (const entry of entries) {
      const debitAccount = ensureCompte(entry.debitCompteId, entry.debitCompteNumero, entry.debitCompteLibelle);
      debitAccount.debit = round2(debitAccount.debit + entry.montant);

      const creditAccount = ensureCompte(entry.creditCompteId, entry.creditCompteNumero, entry.creditCompteLibelle);
      creditAccount.credit = round2(creditAccount.credit + entry.montant);
    }

    return Array.from(byCompte.values())
      .map((row) => ({
        ...row,
        solde: round2(row.debit - row.credit)
      }))
      .sort((left, right) => left.numero.localeCompare(right.numero));
  }

  private dedupeGrandLivre(entries: GrandLivreRow[]): GrandLivreRow[] {
    const seen = new Set<string>();
    const rows: GrandLivreRow[] = [];

    for (const entry of entries) {
      const key = `${entry.ecritureId}:${entry.numeroPiece}:${entry.numeroLigne}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      rows.push(entry);
    }

    return rows;
  }

  private async buildFicheCompte(
    actor: AuthenticatedUser,
    query: {
      dateDebut: string;
      dateFin: string;
      compteId?: string;
    },
    balanceRows: BalanceRow[],
    entries: GrandLivreRow[]
  ): Promise<ReportingComptableResponse['ficheCompte']> {
    const compteReference =
      balanceRows.find((row) => row.compteId === query.compteId) ?? balanceRows[0] ?? null;

    if (!compteReference) {
      return {
        compteId: query.compteId ?? 'N/A',
        compteNumero: 'N/A',
        compteLibelle: 'Aucun mouvement sur la periode',
        soldeOuverture: 0,
        totalDebit: 0,
        totalCredit: 0,
        soldeCloture: 0,
        mouvements: []
      };
    }

    const openingBalance = await this.computeOpeningBalance(actor, query.dateDebut, compteReference.compteId);

    let runningBalance = openingBalance;
    const mouvements: FicheCompteMovement[] = [];

    for (const entry of entries) {
      const debit = entry.debitCompteId === compteReference.compteId ? entry.montant : 0;
      const credit = entry.creditCompteId === compteReference.compteId ? entry.montant : 0;

      if (debit === 0 && credit === 0) {
        continue;
      }

      runningBalance = round2(runningBalance + debit - credit);

      mouvements.push({
        ecritureId: entry.ecritureId,
        dateEcriture: entry.dateEcriture,
        numeroPiece: entry.numeroPiece,
        numeroLigne: entry.numeroLigne,
        libelle: entry.libelle,
        debit,
        credit,
        soldeCumule: runningBalance
      });
    }

    const totalDebit = round2(mouvements.reduce((sum, row) => sum + row.debit, 0));
    const totalCredit = round2(mouvements.reduce((sum, row) => sum + row.credit, 0));

    return {
      compteId: compteReference.compteId,
      compteNumero: compteReference.numero,
      compteLibelle: compteReference.libelle,
      soldeOuverture: openingBalance,
      totalDebit,
      totalCredit,
      soldeCloture: round2(openingBalance + totalDebit - totalCredit),
      mouvements
    };
  }

  private async computeOpeningBalance(actor: AuthenticatedUser, dateDebut: string, compteId: string): Promise<number> {
    const result = await this.postgresService.query<{ debit: string | number; credit: string | number }>(
      `
        SELECT
          COALESCE(SUM(CASE WHEN ec.compte_debit_id = $2 THEN ec.montant ELSE 0 END), 0) AS debit,
          COALESCE(SUM(CASE WHEN ec.compte_credit_id = $2 THEN ec.montant ELSE 0 END), 0) AS credit
        FROM public.ecritures_comptables ec
        WHERE ec.client_id = $1
          AND ec.date_ecriture < $3::date
          AND (ec.compte_debit_id = $2 OR ec.compte_credit_id = $2)
      `,
      [actor.tenantId, compteId, dateDebut]
    );

    const debit = Number(result.rows[0]?.debit ?? 0);
    const credit = Number(result.rows[0]?.credit ?? 0);

    return round2(debit - credit);
  }

  private buildExportContent(
    report: ReportingComptableResponse,
    view: ReportingComptableView,
    format: ReportingComptableExportFormat
  ): Buffer {
    if (format === 'csv') {
      return this.buildCsv(report, view);
    }

    if (format === 'xlsx') {
      const content = this.buildDelimitedText(report, view, '\t');
      return Buffer.from(content, 'utf-8');
    }

    const content = this.buildPdfLikeText(report, view);
    return Buffer.from(content, 'utf-8');
  }

  private buildCsv(report: ReportingComptableResponse, view: ReportingComptableView): Buffer {
    return Buffer.from(this.buildDelimitedText(report, view, ';'), 'utf-8');
  }

  private buildDelimitedText(report: ReportingComptableResponse, view: ReportingComptableView, delimiter: ';' | '\t'): string {
    const escapeDelimitedCell = (value: string | number): string => {
      const raw = `${value}`;
      const neutralized = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
      const escaped = neutralized.replace(/"/g, '""');
      if (escaped.includes(delimiter) || escaped.includes('\n') || escaped.includes('\r') || escaped.includes('"')) {
        return `"${escaped}"`;
      }
      return escaped;
    };
    const join = (values: Array<string | number>) => values.map((item) => escapeDelimitedCell(item)).join(delimiter);

    if (view === 'balance') {
      const lines = [join(['Compte', 'Libelle', 'Debit', 'Credit', 'Solde'])];
      for (const row of report.balance.rows) {
        lines.push(join([row.numero, row.libelle, row.debit, row.credit, row.solde]));
      }
      return lines.join('\n');
    }

    if (view === 'grand-livre') {
      const lines = [join(['Date', 'Piece', 'Ligne', 'Libelle', 'Debit', 'Credit', 'Montant'])];
      for (const row of report.grandLivre.rows) {
        lines.push(
          join([
            row.dateEcriture,
            row.numeroPiece,
            row.numeroLigne,
            row.libelle,
            `${row.debitCompteNumero} ${row.debitCompteLibelle}`,
            `${row.creditCompteNumero} ${row.creditCompteLibelle}`,
            row.montant
          ])
        );
      }
      return lines.join('\n');
    }

    const fiche = report.ficheCompte;
    const lines = [
      join(['Compte', fiche.compteNumero, fiche.compteLibelle]),
      join(['Solde ouverture', fiche.soldeOuverture]),
      join(['Date', 'Piece', 'Ligne', 'Libelle', 'Debit', 'Credit', 'Solde cumule'])
    ];

    for (const row of fiche.mouvements) {
      lines.push(join([row.dateEcriture, row.numeroPiece, row.numeroLigne, row.libelle, row.debit, row.credit, row.soldeCumule]));
    }

    lines.push(join(['Total debit', fiche.totalDebit]));
    lines.push(join(['Total credit', fiche.totalCredit]));
    lines.push(join(['Solde cloture', fiche.soldeCloture]));

    return lines.join('\n');
  }

  private buildPdfLikeText(report: ReportingComptableResponse, view: ReportingComptableView): string {
    const title =
      view === 'balance' ? 'Balance comptable' : view === 'grand-livre' ? 'Grand livre' : 'Fiche compte';

    return [
      title,
      `Periode: ${report.filters.dateDebut} -> ${report.filters.dateFin}`,
      `Integrite: debit=${report.integrity.totalDebit} credit=${report.integrity.totalCredit} ecart=${report.integrity.ecart}`,
      '',
      this.buildDelimitedText(report, view, ';')
    ].join('\n');
  }

  private buildFilename(view: ReportingComptableView, format: ReportingComptableExportFormat): string {
    const sanitizedView = view.replace(/[^a-z-]/gi, '-');
    return `${sanitizedView}-${Date.now()}.${format}`;
  }

  private resolveMimeType(format: ReportingComptableExportFormat): string {
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
}
