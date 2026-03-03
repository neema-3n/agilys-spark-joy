import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import type {
  ActionEntity,
  AllocationEntity,
  AuditEntry,
  BudgetDecisionStatus,
  DecisionSnapshot,
  DecisionVersionEntity,
  EnveloppeEntity,
  ExerciceEntity,
  LigneBudgetaireEntity,
  ProgrammeEntity,
  ReferentielEntityType,
  SectionEntity
} from './budget-referentiels.types';
import { BudgetReferentielsStore } from './budget-referentiels.store';
import type {
  ActionCreateDto,
  ActionUpdateDto,
  AllocationCreateDto,
  BudgetDecisionActionDto,
  BudgetDecisionCompareQueryDto,
  EnveloppeCreateDto,
  EnveloppeUpdateDto,
  ExerciceCreateDto,
  ExerciceUpdateDto,
  ProgrammeCreateDto,
  ProgrammeUpdateDto,
  ReallocationCreateDto,
  LigneBudgetaireCreateDto,
  LigneBudgetaireUpdateDto,
  SectionCreateDto,
  SectionUpdateDto
} from './dto/referentiels.dto';

@Injectable()
export class BudgetReferentielsService {
  private static readonly MAX_AXE_BALANCE = 1_000_000_000;
  private static readonly UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  private readonly exercices = new Map<string, ExerciceEntity>();
  private readonly enveloppes = new Map<string, EnveloppeEntity>();
  private readonly sections = new Map<string, SectionEntity>();
  private readonly programmes = new Map<string, ProgrammeEntity>();
  private readonly actions = new Map<string, ActionEntity>();
  private readonly allocations = new Map<string, AllocationEntity>();
  private readonly lignesBudgetaires = new Map<string, LigneBudgetaireEntity>();
  private readonly decisionVersions = new Map<string, DecisionVersionEntity[]>();
  private readonly auditLog: AuditEntry[] = [];

  constructor(private readonly store: BudgetReferentielsStore = new BudgetReferentielsStore()) {
    const snapshot = this.store.load();
    this.exercices = new Map(snapshot.exercices.map((entry) => [entry.id, entry]));
    this.enveloppes = new Map(snapshot.enveloppes.map((entry) => [entry.id, entry]));
    this.sections = new Map(snapshot.sections.map((entry) => [entry.id, entry]));
    this.programmes = new Map(snapshot.programmes.map((entry) => [entry.id, entry]));
    this.actions = new Map(snapshot.actions.map((entry) => [entry.id, entry]));
    this.allocations = new Map((snapshot.allocations ?? []).map((entry) => [entry.id, entry]));
    this.lignesBudgetaires = new Map((snapshot.lignesBudgetaires ?? []).map((entry) => [entry.id, entry]));
    for (const version of snapshot.decisionVersions ?? []) {
      const versions = this.decisionVersions.get(version.allocationId) ?? [];
      versions.push(version);
      this.decisionVersions.set(version.allocationId, versions);
    }
    this.auditLog.push(...snapshot.auditLog);
  }

  getExercices(user: AuthenticatedUser): ExerciceEntity[] {
    return this.filterByTenant(this.exercices, user.tenantId);
  }

  createExercice(user: AuthenticatedUser, payload: ExerciceCreateDto): ExerciceEntity {
    this.assertExercicePeriod(payload.dateDebut, payload.dateFin);
    const resolvedCode = payload.code?.trim() || `EX-${new Date(payload.dateDebut).getFullYear()}`;
    this.assertUniqueCode('exercice', resolvedCode, user.tenantId);

    const exercice: ExerciceEntity = {
      id: randomUUID(),
      clientId: user.tenantId,
      libelle: payload.libelle,
      code: resolvedCode,
      dateDebut: payload.dateDebut,
      dateFin: payload.dateFin,
      statut: payload.statut,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user.sub,
      archivedAt: null
    };

    this.exercices.set(exercice.id, exercice);
    this.appendAudit(user, 'exercice', exercice.id, 'create', null, exercice);
    this.persist();

    return exercice;
  }

  updateExercice(user: AuthenticatedUser, id: string, payload: ExerciceUpdateDto): ExerciceEntity {
    const current = this.getByTenantOrThrow(this.exercices, id, user.tenantId, 'Exercice introuvable');

    if (payload.dateDebut || payload.dateFin) {
      this.assertExercicePeriod(payload.dateDebut ?? current.dateDebut, payload.dateFin ?? current.dateFin);
    }

    if (payload.code && payload.code !== current.code) {
      this.assertUniqueCode('exercice', payload.code, user.tenantId, id);
    }

    const updated: ExerciceEntity = {
      ...current,
      ...payload,
      code: payload.code?.trim() || current.code,
      updatedAt: new Date().toISOString()
    };

    this.exercices.set(id, updated);
    this.appendAudit(user, 'exercice', id, 'update', current, updated);
    this.persist();

    return updated;
  }

  archiveExercice(user: AuthenticatedUser, id: string): ExerciceEntity {
    const current = this.getByTenantOrThrow(this.exercices, id, user.tenantId, 'Exercice introuvable');
    const now = new Date().toISOString();

    const archived: ExerciceEntity = {
      ...current,
      statut: 'cloture',
      archivedAt: now,
      updatedAt: now
    };

    this.exercices.set(id, archived);
    this.appendAudit(user, 'exercice', id, 'archive', current, archived);
    this.persist();

    return archived;
  }

  getEnveloppes(user: AuthenticatedUser, exerciceId: string): EnveloppeEntity[] {
    this.ensureExerciceAccessible(user.tenantId, exerciceId);

    return this.filterByTenant(this.enveloppes, user.tenantId).filter(
      (item) => !item.archivedAt && item.exerciceId === exerciceId
    );
  }

  createEnveloppe(user: AuthenticatedUser, payload: EnveloppeCreateDto): EnveloppeEntity {
    this.ensureExerciceAccessible(user.tenantId, payload.exerciceId);
    this.assertUniqueCode('enveloppe', payload.code, user.tenantId, undefined, payload.exerciceId);

    const entity: EnveloppeEntity = {
      id: randomUUID(),
      clientId: user.tenantId,
      exerciceId: payload.exerciceId,
      code: payload.code.trim(),
      nom: payload.nom,
      sourceFinancement: payload.sourceFinancement,
      montantAlloue: payload.montantAlloue,
      montantConsomme: payload.montantConsomme,
      statut: payload.statut,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user.sub,
      archivedAt: null
    };

    this.enveloppes.set(entity.id, entity);
    this.appendAudit(user, 'enveloppe', entity.id, 'create', null, entity);
    this.persist();

    return entity;
  }

  updateEnveloppe(user: AuthenticatedUser, id: string, payload: EnveloppeUpdateDto, exerciceId: string): EnveloppeEntity {
    const current = this.getByTenantOrThrow(this.enveloppes, id, user.tenantId, 'Enveloppe introuvable');
    this.assertEntityWithinExercice(current.exerciceId, exerciceId);

    if (payload.code && payload.code !== current.code) {
      this.assertUniqueCode('enveloppe', payload.code, user.tenantId, id, current.exerciceId);
    }

    const updated: EnveloppeEntity = {
      ...current,
      ...payload,
      code: payload.code?.trim() || current.code,
      updatedAt: new Date().toISOString()
    };

    this.enveloppes.set(id, updated);
    this.appendAudit(user, 'enveloppe', id, 'update', current, updated);
    this.persist();

    return updated;
  }

  archiveEnveloppe(user: AuthenticatedUser, id: string, exerciceId: string): EnveloppeEntity {
    const current = this.getByTenantOrThrow(this.enveloppes, id, user.tenantId, 'Enveloppe introuvable');
    this.assertEntityWithinExercice(current.exerciceId, exerciceId);
    const archived = {
      ...current,
      statut: 'cloture' as const,
      archivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.enveloppes.set(id, archived);
    this.appendAudit(user, 'enveloppe', id, 'archive', current, archived);
    this.persist();

    return archived;
  }

  getSections(user: AuthenticatedUser, exerciceId: string): SectionEntity[] {
    this.ensureExerciceAccessible(user.tenantId, exerciceId);

    return this.filterByTenant(this.sections, user.tenantId)
      .filter((item) => !item.archivedAt && item.exerciceId === exerciceId)
      .sort((left, right) => left.ordre - right.ordre);
  }

  createSection(user: AuthenticatedUser, payload: SectionCreateDto): SectionEntity {
    this.ensureExerciceAccessible(user.tenantId, payload.exerciceId);
    this.assertUniqueCode('section', payload.code, user.tenantId, undefined, payload.exerciceId);

    const entity: SectionEntity = {
      id: randomUUID(),
      clientId: user.tenantId,
      exerciceId: payload.exerciceId,
      code: payload.code.trim(),
      libelle: payload.libelle,
      ordre: payload.ordre,
      statut: payload.statut,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user.sub,
      archivedAt: null
    };

    this.sections.set(entity.id, entity);
    this.appendAudit(user, 'section', entity.id, 'create', null, entity);
    this.persist();

    return entity;
  }

  updateSection(user: AuthenticatedUser, id: string, payload: SectionUpdateDto, exerciceId: string): SectionEntity {
    const current = this.getByTenantOrThrow(this.sections, id, user.tenantId, 'Section introuvable');
    this.assertEntityWithinExercice(current.exerciceId, exerciceId);

    if (payload.code && payload.code !== current.code) {
      this.assertUniqueCode('section', payload.code, user.tenantId, id, current.exerciceId);
    }

    const updated: SectionEntity = {
      ...current,
      ...payload,
      code: payload.code?.trim() || current.code,
      updatedAt: new Date().toISOString()
    };

    this.sections.set(id, updated);
    this.appendAudit(user, 'section', id, 'update', current, updated);
    this.persist();

    return updated;
  }

  archiveSection(user: AuthenticatedUser, id: string, exerciceId: string): SectionEntity {
    const current = this.getByTenantOrThrow(this.sections, id, user.tenantId, 'Section introuvable');
    this.assertEntityWithinExercice(current.exerciceId, exerciceId);

    const hasActiveProgrammes = this.filterByTenant(this.programmes, user.tenantId).some(
      (programme) => programme.sectionId === id && !programme.archivedAt
    );

    if (hasActiveProgrammes) {
      throw new BadRequestException('Archive impossible: programmes actifs rattaches a cette section');
    }

    const archived = {
      ...current,
      statut: 'archive' as const,
      archivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.sections.set(id, archived);
    this.appendAudit(user, 'section', id, 'archive', current, archived);
    this.persist();

    return archived;
  }

  getProgrammes(user: AuthenticatedUser, exerciceId: string): ProgrammeEntity[] {
    this.ensureExerciceAccessible(user.tenantId, exerciceId);

    return this.filterByTenant(this.programmes, user.tenantId)
      .filter((item) => !item.archivedAt && item.exerciceId === exerciceId)
      .sort((left, right) => left.ordre - right.ordre);
  }

  createProgramme(user: AuthenticatedUser, payload: ProgrammeCreateDto): ProgrammeEntity {
    this.ensureExerciceAccessible(user.tenantId, payload.exerciceId);
    this.ensureSectionAccessible(user.tenantId, payload.sectionId, payload.exerciceId);
    this.assertUniqueCode('programme', payload.code, user.tenantId, undefined, payload.exerciceId);

    const entity: ProgrammeEntity = {
      id: randomUUID(),
      clientId: user.tenantId,
      exerciceId: payload.exerciceId,
      sectionId: payload.sectionId,
      code: payload.code.trim(),
      libelle: payload.libelle,
      ordre: payload.ordre,
      statut: payload.statut,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user.sub,
      archivedAt: null
    };

    this.programmes.set(entity.id, entity);
    this.appendAudit(user, 'programme', entity.id, 'create', null, entity);
    this.persist();

    return entity;
  }

  updateProgramme(user: AuthenticatedUser, id: string, payload: ProgrammeUpdateDto, exerciceId: string): ProgrammeEntity {
    const current = this.getByTenantOrThrow(this.programmes, id, user.tenantId, 'Programme introuvable');
    this.assertEntityWithinExercice(current.exerciceId, exerciceId);

    if (payload.sectionId) {
      this.ensureSectionAccessible(user.tenantId, payload.sectionId, current.exerciceId);
    }

    if (payload.code && payload.code !== current.code) {
      this.assertUniqueCode('programme', payload.code, user.tenantId, id, current.exerciceId);
    }

    const updated: ProgrammeEntity = {
      ...current,
      ...payload,
      code: payload.code?.trim() || current.code,
      updatedAt: new Date().toISOString()
    };

    this.programmes.set(id, updated);
    this.appendAudit(user, 'programme', id, 'update', current, updated);
    this.persist();

    return updated;
  }

  archiveProgramme(user: AuthenticatedUser, id: string, exerciceId: string): ProgrammeEntity {
    const current = this.getByTenantOrThrow(this.programmes, id, user.tenantId, 'Programme introuvable');
    this.assertEntityWithinExercice(current.exerciceId, exerciceId);

    const hasActiveActions = this.filterByTenant(this.actions, user.tenantId).some(
      (action) => action.programmeId === id && !action.archivedAt
    );

    if (hasActiveActions) {
      throw new BadRequestException('Archive impossible: actions actives rattachees a ce programme');
    }

    const archived = {
      ...current,
      statut: 'archive' as const,
      archivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.programmes.set(id, archived);
    this.appendAudit(user, 'programme', id, 'archive', current, archived);
    this.persist();

    return archived;
  }

  getActions(user: AuthenticatedUser, exerciceId: string): ActionEntity[] {
    this.ensureExerciceAccessible(user.tenantId, exerciceId);

    return this.filterByTenant(this.actions, user.tenantId)
      .filter((item) => !item.archivedAt && item.exerciceId === exerciceId)
      .sort((left, right) => left.ordre - right.ordre);
  }

  createAction(user: AuthenticatedUser, payload: ActionCreateDto): ActionEntity {
    this.ensureExerciceAccessible(user.tenantId, payload.exerciceId);
    this.ensureProgrammeAccessible(user.tenantId, payload.programmeId, payload.exerciceId);
    this.assertUniqueCode('action', payload.code, user.tenantId, undefined, payload.exerciceId);

    const entity: ActionEntity = {
      id: randomUUID(),
      clientId: user.tenantId,
      exerciceId: payload.exerciceId,
      programmeId: payload.programmeId,
      code: payload.code.trim(),
      libelle: payload.libelle,
      ordre: payload.ordre,
      statut: payload.statut,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user.sub,
      archivedAt: null
    };

    this.actions.set(entity.id, entity);
    this.appendAudit(user, 'action', entity.id, 'create', null, entity);
    this.persist();

    return entity;
  }

  updateAction(user: AuthenticatedUser, id: string, payload: ActionUpdateDto, exerciceId: string): ActionEntity {
    const current = this.getByTenantOrThrow(this.actions, id, user.tenantId, 'Action introuvable');
    this.assertEntityWithinExercice(current.exerciceId, exerciceId);

    if (payload.programmeId) {
      this.ensureProgrammeAccessible(user.tenantId, payload.programmeId, current.exerciceId);
    }

    if (payload.code && payload.code !== current.code) {
      this.assertUniqueCode('action', payload.code, user.tenantId, id, current.exerciceId);
    }

    const updated: ActionEntity = {
      ...current,
      ...payload,
      code: payload.code?.trim() || current.code,
      updatedAt: new Date().toISOString()
    };

    this.actions.set(id, updated);
    this.appendAudit(user, 'action', id, 'update', current, updated);
    this.persist();

    return updated;
  }

  archiveAction(user: AuthenticatedUser, id: string, exerciceId: string): ActionEntity {
    const current = this.getByTenantOrThrow(this.actions, id, user.tenantId, 'Action introuvable');
    this.assertEntityWithinExercice(current.exerciceId, exerciceId);

    const archived = {
      ...current,
      statut: 'archive' as const,
      archivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.actions.set(id, archived);
    this.appendAudit(user, 'action', id, 'archive', current, archived);
    this.persist();

    return archived;
  }

  getAllocations(user: AuthenticatedUser, exerciceId: string): AllocationEntity[] {
    this.ensureExerciceAccessible(user.tenantId, exerciceId);

    return this.filterByTenant(this.allocations, user.tenantId)
      .filter((item) => item.exerciceId === exerciceId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  getLignesBudgetaires(user: AuthenticatedUser, exerciceId: string): LigneBudgetaireEntity[] {
    this.ensureExerciceAccessible(user.tenantId, exerciceId);

    return this.filterByTenant(this.lignesBudgetaires, user.tenantId)
      .filter((item) => item.exerciceId === exerciceId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  createLigneBudgetaire(user: AuthenticatedUser, payload: LigneBudgetaireCreateDto): LigneBudgetaireEntity {
    this.ensureExerciceAccessible(user.tenantId, payload.exerciceId);
    this.ensureActionAccessible(user.tenantId, payload.actionId, payload.exerciceId, 'destination');
    this.assertValidMontantOrZero(payload.montantInitial, 'montantInitial');

    const now = new Date().toISOString();
    const entity: LigneBudgetaireEntity = {
      id: randomUUID(),
      clientId: user.tenantId,
      exerciceId: payload.exerciceId,
      actionId: payload.actionId.trim(),
      compteId: payload.compteId.trim(),
      enveloppeId: payload.enveloppeId?.trim() || null,
      libelle: payload.libelle.trim(),
      montantInitial: payload.montantInitial,
      montantModifie: payload.montantInitial,
      montantEngage: 0,
      montantLiquide: 0,
      montantPaye: 0,
      disponible: payload.montantInitial,
      statut: payload.statut ?? 'actif',
      createdAt: now,
      updatedAt: now,
      createdBy: user.sub,
      archivedAt: null
    };

    this.lignesBudgetaires.set(entity.id, entity);
    this.appendAudit(user, 'ligne_budgetaire', entity.id, 'create', null, entity);
    this.persist();

    return entity;
  }

  updateLigneBudgetaire(
    user: AuthenticatedUser,
    id: string,
    payload: LigneBudgetaireUpdateDto,
    exerciceId: string
  ): LigneBudgetaireEntity {
    const current = this.getByTenantOrThrow(this.lignesBudgetaires, id, user.tenantId, 'Ligne budgétaire introuvable');
    this.assertEntityWithinExercice(current.exerciceId, exerciceId);

    if (payload.actionId) {
      this.ensureActionAccessible(user.tenantId, payload.actionId, current.exerciceId, 'destination');
    }
    if (payload.montantInitial !== undefined) {
      this.assertValidMontantOrZero(payload.montantInitial, 'montantInitial');
    }
    if (payload.montantModifie !== undefined) {
      this.assertValidMontantOrZero(payload.montantModifie, 'montantModifie');
    }
    if (payload.montantEngage !== undefined) {
      this.assertValidMontantOrZero(payload.montantEngage, 'montantEngage');
    }
    if (payload.montantLiquide !== undefined) {
      this.assertValidMontantOrZero(payload.montantLiquide, 'montantLiquide');
    }
    if (payload.montantPaye !== undefined) {
      this.assertValidMontantOrZero(payload.montantPaye, 'montantPaye');
    }
    if (payload.disponible !== undefined) {
      this.assertValidMontantOrZero(payload.disponible, 'disponible');
    }

    const updated: LigneBudgetaireEntity = {
      ...current,
      ...payload,
      actionId: payload.actionId?.trim() ?? current.actionId,
      compteId: payload.compteId?.trim() ?? current.compteId,
      enveloppeId: payload.enveloppeId !== undefined ? (payload.enveloppeId?.trim() || null) : current.enveloppeId,
      libelle: payload.libelle?.trim() ?? current.libelle,
      updatedAt: new Date().toISOString()
    };

    this.lignesBudgetaires.set(id, updated);
    this.appendAudit(user, 'ligne_budgetaire', id, 'update', current, updated);
    this.persist();

    return updated;
  }

  archiveLigneBudgetaire(user: AuthenticatedUser, id: string, exerciceId: string): LigneBudgetaireEntity {
    const current = this.getByTenantOrThrow(this.lignesBudgetaires, id, user.tenantId, 'Ligne budgétaire introuvable');
    this.assertEntityWithinExercice(current.exerciceId, exerciceId);
    const now = new Date().toISOString();

    const archived: LigneBudgetaireEntity = {
      ...current,
      statut: 'cloture',
      archivedAt: now,
      updatedAt: now
    };

    this.lignesBudgetaires.set(id, archived);
    this.appendAudit(user, 'ligne_budgetaire', id, 'archive', current, archived);
    this.persist();

    return archived;
  }

  createDecisionValidation(user: AuthenticatedUser, allocationId: string, payload: BudgetDecisionActionDto): DecisionVersionEntity {
    return this.appendDecisionVersion(user, allocationId, payload, 'validated');
  }

  createDecisionRejection(user: AuthenticatedUser, allocationId: string, payload: BudgetDecisionActionDto): DecisionVersionEntity {
    return this.appendDecisionVersion(user, allocationId, payload, 'rejected');
  }

  getDecisionHistory(user: AuthenticatedUser, allocationId: string, exerciceId: string): DecisionVersionEntity[] {
    this.ensureAllocationAccessible(user.tenantId, allocationId, exerciceId, user.sub);
    const history = [...(this.decisionVersions.get(allocationId) ?? [])]
      .filter((version) => version.clientId === user.tenantId && version.exerciceId === exerciceId)
      .sort((left, right) => left.version - right.version);

    this.appendAudit(user, 'decision_version', allocationId, 'decision_history_read', null, {
      allocationId,
      exerciceId,
      versionsRead: history.length
    });
    this.persist();

    return history;
  }

  getDecisionVersion(user: AuthenticatedUser, allocationId: string, exerciceId: string, version: number): DecisionVersionEntity {
    const history = this.getDecisionHistory(user, allocationId, exerciceId);
    const selected = history.find((entry) => entry.version === version);

    if (!selected) {
      throw new NotFoundException(`Version de decision ${version} introuvable`);
    }

    return selected;
  }

  compareDecisionVersions(
    user: AuthenticatedUser,
    allocationId: string,
    query: BudgetDecisionCompareQueryDto
  ): {
    allocationId: string;
    exerciceId: string;
    leftVersion: DecisionVersionEntity;
    rightVersion: DecisionVersionEntity;
    differences: Record<string, { from: unknown; to: unknown }>;
  } {
    this.ensureAllocationAccessible(user.tenantId, allocationId, query.exerciceId, user.sub);
    const history = this.getDecisionHistoryUnsafe(allocationId, user.tenantId, query.exerciceId);
    if (history.length < 2) {
      throw new BadRequestException('Comparaison impossible: minimum 2 versions requises');
    }

    const right =
      query.rightVersion !== undefined
        ? history.find((entry) => entry.version === query.rightVersion)
        : history[history.length - 1];
    if (!right) {
      throw new NotFoundException(`Version cible ${query.rightVersion} introuvable`);
    }

    const left =
      query.leftVersion !== undefined
        ? history.find((entry) => entry.version === query.leftVersion)
        : history.find((entry) => entry.version === right.version - 1);
    if (!left) {
      throw new NotFoundException(
        query.leftVersion !== undefined
          ? `Version source ${query.leftVersion} introuvable`
          : 'Version precedente introuvable pour la comparaison'
      );
    }

    if (left.version === right.version) {
      throw new BadRequestException('Comparaison invalide: deux versions distinctes sont requises');
    }

    const differences = this.computeDecisionDiff(left, right);
    this.appendAudit(user, 'decision_version', allocationId, 'decision_compare', null, {
      allocationId,
      exerciceId: query.exerciceId,
      leftVersion: left.version,
      rightVersion: right.version,
      differences
    });
    this.persist();

    return {
      allocationId,
      exerciceId: query.exerciceId,
      leftVersion: left,
      rightVersion: right,
      differences
    };
  }

  createAllocation(user: AuthenticatedUser, payload: AllocationCreateDto): AllocationEntity {
    this.ensureExerciceAccessible(user.tenantId, payload.exerciceId);
    this.assertValidAxeId(payload.destinationAxeId, 'destination');
    this.ensureActionAccessible(user.tenantId, payload.destinationAxeId, payload.exerciceId, 'destination');
    this.assertValidMotif(payload.motif);
    this.assertValidMontant(payload.montant);

    const currentDestinationBalance = this.getAxeBalance(user.tenantId, payload.exerciceId, payload.destinationAxeId);
    const nextDestinationBalance = currentDestinationBalance + payload.montant;

    if (nextDestinationBalance > BudgetReferentielsService.MAX_AXE_BALANCE) {
      throw new BadRequestException(
        `Plafond destination depasse: ${BudgetReferentielsService.MAX_AXE_BALANCE.toLocaleString('fr-FR')} maximum autorise`
      );
    }

    const now = new Date().toISOString();
    const entity: AllocationEntity = {
      id: randomUUID(),
      clientId: user.tenantId,
      exerciceId: payload.exerciceId,
      numero: this.nextAllocationNumber(payload.exerciceId),
      operationType: 'allocation',
      sourceAxeId: null,
      destinationAxeId: payload.destinationAxeId.trim(),
      montant: payload.montant,
      motif: payload.motif.trim(),
      effectiveAt: now,
      statut: 'validee',
      dateValidation: now,
      validePar: user.sub,
      createdAt: now,
      updatedAt: now,
      createdBy: user.sub,
      archivedAt: null
    };

    this.allocations.set(entity.id, entity);
    this.registerInitialDecisionVersion(user, entity, {
      sourceAvant: null,
      sourceApres: null,
      destinationAvant: currentDestinationBalance,
      destinationApres: nextDestinationBalance
    });
    this.appendAudit(user, 'allocation', entity.id, 'allocate', null, {
      after: entity,
      destinationBefore: currentDestinationBalance,
      destinationAfter: nextDestinationBalance
    });
    this.persist();

    return entity;
  }

  createReallocation(user: AuthenticatedUser, payload: ReallocationCreateDto): AllocationEntity {
    this.ensureExerciceAccessible(user.tenantId, payload.exerciceId);
    this.assertValidAxeId(payload.sourceAxeId, 'source');
    this.assertValidAxeId(payload.destinationAxeId, 'destination');
    this.ensureActionAccessible(user.tenantId, payload.sourceAxeId, payload.exerciceId, 'source');
    this.ensureActionAccessible(user.tenantId, payload.destinationAxeId, payload.exerciceId, 'destination');
    this.assertValidMotif(payload.motif);
    this.assertValidMontant(payload.montant);

    if (payload.sourceAxeId.trim() === payload.destinationAxeId.trim()) {
      throw new BadRequestException('Axe source et axe destination doivent etre differents');
    }

    const sourceBalance = this.getAxeBalance(user.tenantId, payload.exerciceId, payload.sourceAxeId);
    if (sourceBalance < payload.montant) {
      throw new BadRequestException(
        `Montant incoherent: disponible source insuffisant (${sourceBalance.toLocaleString('fr-FR')})`
      );
    }

    const destinationBalance = this.getAxeBalance(user.tenantId, payload.exerciceId, payload.destinationAxeId);
    const nextDestinationBalance = destinationBalance + payload.montant;
    if (nextDestinationBalance > BudgetReferentielsService.MAX_AXE_BALANCE) {
      throw new BadRequestException(
        `Plafond destination depasse: ${BudgetReferentielsService.MAX_AXE_BALANCE.toLocaleString('fr-FR')} maximum autorise`
      );
    }

    const now = new Date().toISOString();
    const entity: AllocationEntity = {
      id: randomUUID(),
      clientId: user.tenantId,
      exerciceId: payload.exerciceId,
      numero: this.nextAllocationNumber(payload.exerciceId),
      operationType: 'reallocation',
      sourceAxeId: payload.sourceAxeId.trim(),
      destinationAxeId: payload.destinationAxeId.trim(),
      montant: payload.montant,
      motif: payload.motif.trim(),
      effectiveAt: now,
      statut: 'validee',
      dateValidation: now,
      validePar: user.sub,
      createdAt: now,
      updatedAt: now,
      createdBy: user.sub,
      archivedAt: null
    };

    this.allocations.set(entity.id, entity);
    this.registerInitialDecisionVersion(user, entity, {
      sourceAvant: sourceBalance,
      sourceApres: sourceBalance - payload.montant,
      destinationAvant: destinationBalance,
      destinationApres: nextDestinationBalance
    });
    this.appendAudit(user, 'allocation', entity.id, 'reallocate', null, {
      after: entity,
      sourceBefore: sourceBalance,
      sourceAfter: sourceBalance - payload.montant,
      destinationBefore: destinationBalance,
      destinationAfter: nextDestinationBalance,
      reason: payload.motif.trim()
    });
    this.persist();

    return entity;
  }

  getAuditLog(user: AuthenticatedUser, entityType?: ReferentielEntityType, entityId?: string): AuditEntry[] {
    return this.auditLog
      .filter((entry) => entry.tenantId === user.tenantId)
      .filter((entry) => (entityType ? entry.entityType === entityType : true))
      .filter((entry) => (entityId ? entry.entityId === entityId : true))
      .sort((left, right) => right.timestamp.localeCompare(left.timestamp));
  }

  private appendDecisionVersion(
    user: AuthenticatedUser,
    allocationId: string,
    payload: BudgetDecisionActionDto,
    statutDecision: BudgetDecisionStatus
  ): DecisionVersionEntity {
    const allocation = this.ensureAllocationAccessible(user.tenantId, allocationId, payload.exerciceId, user.sub);
    const history = this.getDecisionHistoryUnsafe(allocation.id, user.tenantId, payload.exerciceId);
    const latest = history[history.length - 1];
    const now = new Date().toISOString();
    const nextVersion = history.length + 1;

    const beforeSnapshot = latest?.snapshotApres ?? this.buildDecisionSnapshot(allocation, {
      sourceAvant: null,
      sourceApres: null,
      destinationAvant: allocation.montant,
      destinationApres: allocation.montant
    }, latest?.statutDecision ?? 'validated', latest?.motif ?? allocation.motif, latest?.auteur ?? allocation.validePar, latest?.horodatage ?? now);

    const afterSnapshot = this.buildDecisionSnapshot(
      allocation,
      {
        sourceAvant: beforeSnapshot.soldes.sourceAvant,
        sourceApres: beforeSnapshot.soldes.sourceApres,
        destinationAvant: beforeSnapshot.soldes.destinationAvant,
        destinationApres: beforeSnapshot.soldes.destinationApres
      },
      statutDecision,
      payload.motif.trim(),
      user.sub,
      now
    );

    const entry: DecisionVersionEntity = {
      id: randomUUID(),
      decisionId: allocation.id,
      allocationId: allocation.id,
      clientId: allocation.clientId,
      exerciceId: allocation.exerciceId,
      version: nextVersion,
      statutDecision,
      motif: payload.motif.trim(),
      auteur: user.sub,
      horodatage: now,
      snapshotAvant: beforeSnapshot,
      snapshotApres: afterSnapshot,
      createdAt: now,
      updatedAt: now,
      createdBy: user.sub,
      archivedAt: null
    };

    history.push(entry);
    this.decisionVersions.set(allocation.id, history);
    this.appendAudit(
      user,
      'decision_version',
      allocation.id,
      statutDecision === 'validated' ? 'decision_validate' : 'decision_reject',
      beforeSnapshot,
      afterSnapshot
    );
    this.persist();

    return entry;
  }

  private registerInitialDecisionVersion(
    user: AuthenticatedUser,
    allocation: AllocationEntity,
    soldes: DecisionSnapshot['soldes']
  ): void {
    const now = new Date().toISOString();
    const snapshotBefore = this.buildDecisionSnapshot(
      allocation,
      {
        sourceAvant: soldes.sourceAvant,
        sourceApres: soldes.sourceAvant,
        destinationAvant: soldes.destinationAvant,
        destinationApres: soldes.destinationAvant
      },
      'validated',
      allocation.motif,
      user.sub,
      now
    );
    const snapshotAfter = this.buildDecisionSnapshot(allocation, soldes, 'validated', allocation.motif, user.sub, now);
    const initialVersion: DecisionVersionEntity = {
      id: randomUUID(),
      decisionId: allocation.id,
      allocationId: allocation.id,
      clientId: allocation.clientId,
      exerciceId: allocation.exerciceId,
      version: 1,
      statutDecision: 'validated',
      motif: allocation.motif,
      auteur: user.sub,
      horodatage: now,
      snapshotAvant: snapshotBefore,
      snapshotApres: snapshotAfter,
      createdAt: now,
      updatedAt: now,
      createdBy: user.sub,
      archivedAt: null
    };
    this.decisionVersions.set(allocation.id, [initialVersion]);
    this.appendAudit(user, 'decision_version', allocation.id, 'decision_validate', snapshotBefore, snapshotAfter);
  }

  private ensureAllocationAccessible(
    tenantId: string,
    allocationId: string,
    exerciceId: string,
    actorIdForAudit: string
  ): AllocationEntity {
    const allocation = this.allocations.get(allocationId);
    if (!allocation || allocation.archivedAt) {
      throw new NotFoundException('Decision budgetaire introuvable');
    }

    if (allocation.clientId !== tenantId || allocation.exerciceId !== exerciceId) {
      this.auditLog.push({
        id: randomUUID(),
        tenantId,
        entityType: 'decision_version',
        entityId: allocationId,
        action: 'decision_scope_denied',
        timestamp: new Date().toISOString(),
        authorId: actorIdForAudit,
        before: { requestedExerciceId: exerciceId, requestedTenantId: tenantId },
        after: { allocationTenantId: allocation.clientId, allocationExerciceId: allocation.exerciceId }
      });
      this.persist();
      throw new ForbiddenException('Access hors perimetre tenant/exercice refuse');
    }

    return allocation;
  }

  private getDecisionHistoryUnsafe(allocationId: string, tenantId: string, exerciceId: string): DecisionVersionEntity[] {
    return [...(this.decisionVersions.get(allocationId) ?? [])]
      .filter((version) => version.clientId === tenantId && version.exerciceId === exerciceId)
      .sort((left, right) => left.version - right.version);
  }

  private buildDecisionSnapshot(
    allocation: AllocationEntity,
    soldes: DecisionSnapshot['soldes'],
    statutDecision: BudgetDecisionStatus,
    motif: string,
    auteur: string,
    horodatage: string
  ): DecisionSnapshot {
    return {
      operationType: allocation.operationType,
      sourceAxeId: allocation.sourceAxeId,
      destinationAxeId: allocation.destinationAxeId,
      montant: allocation.montant,
      statutDecision,
      motif,
      auteur,
      horodatage,
      soldes
    };
  }

  private computeDecisionDiff(
    left: DecisionVersionEntity,
    right: DecisionVersionEntity
  ): Record<string, { from: unknown; to: unknown }> {
    const fields: ReadonlyArray<[string, unknown, unknown]> = [
      ['montant', left.snapshotApres.montant, right.snapshotApres.montant],
      ['sourceAxeId', left.snapshotApres.sourceAxeId, right.snapshotApres.sourceAxeId],
      ['destinationAxeId', left.snapshotApres.destinationAxeId, right.snapshotApres.destinationAxeId],
      ['statutDecision', left.statutDecision, right.statutDecision],
      ['motif', left.motif, right.motif],
      ['auteur', left.auteur, right.auteur],
      ['horodatage', left.horodatage, right.horodatage]
    ];
    const soldesFields: ReadonlyArray<[string, unknown, unknown]> = [
      ['soldes.sourceAvant', left.snapshotApres.soldes.sourceAvant, right.snapshotApres.soldes.sourceAvant],
      ['soldes.sourceApres', left.snapshotApres.soldes.sourceApres, right.snapshotApres.soldes.sourceApres],
      [
        'soldes.destinationAvant',
        left.snapshotApres.soldes.destinationAvant,
        right.snapshotApres.soldes.destinationAvant
      ],
      ['soldes.destinationApres', left.snapshotApres.soldes.destinationApres, right.snapshotApres.soldes.destinationApres]
    ];

    return [...fields, ...soldesFields].reduce<Record<string, { from: unknown; to: unknown }>>((acc, [key, from, to]) => {
      if (from !== to) {
        acc[key] = { from, to };
      }
      return acc;
    }, {});
  }

  private filterByTenant<T extends { clientId: string; archivedAt?: string | null }>(
    source: Map<string, T>,
    tenantId: string
  ): T[] {
    return [...source.values()].filter((item) => item.clientId === tenantId && !item.archivedAt);
  }

  private getByTenantOrThrow<T extends { clientId: string }>(
    source: Map<string, T>,
    id: string,
    tenantId: string,
    notFoundMessage: string
  ): T {
    const entity = source.get(id);
    if (!entity) {
      throw new NotFoundException(notFoundMessage);
    }

    if (entity.clientId !== tenantId) {
      throw new ForbiddenException('Access hors tenant refuse');
    }

    return entity;
  }

  private assertExercicePeriod(dateDebut: string, dateFin: string): void {
    if (new Date(dateDebut).getTime() > new Date(dateFin).getTime()) {
      throw new BadRequestException('Periode exercice invalide: dateDebut > dateFin');
    }
  }

  private assertUniqueCode(
    entityType: ReferentielEntityType,
    rawCode: string,
    tenantId: string,
    ignoreId?: string,
    exerciceId?: string
  ): void {
    const code = rawCode.trim().toLowerCase();

    const entities =
      entityType === 'exercice'
        ? [...this.exercices.values()]
        : entityType === 'enveloppe'
          ? [...this.enveloppes.values()]
          : entityType === 'section'
            ? [...this.sections.values()]
            : entityType === 'programme'
              ? [...this.programmes.values()]
              : [...this.actions.values()];

    const duplicated = entities.some((entity) => {
      const candidate = entity as {
        id: string;
        clientId: string;
        archivedAt?: string | null;
        code: string;
        exerciceId?: string;
      };
      if (candidate.clientId !== tenantId || candidate.archivedAt) {
        return false;
      }

      if (ignoreId && candidate.id === ignoreId) {
        return false;
      }

      if (exerciceId && candidate.exerciceId && candidate.exerciceId !== exerciceId) {
        return false;
      }

      return String(candidate.code).toLowerCase() === code;
    });

    if (duplicated) {
      throw new ConflictException(`Code deja utilise pour ${entityType}`);
    }
  }

  private ensureExerciceAccessible(tenantId: string, exerciceId: string): ExerciceEntity {
    const exercice = this.exercices.get(exerciceId);

    if (!exercice || exercice.archivedAt) {
      throw new NotFoundException('Exercice introuvable');
    }

    if (exercice.clientId !== tenantId) {
      throw new ForbiddenException('Access hors tenant refuse');
    }

    return exercice;
  }

  private ensureSectionAccessible(tenantId: string, sectionId: string, exerciceId: string): SectionEntity {
    const section = this.sections.get(sectionId);
    if (!section || section.archivedAt) {
      throw new NotFoundException('Section introuvable');
    }

    if (section.clientId !== tenantId) {
      throw new ForbiddenException('Access hors tenant refuse');
    }

    if (section.exerciceId !== exerciceId) {
      throw new BadRequestException('Incoherence exercice: section hors exercice cible');
    }

    return section;
  }

  private ensureProgrammeAccessible(tenantId: string, programmeId: string, exerciceId: string): ProgrammeEntity {
    const programme = this.programmes.get(programmeId);
    if (!programme || programme.archivedAt) {
      throw new NotFoundException('Programme introuvable');
    }

    if (programme.clientId !== tenantId) {
      throw new ForbiddenException('Access hors tenant refuse');
    }

    if (programme.exerciceId !== exerciceId) {
      throw new BadRequestException('Incoherence exercice: programme hors exercice cible');
    }

    return programme;
  }

  private ensureActionAccessible(
    tenantId: string,
    actionId: string,
    exerciceId: string,
    role: 'source' | 'destination'
  ): ActionEntity {
    const action = this.actions.get(actionId);
    if (!action || action.archivedAt) {
      throw new NotFoundException(`Axe ${role} introuvable`);
    }

    if (action.clientId !== tenantId) {
      throw new ForbiddenException('Access hors tenant refuse');
    }

    if (action.exerciceId !== exerciceId) {
      throw new BadRequestException(`Incoherence exercice: axe ${role} hors exercice cible`);
    }

    return action;
  }

  private assertEntityWithinExercice(entityExerciceId: string, expectedExerciceId: string): void {
    if (entityExerciceId !== expectedExerciceId) {
      throw new ForbiddenException('Access hors exercice refuse');
    }
  }

  private assertValidAxeId(axeId: string, role: 'source' | 'destination'): void {
    if (typeof axeId !== 'string' || axeId.trim().length === 0) {
      throw new BadRequestException(`Axe ${role} invalide`);
    }

    if (!BudgetReferentielsService.UUID_PATTERN.test(axeId.trim())) {
      throw new BadRequestException(`Axe ${role} invalide: identifiant axe attendu au format UUID`);
    }
  }

  private assertValidMotif(motif: string): void {
    if (typeof motif !== 'string' || motif.trim().length < 5) {
      throw new BadRequestException('Motif obligatoire (minimum 5 caracteres)');
    }
  }

  private assertValidMontant(montant: number): void {
    if (!Number.isFinite(montant) || montant <= 0) {
      throw new BadRequestException('Montant incoherent: doit etre strictement superieur a 0');
    }
  }

  private assertValidMontantOrZero(montant: number, field: string): void {
    if (!Number.isFinite(montant) || montant < 0) {
      throw new BadRequestException(`${field} incoherent: doit etre superieur ou egal a 0`);
    }
  }

  private getAxeBalance(tenantId: string, exerciceId: string, axeId: string): number {
    return [...this.allocations.values()]
      .filter((entry) => entry.clientId === tenantId && entry.exerciceId === exerciceId && !entry.archivedAt)
      .reduce((sum, entry) => {
        if (entry.operationType === 'allocation') {
          return entry.destinationAxeId === axeId ? sum + entry.montant : sum;
        }

        if (entry.sourceAxeId === axeId) {
          return sum - entry.montant;
        }

        if (entry.destinationAxeId === axeId) {
          return sum + entry.montant;
        }

        return sum;
      }, 0);
  }

  private nextAllocationNumber(exerciceId: string): string {
    const year = new Date().getUTCFullYear();
    const existingNumbers = new Set(
      [...this.allocations.values()].filter((entry) => entry.exerciceId === exerciceId).map((entry) => entry.numero)
    );
    let sequence = existingNumbers.size + 1;
    let candidate = `ALC-${year}-${String(sequence).padStart(4, '0')}`;

    while (existingNumbers.has(candidate)) {
      sequence += 1;
      candidate = `ALC-${year}-${String(sequence).padStart(4, '0')}`;
    }

    return candidate;
  }

  private appendAudit(
    user: AuthenticatedUser,
    entityType: ReferentielEntityType,
    entityId: string,
    action:
      | 'create'
      | 'update'
      | 'archive'
      | 'allocate'
      | 'reallocate'
      | 'decision_validate'
      | 'decision_reject'
      | 'decision_compare'
      | 'decision_history_read'
      | 'decision_scope_denied',
    before: unknown | null,
    after: unknown | null
  ): void {
    this.auditLog.push({
      id: randomUUID(),
      tenantId: user.tenantId,
      entityType,
      entityId,
      action,
      timestamp: new Date().toISOString(),
      authorId: user.sub,
      before,
      after
    });
  }

  private persist(): void {
    this.store.save({
      exercices: [...this.exercices.values()],
      enveloppes: [...this.enveloppes.values()],
      sections: [...this.sections.values()],
      programmes: [...this.programmes.values()],
      actions: [...this.actions.values()],
      allocations: [...this.allocations.values()],
      lignesBudgetaires: [...this.lignesBudgetaires.values()],
      decisionVersions: [...this.decisionVersions.values()].flat(),
      auditLog: this.auditLog
    });
  }
}
