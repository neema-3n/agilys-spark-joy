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
  AuditEntry,
  EnveloppeEntity,
  ExerciceEntity,
  ProgrammeEntity,
  ReferentielEntityType,
  SectionEntity
} from './budget-referentiels.types';
import { BudgetReferentielsStore } from './budget-referentiels.store';
import type {
  ActionCreateDto,
  ActionUpdateDto,
  EnveloppeCreateDto,
  EnveloppeUpdateDto,
  ExerciceCreateDto,
  ExerciceUpdateDto,
  ProgrammeCreateDto,
  ProgrammeUpdateDto,
  SectionCreateDto,
  SectionUpdateDto
} from './dto/referentiels.dto';

@Injectable()
export class BudgetReferentielsService {
  private readonly exercices = new Map<string, ExerciceEntity>();
  private readonly enveloppes = new Map<string, EnveloppeEntity>();
  private readonly sections = new Map<string, SectionEntity>();
  private readonly programmes = new Map<string, ProgrammeEntity>();
  private readonly actions = new Map<string, ActionEntity>();
  private readonly auditLog: AuditEntry[] = [];

  constructor(private readonly store: BudgetReferentielsStore = new BudgetReferentielsStore()) {
    const snapshot = this.store.load();
    this.exercices = new Map(snapshot.exercices.map((entry) => [entry.id, entry]));
    this.enveloppes = new Map(snapshot.enveloppes.map((entry) => [entry.id, entry]));
    this.sections = new Map(snapshot.sections.map((entry) => [entry.id, entry]));
    this.programmes = new Map(snapshot.programmes.map((entry) => [entry.id, entry]));
    this.actions = new Map(snapshot.actions.map((entry) => [entry.id, entry]));
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

  updateEnveloppe(user: AuthenticatedUser, id: string, payload: EnveloppeUpdateDto): EnveloppeEntity {
    const current = this.getByTenantOrThrow(this.enveloppes, id, user.tenantId, 'Enveloppe introuvable');

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

  archiveEnveloppe(user: AuthenticatedUser, id: string): EnveloppeEntity {
    const current = this.getByTenantOrThrow(this.enveloppes, id, user.tenantId, 'Enveloppe introuvable');
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

  updateSection(user: AuthenticatedUser, id: string, payload: SectionUpdateDto): SectionEntity {
    const current = this.getByTenantOrThrow(this.sections, id, user.tenantId, 'Section introuvable');

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

  archiveSection(user: AuthenticatedUser, id: string): SectionEntity {
    const current = this.getByTenantOrThrow(this.sections, id, user.tenantId, 'Section introuvable');

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

  updateProgramme(user: AuthenticatedUser, id: string, payload: ProgrammeUpdateDto): ProgrammeEntity {
    const current = this.getByTenantOrThrow(this.programmes, id, user.tenantId, 'Programme introuvable');

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

  archiveProgramme(user: AuthenticatedUser, id: string): ProgrammeEntity {
    const current = this.getByTenantOrThrow(this.programmes, id, user.tenantId, 'Programme introuvable');

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

  updateAction(user: AuthenticatedUser, id: string, payload: ActionUpdateDto): ActionEntity {
    const current = this.getByTenantOrThrow(this.actions, id, user.tenantId, 'Action introuvable');

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

  archiveAction(user: AuthenticatedUser, id: string): ActionEntity {
    const current = this.getByTenantOrThrow(this.actions, id, user.tenantId, 'Action introuvable');

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

  getAuditLog(user: AuthenticatedUser, entityType?: ReferentielEntityType, entityId?: string): AuditEntry[] {
    return this.auditLog
      .filter((entry) => entry.tenantId === user.tenantId)
      .filter((entry) => (entityType ? entry.entityType === entityType : true))
      .filter((entry) => (entityId ? entry.entityId === entityId : true))
      .sort((left, right) => right.timestamp.localeCompare(left.timestamp));
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

    const duplicated = entities.some((entity: any) => {
      if (entity.clientId !== tenantId || entity.archivedAt) {
        return false;
      }

      if (ignoreId && entity.id === ignoreId) {
        return false;
      }

      if (exerciceId && entity.exerciceId && entity.exerciceId !== exerciceId) {
        return false;
      }

      return String(entity.code).toLowerCase() === code;
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

  private appendAudit(
    user: AuthenticatedUser,
    entityType: ReferentielEntityType,
    entityId: string,
    action: 'create' | 'update' | 'archive',
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
      auditLog: this.auditLog
    });
  }
}
