import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { BudgetReferentielsService } from '../budget-referentiels/budget-referentiels.service';
import type { ExerciceEntity } from '../budget-referentiels/budget-referentiels.types';
import { PostgresService } from '../common/postgres.service';
import type { ReouvrirExerciceDto } from './dto/exercice-cloture.dto';
import type {
  ExerciceCanonicalStatus,
  ExerciceChecklist,
  ExerciceChecklistItem,
  ExerciceClotureEventView,
  ExerciceCompatibleStatus
} from './exercice-cloture.types';

interface CountRow {
  total: string | number;
}

interface ExerciceRow {
  id: string;
  client_id: string;
  libelle: string;
  code: string | null;
  date_debut: string | Date;
  date_fin: string | Date;
  statut: ExerciceCompatibleStatus;
}

interface ClotureEventRow {
  id: string;
  exercice_id: string;
  client_id: string;
  event_type: 'pre_cloture' | 'cloture' | 'reouverture';
  from_status: ExerciceCanonicalStatus;
  to_status: ExerciceCanonicalStatus;
  decision: 'accepted' | 'blocked';
  checklist_payload: ExerciceChecklist;
  metadata: Record<string, unknown> | null;
  created_at: string | Date;
  created_by: string;
}

@Injectable()
export class ExerciceClotureService {
  constructor(
    private readonly budgetReferentielsService: BudgetReferentielsService,
    private readonly postgresService: PostgresService
  ) {}

  async getChecklist(actor: AuthenticatedUser, exerciceId: string): Promise<ExerciceChecklist> {
    const exercice = this.getExerciceOrThrow(actor, exerciceId);
    await this.syncExerciceToDatabase(exercice);

    return this.buildChecklist(actor, exercice);
  }

  async startReview(actor: AuthenticatedUser, exerciceId: string): Promise<ExerciceChecklist> {
    const exercice = this.getExerciceOrThrow(actor, exerciceId);
    const currentStatus = this.normalizeStatus(exercice.statut);

    if (currentStatus === 'fermee') {
      throw new BadRequestException("La pré-clôture est impossible sur un exercice déjà fermé.");
    }

    await this.syncExerciceToDatabase(exercice);
    const checklist = await this.buildChecklist(actor, exercice);
    const updated = this.updateStoreStatus(actor, exercice, 'en_revue');
    await this.syncExerciceToDatabase(updated);
    await this.recordEvent(actor, exerciceId, 'pre_cloture', currentStatus, 'en_revue', 'accepted', checklist, {});

    return {
      ...checklist,
      statutExercice: 'en_revue'
    };
  }

  async close(actor: AuthenticatedUser, exerciceId: string): Promise<{
    exercice: ExerciceEntity;
    checklist: ExerciceChecklist;
    nextExercice: ExerciceEntity;
  }> {
    const exercice = this.getExerciceOrThrow(actor, exerciceId);
    const currentStatus = this.normalizeStatus(exercice.statut);

    if (currentStatus === 'fermee') {
      throw new BadRequestException("L'exercice est déjà fermé.");
    }

    await this.syncExerciceToDatabase(exercice);
    const checklist = await this.buildChecklist(actor, exercice);

    if (!checklist.canClose) {
      await this.recordEvent(actor, exerciceId, 'cloture', currentStatus, 'en_revue', 'blocked', checklist, {
        reason: 'checklist-blocking'
      });
      throw new BadRequestException(
        'Clôture refusée: la checklist pré-clôture contient encore des anomalies bloquantes.'
      );
    }

    const reviewed = currentStatus === 'en_revue' ? exercice : this.updateStoreStatus(actor, exercice, 'en_revue');
    await this.syncExerciceToDatabase(reviewed);
    const closed = this.updateStoreStatus(actor, reviewed, 'fermee');
    await this.syncExerciceToDatabase(closed);
    const nextExercice = await this.ensureNextExercice(actor, closed);

    await this.recordEvent(actor, exerciceId, 'cloture', this.normalizeStatus(reviewed.statut), 'fermee', 'accepted', checklist, {
      nextExerciceId: nextExercice.id
    });

    return {
      exercice: closed,
      checklist: {
        ...checklist,
        statutExercice: 'fermee'
      },
      nextExercice
    };
  }

  async reopen(actor: AuthenticatedUser, exerciceId: string, payload: ReouvrirExerciceDto): Promise<ExerciceEntity> {
    const exercice = this.getExerciceOrThrow(actor, exerciceId);
    const currentStatus = this.normalizeStatus(exercice.statut);

    if (currentStatus !== 'fermee') {
      throw new BadRequestException("La réouverture gouvernée n'est autorisée que pour un exercice fermé.");
    }

    const checklist = await this.buildChecklist(actor, exercice);
    const updated = this.updateStoreStatus(actor, exercice, 'en_revue');
    await this.syncExerciceToDatabase(updated);
    await this.recordEvent(actor, exerciceId, 'reouverture', 'fermee', 'en_revue', 'accepted', checklist, {
      motif: payload.motif.trim(),
      approbateur: payload.approbateur?.trim() || null,
      impact: payload.impact?.trim() || null,
      regularisationAttendue: payload.regularisationAttendue?.trim() || null
    });

    return updated;
  }

  async assertExerciceMutable(
    actor: AuthenticatedUser,
    exerciceId: string,
    operation: string
  ): Promise<void> {
    const result = await this.postgresService.query<ExerciceRow>(
      `
        SELECT id, client_id, libelle, code, date_debut, date_fin, statut
        FROM public.exercices
        WHERE id = $1
          AND client_id = $2
        LIMIT 1
      `,
      [exerciceId, actor.tenantId]
    );

    const row = result.rows[0];
    if (!row) {
      const exercice = this.getExerciceOrThrow(actor, exerciceId);
      await this.syncExerciceToDatabase(exercice);

      const normalizedFromStore = this.normalizeStatus(exercice.statut);
      if (normalizedFromStore === 'ouverte') {
        return;
      }

      const workflowLabel =
        normalizedFromStore === 'en_revue' ? 'pré-clôture / clôture gouvernée' : 'réouverture gouvernée';

      throw new BadRequestException(
        `Mutation refusée: ${operation} impossible car l'exercice ${exercice.code ?? exercice.libelle} est ${normalizedFromStore}. Utilisez le workflow ${workflowLabel}.`
      );
    }

    const normalized = this.normalizeStatus(row.statut);
    if (normalized === 'ouverte') {
      return;
    }

    const workflowLabel =
      normalized === 'en_revue' ? 'pré-clôture / clôture gouvernée' : 'réouverture gouvernée';

    throw new BadRequestException(
      `Mutation refusée: ${operation} impossible car l'exercice ${row.code ?? row.libelle} est ${normalized}. Utilisez le workflow ${workflowLabel}.`
    );
  }

  async listEvents(actor: AuthenticatedUser, exerciceId: string): Promise<ExerciceClotureEventView[]> {
    const result = await this.postgresService.query<ClotureEventRow>(
      `
        SELECT
          id,
          exercice_id,
          client_id,
          event_type,
          from_status,
          to_status,
          decision,
          checklist_payload,
          metadata,
          created_at,
          created_by
        FROM public.exercice_cloture_events
        WHERE exercice_id = $1
          AND client_id = $2
        ORDER BY created_at DESC
      `,
      [exerciceId, actor.tenantId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      exerciceId: row.exercice_id,
      clientId: row.client_id,
      type: row.event_type,
      fromStatus: row.from_status,
      toStatus: row.to_status,
      decision: row.decision,
      checklist: row.checklist_payload,
      metadata: row.metadata ?? {},
      createdAt: this.toIsoString(row.created_at),
      createdBy: row.created_by
    }));
  }

  normalizeStatus(status: ExerciceCompatibleStatus): ExerciceCanonicalStatus {
    if (status === 'ouvert') {
      return 'ouverte';
    }

    if (status === 'cloture') {
      return 'fermee';
    }

    return status;
  }

  private async buildChecklist(actor: AuthenticatedUser, exercice: ExerciceEntity): Promise<ExerciceChecklist> {
    const [rapprochements, exceptions, ecritures, mutations] = await Promise.all([
      this.loadRapprochementsItem(actor, exercice.id),
      this.loadWorkflowExceptionsItem(actor, exercice.id),
      this.loadEcrituresItem(actor, exercice.id),
      this.loadPendingMutationsItem(actor, exercice.id)
    ]);

    const items = [rapprochements, exceptions, ecritures, mutations];

    return {
      exerciceId: exercice.id,
      statutExercice: this.normalizeStatus(exercice.statut),
      generatedAt: new Date().toISOString(),
      canClose: items.every((item) => item.status !== 'blocking'),
      items
    };
  }

  private async loadRapprochementsItem(actor: AuthenticatedUser, exerciceId: string): Promise<ExerciceChecklistItem> {
    const result = await this.postgresService.query<{
      id: string;
      numero: string;
      statut: string;
      ecart: string | number;
    }>(
      `
        SELECT id, numero, statut, ecart
        FROM public.rapprochements_bancaires
        WHERE client_id = $1
          AND exercice_id = $2
          AND statut <> 'valide'
        ORDER BY created_at DESC
        LIMIT 10
      `,
      [actor.tenantId, exerciceId]
    );

    const evidence = result.rows.map((row) => ({
      rapprochementId: row.id,
      numero: row.numero,
      statut: row.statut,
      ecart: Number(row.ecart ?? 0)
    }));

    return this.buildBlockingItem(
      'rapprochements_non_valides',
      'Rapprochements bancaires',
      evidence,
      'Des rapprochements bancaires non validés bloquent la clôture.',
      'Tous les rapprochements bancaires sont validés.'
    );
  }

  private async loadWorkflowExceptionsItem(actor: AuthenticatedUser, exerciceId: string): Promise<ExerciceChecklistItem> {
    const result = await this.postgresService.query<{
      id: string;
      status: string;
      motif: string;
      expires_at: string | Date;
    }>(
      `
        SELECT id, status, motif, expires_at
        FROM public.workflow_exceptions
        WHERE tenant_id = $1
          AND exercice_id = $2
          AND (
            status IN ('soumise', 'approuvee')
            OR (status NOT IN ('rejetee', 'consommee') AND expires_at <= now())
          )
        ORDER BY created_at DESC
        LIMIT 10
      `,
      [actor.tenantId, exerciceId]
    );

    const evidence = result.rows.map((row) => ({
      exceptionId: row.id,
      statut: row.status,
      motif: row.motif,
      expireLe: this.toIsoString(row.expires_at)
    }));

    return this.buildBlockingItem(
      'exceptions_ouvertes',
      'Exceptions de workflow',
      evidence,
      'Des exceptions de workflow restent ouvertes ou expirées sans résolution.',
      'Aucune exception de workflow bloquante n’est ouverte.'
    );
  }

  private async loadEcrituresItem(actor: AuthenticatedUser, exerciceId: string): Promise<ExerciceChecklistItem> {
    const result = await this.postgresService.query<{
      source_id: string;
      type_operation: string;
      anomalies: string | number;
    }>(
      `
        SELECT
          source_id,
          type_operation,
          COUNT(*) AS anomalies
        FROM public.ecritures_comptables
        WHERE client_id = $1
          AND exercice_id = $2
          AND (
            montant <= 0
            OR statut_ecriture IS NULL
          )
        GROUP BY source_id, type_operation
        ORDER BY anomalies DESC, source_id ASC
        LIMIT 10
      `,
      [actor.tenantId, exerciceId]
    );

    const evidence = result.rows.map((row) => ({
      sourceId: row.source_id,
      typeOperation: row.type_operation,
      anomalies: Number(row.anomalies ?? 0)
    }));

    return this.buildBlockingItem(
      'ecritures_incoherentes',
      'Écritures comptables',
      evidence,
      'Des écritures comptables incohérentes ou incomplètes subsistent.',
      'Aucune écriture comptable incohérente détectée.'
    );
  }

  private async loadPendingMutationsItem(actor: AuthenticatedUser, exerciceId: string): Promise<ExerciceChecklistItem> {
    const [depenses, factures, bonsCommande] = await Promise.all([
      this.countRows(
        `
          SELECT COUNT(*) AS total
          FROM public.depenses
          WHERE client_id = $1
            AND exercice_id = $2
            AND statut IN ('brouillon', 'validee', 'ordonnancee', 'partiellement_payee')
        `,
        [actor.tenantId, exerciceId]
      ),
      this.countRows(
        `
          SELECT COUNT(*) AS total
          FROM public.factures
          WHERE client_id = $1
            AND exercice_id = $2
            AND statut IN ('brouillon', 'validee')
        `,
        [actor.tenantId, exerciceId]
      ),
      this.countRows(
        `
          SELECT COUNT(*) AS total
          FROM public.bons_commande
          WHERE client_id = $1
            AND exercice_id = $2
            AND statut IN ('brouillon', 'valide', 'en_cours', 'receptionne')
        `,
        [actor.tenantId, exerciceId]
      )
    ]);

    const evidence = [
      { source: 'depenses', total: depenses },
      { source: 'factures', total: factures },
      { source: 'bons_commande', total: bonsCommande }
    ].filter((entry) => entry.total > 0);

    return this.buildBlockingItem(
      'mutations_critique_pendantes',
      'Mutations critiques pendantes',
      evidence,
      'Des flux budgétaires ou comptables restent en cours et doivent être régularisés avant clôture.',
      'Aucune mutation critique pendante détectée.'
    );
  }

  private buildBlockingItem(
    code: string,
    label: string,
    evidence: Array<Record<string, unknown>>,
    blockingDetail: string,
    successDetail: string
  ): ExerciceChecklistItem {
    return {
      code,
      label,
      status: evidence.length > 0 ? 'blocking' : 'ok',
      detail: evidence.length > 0 ? `${blockingDetail} (${evidence.length} preuve(s)).` : successDetail,
      evidenceCount: evidence.length,
      evidence
    };
  }

  private getExerciceOrThrow(actor: AuthenticatedUser, exerciceId: string): ExerciceEntity {
    const exercice = this.budgetReferentielsService.getExercices(actor).find((entry) => entry.id === exerciceId);

    if (!exercice) {
      throw new NotFoundException('Exercice introuvable');
    }

    return exercice;
  }

  private updateStoreStatus(
    actor: AuthenticatedUser,
    exercice: ExerciceEntity,
    statut: ExerciceCanonicalStatus
  ): ExerciceEntity {
    return this.budgetReferentielsService.setExerciceStatus(actor, exercice.id, statut);
  }

  private async ensureNextExercice(actor: AuthenticatedUser, current: ExerciceEntity): Promise<ExerciceEntity> {
    const nextStartDate = this.addDays(current.dateFin, 1);
    const nextEndDate = this.toDateOnly(new Date(`${nextStartDate}T00:00:00.000Z`), 1);
    const nextCode = this.buildNextExerciceCode(current.code, nextStartDate);
    const nextLibelle = this.buildNextExerciceLabel(current.libelle, nextStartDate);

    const existing = this.budgetReferentielsService
      .getExercices(actor)
      .find((entry) => entry.dateDebut === nextStartDate && entry.dateFin === nextEndDate);

    if (existing) {
      const normalized = this.normalizeStatus(existing.statut);
      const reopened = normalized === 'fermee' ? this.updateStoreStatus(actor, existing, 'ouverte') : existing;
      await this.syncExerciceToDatabase(reopened);
      return reopened;
    }

    const created = this.budgetReferentielsService.createExercice(actor, {
      libelle: nextLibelle,
      code: nextCode,
      dateDebut: nextStartDate,
      dateFin: nextEndDate,
      statut: 'ouverte'
    });

    await this.syncExerciceToDatabase(created);
    return created;
  }

  private buildNextExerciceCode(code: string | undefined, nextStartDate: string): string {
    const nextYear = Number(nextStartDate.slice(0, 4));
    if (!code) {
      return `EX-${nextYear}`;
    }

    if (/\d{4}/.test(code)) {
      return code.replace(/\d{4}(?!.*\d{4})/, String(nextYear));
    }

    return `${code}-N${nextYear}`;
  }

  private buildNextExerciceLabel(label: string, nextStartDate: string): string {
    const nextYear = Number(nextStartDate.slice(0, 4));
    if (/\d{4}/.test(label)) {
      return label.replace(/\d{4}(?!.*\d{4})/, String(nextYear));
    }

    return `${label} ${nextYear}`;
  }

  private async syncExerciceToDatabase(exercice: ExerciceEntity): Promise<void> {
    await this.postgresService.query(
      `
        INSERT INTO public.exercices (
          id,
          client_id,
          annee,
          libelle,
          code,
          date_debut,
          date_fin,
          statut
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8
        )
        ON CONFLICT (id)
        DO UPDATE SET
          client_id = EXCLUDED.client_id,
          annee = EXCLUDED.annee,
          libelle = EXCLUDED.libelle,
          code = EXCLUDED.code,
          date_debut = EXCLUDED.date_debut,
          date_fin = EXCLUDED.date_fin,
          statut = EXCLUDED.statut,
          updated_at = now()
      `,
      [
        exercice.id,
        exercice.clientId,
        Number(exercice.dateDebut.slice(0, 4)),
        exercice.libelle,
        exercice.code,
        exercice.dateDebut,
        exercice.dateFin,
        this.normalizeStatus(exercice.statut)
      ]
    );
  }

  private async recordEvent(
    actor: AuthenticatedUser,
    exerciceId: string,
    type: 'pre_cloture' | 'cloture' | 'reouverture',
    fromStatus: ExerciceCanonicalStatus,
    toStatus: ExerciceCanonicalStatus,
    decision: 'accepted' | 'blocked',
    checklist: ExerciceChecklist,
    metadata: Record<string, unknown>
  ): Promise<void> {
    await this.postgresService.query(
      `
        INSERT INTO public.exercice_cloture_events (
          exercice_id,
          client_id,
          event_type,
          from_status,
          to_status,
          decision,
          checklist_payload,
          metadata,
          created_by
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7::jsonb,
          $8::jsonb,
          $9
        )
      `,
      [
        exerciceId,
        actor.tenantId,
        type,
        fromStatus,
        toStatus,
        decision,
        JSON.stringify(checklist),
        JSON.stringify(metadata),
        actor.sub
      ]
    );
  }

  private async countRows(query: string, values: unknown[]): Promise<number> {
    const result = await this.postgresService.query<CountRow>(query, values);
    return Number(result.rows[0]?.total ?? 0);
  }

  private addDays(dateOnly: string, days: number): string {
    const date = new Date(`${dateOnly}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return this.toDateOnly(date);
  }

  private toDateOnly(value: Date, shiftYears = 0): string {
    const next = new Date(value.getTime());
    if (shiftYears !== 0) {
      next.setUTCFullYear(next.getUTCFullYear() + shiftYears);
      next.setUTCDate(next.getUTCDate() - 1);
    }
    return next.toISOString().slice(0, 10);
  }

  private toIsoString(value: string | Date): string {
    return value instanceof Date ? value.toISOString() : value;
  }
}
