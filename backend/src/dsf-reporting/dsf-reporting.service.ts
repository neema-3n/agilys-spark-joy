import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'crypto';
import ExcelJS = require('exceljs');
import PDFDocument = require('pdfkit');
import { AuthorizationAuditService } from '../auth/authorization-audit.service';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PostgresService } from '../common/postgres.service';
import type {
  DsfExportFormat,
  DsfReferentielVersion,
  DsfReportingExportRequestDto,
  DsfReportingValidationRequestDto
} from './dto/dsf-reporting.dto';

interface DsfRawEntry {
  ecriture_id: string;
  date_ecriture: string;
  numero_piece: string;
  numero_ligne: number;
  libelle: string;
  montant: string | number;
  compte_debit_numero: string;
  compte_credit_numero: string;
}

interface DsfEntry {
  ecritureId: string;
  dateEcriture: string;
  numeroPiece: string;
  numeroLigne: number;
  libelle: string;
  montant: number;
  compteDebitNumero: string;
  compteCreditNumero: string;
}

interface DsfDiagnostic {
  code: string;
  severity: 'blocking' | 'warning';
  message: string;
  action: string;
}

interface DsfValidationResult {
  status: 'conforme' | 'non-conforme';
  isExportAllowed: boolean;
  referentielVersion: DsfReferentielVersion;
  diagnostics: DsfDiagnostic[];
  blockingErrors: DsfDiagnostic[];
  warnings: DsfDiagnostic[];
  checklist: Array<{
    id: string;
    label: string;
    ok: boolean;
  }>;
  summary: {
    totalEcritures: number;
    totalDebit: number;
    totalCredit: number;
    ecart: number;
  };
}

interface DsfExportPayload {
  referentielVersion: DsfReferentielVersion;
  generatedAt: string;
  filters: {
    exerciceId: string;
    entiteId?: string;
  };
  summary: DsfValidationResult['summary'];
  rows: Array<{
    dateEcriture: string;
    numeroPiece: string;
    numeroLigne: number;
    compteDebit: string;
    compteCredit: string;
    libelle: string;
    montant: number;
  }>;
}

type ExportStatus = 'completed';

interface ExportJob {
  exportId: string;
  tenantId: string;
  userId: string;
  referentielVersion: DsfReferentielVersion;
  format: DsfExportFormat;
  status: ExportStatus;
  filename: string;
  mimeType: string;
  content: Buffer;
  hash: string;
  createdAt: string;
  expiresAt: number;
  correlationId?: string;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

interface ReferentielRules {
  accountPattern: RegExp;
  accountRuleLabel: string;
}

const REFERENTIEL_RULES: Record<DsfReferentielVersion, ReferentielRules> = {
  'OHADA-SYCEBNL-2017': {
    accountPattern: /^[1-8][0-9]{3,7}$/,
    accountRuleLabel: 'Comptes OHADA 2017 (4 a 8 chiffres)'
  },
  'OHADA-SYCEBNL-2025': {
    accountPattern: /^[1-8][0-9]{5,7}$/,
    accountRuleLabel: 'Comptes OHADA 2025 (6 a 8 chiffres)'
  }
};

@Injectable()
export class DsfReportingService {
  private readonly logger = new Logger(DsfReportingService.name);
  private readonly exportJobs = new Map<string, ExportJob>();
  private readonly signingSecret = process.env.EXPORT_SIGNING_SECRET || process.env.JWT_SECRET || randomUUID();

  constructor(
    private readonly postgresService: PostgresService,
    private readonly authorizationAuditService: AuthorizationAuditService
  ) {}

  async validate(actor: AuthenticatedUser, query: DsfReportingValidationRequestDto): Promise<DsfValidationResult> {
    const normalized = this.normalizeValidationQuery(query);
    const entries = await this.loadEntries(actor, normalized);
    const validation = this.buildValidation(entries, normalized.referentielVersion, normalized.includeWarnings);

    this.authorizationAuditService.logDecision({
      userId: actor.sub,
      tenantId: actor.tenantId,
      action: 'dsf-reporting:validate',
      decision: 'allow'
    });

    this.logger.log(
      JSON.stringify({
        event: 'dsf_validation_executed',
        tenantId: actor.tenantId,
        userId: actor.sub,
        exerciceId: normalized.exerciceId,
        entiteId: normalized.entiteId ?? null,
        referentielVersion: normalized.referentielVersion,
        status: validation.status,
        blockingCount: validation.blockingErrors.length,
        warningCount: validation.warnings.length,
        correlationId: normalized.correlationId ?? null,
        timestamp: new Date().toISOString()
      })
    );

    return validation;
  }

  async startExport(
    actor: AuthenticatedUser,
    query: DsfReportingExportRequestDto
  ): Promise<{
    exportId: string;
    status: ExportStatus;
    referentielVersion: DsfReferentielVersion;
    hash: string;
    validationStatus: DsfValidationResult['status'];
    initiatedBy: string;
  }> {
    this.cleanupExpiredExportJobs();

    const normalized = this.normalizeExportQuery(query);
    const entries = await this.loadEntries(actor, normalized);
    const validation = this.buildValidation(entries, normalized.referentielVersion, true);

    if (!validation.isExportAllowed) {
      const details = validation.blockingErrors.map((item) => item.message).join(' | ');
      throw new BadRequestException(`Export DSF bloque: ${details}`);
    }

    const payload = this.buildExportPayload(entries, normalized.referentielVersion, {
      exerciceId: normalized.exerciceId,
      entiteId: normalized.entiteId
    });

    const content = await this.buildExportContent(payload, normalized.format);
    const hash = createHash('sha256').update(content).digest('hex');
    const exportId = randomUUID();

    const job: ExportJob = {
      exportId,
      tenantId: actor.tenantId,
      userId: actor.sub,
      referentielVersion: normalized.referentielVersion,
      format: normalized.format,
      status: 'completed',
      filename: this.buildFilename(normalized.referentielVersion, normalized.format),
      mimeType: this.resolveMimeType(normalized.format),
      content,
      hash,
      createdAt: new Date().toISOString(),
      expiresAt: Date.now() + 30 * 60 * 1000,
      correlationId: normalized.correlationId
    };

    this.exportJobs.set(exportId, job);

    this.authorizationAuditService.logDecision({
      userId: actor.sub,
      tenantId: actor.tenantId,
      action: 'dsf-reporting:export:start',
      decision: 'allow'
    });

    this.logger.log(
      JSON.stringify({
        event: 'dsf_export_started',
        exportId,
        tenantId: actor.tenantId,
        userId: actor.sub,
        referentielVersion: normalized.referentielVersion,
        format: normalized.format,
        hash,
        correlationId: normalized.correlationId ?? null,
        timestamp: new Date().toISOString()
      })
    );

    return {
      exportId,
      status: 'completed',
      referentielVersion: normalized.referentielVersion,
      hash,
      validationStatus: validation.status,
      initiatedBy: actor.sub
    };
  }

  getExportStatus(
    actor: AuthenticatedUser,
    exportId: string
  ): {
    exportId: string;
    status: ExportStatus;
    referentielVersion: DsfReferentielVersion;
    hash: string;
    downloadUrl: string;
    filename: string;
  } {
    this.cleanupExpiredExportJobs();
    const job = this.getExportJobForActor(actor, exportId);
    const token = this.signDownloadToken(job);

    return {
      exportId,
      status: job.status,
      referentielVersion: job.referentielVersion,
      hash: job.hash,
      downloadUrl: `/dsf-reporting/exports/${encodeURIComponent(exportId)}/download?token=${encodeURIComponent(token)}`,
      filename: job.filename
    };
  }

  downloadExport(actor: AuthenticatedUser, exportId: string, token: string): { filename: string; mimeType: string; content: Buffer } {
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
      action: 'dsf-reporting:export:download',
      decision: 'allow'
    });

    this.logger.log(
      JSON.stringify({
        event: 'dsf_export_downloaded',
        exportId,
        tenantId: actor.tenantId,
        userId: actor.sub,
        referentielVersion: job.referentielVersion,
        format: job.format,
        hash: job.hash,
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

  private normalizeValidationQuery(query: DsfReportingValidationRequestDto) {
    return {
      exerciceId: query.exerciceId,
      entiteId: query.entiteId,
      referentielVersion: query.referentielVersion,
      includeWarnings: query.includeWarnings ?? true,
      correlationId: query.correlationId
    };
  }

  private normalizeExportQuery(query: DsfReportingExportRequestDto) {
    return {
      ...this.normalizeValidationQuery(query),
      format: query.format
    };
  }

  private async loadEntries(
    actor: AuthenticatedUser,
    query: {
      exerciceId: string;
      entiteId?: string;
    }
  ): Promise<DsfEntry[]> {
    const params: unknown[] = [actor.tenantId, query.exerciceId];
    const where = ['ec.client_id = $1', 'ec.exercice_id = $2'];

    if (query.entiteId) {
      params.push(query.entiteId);
      where.push(`COALESCE(dep.projet_id, dep_from_pay.projet_id) = $${params.length}`);
    }

    const result = await this.postgresService.query<DsfRawEntry>(
      `
        SELECT
          ec.id AS ecriture_id,
          ec.date_ecriture::text AS date_ecriture,
          ec.numero_piece,
          ec.numero_ligne,
          ec.libelle,
          ec.montant,
          cd.numero AS compte_debit_numero,
          cc.numero AS compte_credit_numero
        FROM public.ecritures_comptables ec
        INNER JOIN public.comptes cd ON cd.id = ec.compte_debit_id
        INNER JOIN public.comptes cc ON cc.id = ec.compte_credit_id
        LEFT JOIN public.depenses dep ON dep.id = ec.depense_id
        LEFT JOIN public.paiements pay ON pay.id = ec.paiement_id
        LEFT JOIN public.depenses dep_from_pay ON dep_from_pay.id = pay.depense_id
        WHERE ${where.join('\n          AND ')}
        ORDER BY ec.date_ecriture ASC, ec.numero_piece ASC, ec.numero_ligne ASC, ec.id ASC
      `,
      params
    );

    return result.rows.map((row) => ({
      ecritureId: row.ecriture_id,
      dateEcriture: row.date_ecriture,
      numeroPiece: row.numero_piece,
      numeroLigne: Number(row.numero_ligne ?? 0),
      libelle: row.libelle,
      montant: round2(Number(row.montant ?? 0)),
      compteDebitNumero: row.compte_debit_numero,
      compteCreditNumero: row.compte_credit_numero
    }));
  }

  private buildValidation(entries: DsfEntry[], referentielVersion: DsfReferentielVersion, includeWarnings: boolean): DsfValidationResult {
    const diagnostics: DsfDiagnostic[] = [];

    if (entries.length === 0) {
      diagnostics.push({
        code: 'DSF-EMPTY',
        severity: 'blocking',
        message: 'Aucune ecriture comptable disponible pour l exercice selectionne.',
        action: 'Verifier les ecritures comptables et relancer la validation DSF.'
      });
    }

    const invalidAmountEntry = entries.find((entry) => !Number.isFinite(entry.montant) || entry.montant <= 0);
    if (invalidAmountEntry) {
      diagnostics.push({
        code: 'DSF-AMOUNT-INVALID',
        severity: 'blocking',
        message: `Montant invalide detecte sur la piece ${invalidAmountEntry.numeroPiece}.`,
        action: 'Corriger le montant de l ecriture puis relancer la validation.'
      });
    }

    const missingPieceEntry = entries.find((entry) => !entry.numeroPiece?.trim());
    if (missingPieceEntry) {
      diagnostics.push({
        code: 'DSF-MISSING-PIECE',
        severity: 'blocking',
        message: 'Des ecritures sans numero de piece ont ete detectees.',
        action: 'Renseigner les numeros de piece manquants avant export.'
      });
    }

    const referentielRules = REFERENTIEL_RULES[referentielVersion];
    const invalidAccountEntry = entries.find(
      (entry) =>
        !referentielRules.accountPattern.test(entry.compteDebitNumero) ||
        !referentielRules.accountPattern.test(entry.compteCreditNumero)
    );
    if (invalidAccountEntry) {
      diagnostics.push({
        code: 'DSF-OHADA-ACCOUNT-FORMAT',
        severity: 'blocking',
        message: `Comptes hors format ${referentielVersion} detectes sur la piece ${invalidAccountEntry.numeroPiece}.`,
        action: `Aligner les comptes sur la regle: ${referentielRules.accountRuleLabel}.`
      });
    }

    const missingLabelCount = entries.filter((entry) => !entry.libelle?.trim()).length;
    if (includeWarnings && missingLabelCount > 0) {
      diagnostics.push({
        code: 'DSF-MISSING-LABEL',
        severity: 'warning',
        message: `${missingLabelCount} ecriture(s) sans libelle explicite.`,
        action: 'Completer les libelles pour faciliter l audit fiscal.'
      });
    }

    const totalDebit = round2(entries.reduce((sum, entry) => sum + entry.montant, 0));
    const totalCredit = totalDebit;
    const ecart = 0;

    const blockingErrors = diagnostics.filter((item) => item.severity === 'blocking');
    const warnings = diagnostics.filter((item) => item.severity === 'warning');
    const status: DsfValidationResult['status'] = blockingErrors.length > 0 ? 'non-conforme' : 'conforme';

    return {
      status,
      isExportAllowed: status === 'conforme',
      referentielVersion,
      diagnostics,
      blockingErrors,
      warnings,
      checklist: [
        {
          id: 'presence-ecritures',
          label: 'Ecritures disponibles pour l exercice',
          ok: entries.length > 0
        },
        {
          id: 'comptes-ohada',
          label: referentielRules.accountRuleLabel,
          ok: !blockingErrors.some((item) => item.code === 'DSF-OHADA-ACCOUNT-FORMAT')
        },
        {
          id: 'lignes-validees',
          label: 'Lignes comptables valides (montant > 0)',
          ok: !blockingErrors.some((item) => item.code === 'DSF-AMOUNT-INVALID')
        },
        {
          id: 'pieces-renseignees',
          label: 'Pieces justificatives correctement renseignees',
          ok: !blockingErrors.some((item) => item.code === 'DSF-MISSING-PIECE')
        }
      ],
      summary: {
        totalEcritures: entries.length,
        totalDebit,
        totalCredit,
        ecart
      }
    };
  }

  private buildExportPayload(
    entries: DsfEntry[],
    referentielVersion: DsfReferentielVersion,
    filters: {
      exerciceId: string;
      entiteId?: string;
    }
  ): DsfExportPayload {
    const rows = [...entries]
      .sort((left, right) => {
        const dateCmp = left.dateEcriture.localeCompare(right.dateEcriture);
        if (dateCmp !== 0) {
          return dateCmp;
        }
        const pieceCmp = left.numeroPiece.localeCompare(right.numeroPiece);
        if (pieceCmp !== 0) {
          return pieceCmp;
        }
        return left.numeroLigne - right.numeroLigne;
      })
      .map((entry) => ({
        dateEcriture: entry.dateEcriture,
        numeroPiece: entry.numeroPiece,
        numeroLigne: entry.numeroLigne,
        compteDebit: entry.compteDebitNumero,
        compteCredit: entry.compteCreditNumero,
        libelle: entry.libelle,
        montant: entry.montant
      }));

    return {
      referentielVersion,
      generatedAt: new Date().toISOString(),
      filters,
      summary: {
        totalEcritures: rows.length,
        totalDebit: round2(rows.reduce((sum, row) => sum + row.montant, 0)),
        totalCredit: round2(rows.reduce((sum, row) => sum + row.montant, 0)),
        ecart: 0
      },
      rows
    };
  }

  private async buildExportContent(payload: DsfExportPayload, format: DsfExportFormat): Promise<Buffer> {
    if (format === 'csv') {
      return Buffer.from(this.buildDelimited(payload, ';'), 'utf-8');
    }

    if (format === 'xlsx') {
      return this.buildXlsxContent(payload);
    }

    return this.buildPdfContent(payload);
  }

  private buildDelimited(payload: DsfExportPayload, delimiter: ';' | '\t'): string {
    const escapeCell = (value: string | number): string => {
      const raw = `${value}`;
      const escaped = raw.replace(/"/g, '""');
      if (escaped.includes(delimiter) || escaped.includes('"') || escaped.includes('\n')) {
        return `"${escaped}"`;
      }
      return escaped;
    };

    const join = (values: Array<string | number>) => values.map((value) => escapeCell(value)).join(delimiter);

    const lines = [
      join(['Date', 'Piece', 'Ligne', 'Compte debit', 'Compte credit', 'Libelle', 'Montant']),
      ...payload.rows.map((row) =>
        join([
          row.dateEcriture,
          row.numeroPiece,
          row.numeroLigne,
          row.compteDebit,
          row.compteCredit,
          row.libelle,
          row.montant
        ])
      )
    ];

    return lines.join('\n');
  }

  private async buildXlsxContent(payload: DsfExportPayload): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('DSF');

    sheet.columns = [
      { header: 'Date', key: 'dateEcriture', width: 15 },
      { header: 'Piece', key: 'numeroPiece', width: 18 },
      { header: 'Ligne', key: 'numeroLigne', width: 10 },
      { header: 'Compte debit', key: 'compteDebit', width: 16 },
      { header: 'Compte credit', key: 'compteCredit', width: 16 },
      { header: 'Libelle', key: 'libelle', width: 42 },
      { header: 'Montant', key: 'montant', width: 16 }
    ];

    for (const row of payload.rows) {
      sheet.addRow(row);
    }

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  private buildPdfContent(payload: DsfExportPayload): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (error) => reject(error));

      doc.fontSize(14).text(`DSF ${payload.referentielVersion}`, { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Exercice: ${payload.filters.exerciceId}`);
      doc.text(`Entite: ${payload.filters.entiteId ?? 'N/A'}`);
      doc.text(`Genere le: ${payload.generatedAt}`);
      doc.text(`Total ecritures: ${payload.summary.totalEcritures}`);
      doc.moveDown(1);

      doc.font('Helvetica-Bold').text('Date | Piece | Ligne | Debit | Credit | Montant');
      doc.font('Helvetica');

      for (const row of payload.rows) {
        doc.text(
          `${row.dateEcriture} | ${row.numeroPiece} | ${row.numeroLigne} | ${row.compteDebit} | ${row.compteCredit} | ${row.montant}`
        );
      }

      doc.end();
    });
  }

  private buildFilename(referentielVersion: DsfReferentielVersion, format: DsfExportFormat): string {
    const suffix = referentielVersion.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    return `dsf-${suffix}-${Date.now()}.${format}`;
  }

  private resolveMimeType(format: DsfExportFormat): string {
    if (format === 'csv') {
      return 'text/csv; charset=utf-8';
    }

    if (format === 'xlsx') {
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    return 'application/pdf';
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

    if (Date.now() >= job.expiresAt) {
      this.exportJobs.delete(exportId);
      throw new NotFoundException('Export expire');
    }

    return job;
  }

  private signDownloadToken(job: ExportJob): string {
    const payload = JSON.stringify({
      exportId: job.exportId,
      tenantId: job.tenantId,
      userId: job.userId,
      exp: Date.now() + 10 * 60 * 1000
    });
    const encodedPayload = Buffer.from(payload, 'utf-8').toString('base64url');
    const signature = createHmac('sha256', this.signingSecret).update(encodedPayload).digest('base64url');
    return `${encodedPayload}.${signature}`;
  }

  private verifyDownloadToken(token: string): { exportId: string; tenantId: string; userId: string; exp: number } {
    const [encodedPayload, signature] = token.split('.');
    if (!encodedPayload || !signature) {
      throw new BadRequestException('Jeton de telechargement invalide');
    }

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
}
