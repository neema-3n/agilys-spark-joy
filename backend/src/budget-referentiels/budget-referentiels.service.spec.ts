import { ConflictException, ForbiddenException } from '@nestjs/common';
import { BudgetReferentielsService } from './budget-referentiels.service';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { applyTestEnv } from '../../test/test-env';

const adminUser: AuthenticatedUser = {
  sub: 'user-1',
  tenantId: 'tenant-1',
  roles: ['admin_client']
};

const otherTenantUser: AuthenticatedUser = {
  sub: 'user-2',
  tenantId: 'tenant-2',
  roles: ['admin_client']
};

describe('BudgetReferentielsService', () => {
  let service: BudgetReferentielsService;

  beforeEach(() => {
    applyTestEnv();
    service = new BudgetReferentielsService();
  });

  it('creates and updates exercice with audit trace', () => {
    const exercice = service.createExercice(adminUser, {
      libelle: 'Exercice 2026',
      code: 'EX-2026',
      dateDebut: '2026-01-01',
      dateFin: '2026-12-31',
      statut: 'ouvert'
    });

    const updated = service.updateExercice(adminUser, exercice.id, {
      libelle: 'Exercice 2026 principal'
    });

    expect(updated.libelle).toBe('Exercice 2026 principal');

    const auditEntries = service.getAuditLog(adminUser, 'exercice', exercice.id);
    expect(auditEntries).toHaveLength(2);
    const actions = new Set(auditEntries.map((entry) => entry.action));
    expect(actions.has('create')).toBeTruthy();
    expect(actions.has('update')).toBeTruthy();
  });

  it('rejects duplicated code in same tenant/exercice scope', () => {
    const exercice = service.createExercice(adminUser, {
      libelle: 'Exercice 2027',
      code: 'EX-2027',
      dateDebut: '2027-01-01',
      dateFin: '2027-12-31',
      statut: 'ouvert'
    });

    service.createSection(adminUser, {
      exerciceId: exercice.id,
      code: 'SEC-01',
      libelle: 'Section 1',
      ordre: 1,
      statut: 'actif'
    });

    expect(() =>
      service.createSection(adminUser, {
        exerciceId: exercice.id,
        code: 'SEC-01',
        libelle: 'Section en doublon',
        ordre: 2,
        statut: 'actif'
      })
    ).toThrow(ConflictException);
  });

  it('enforces parent/exercice coherence for programme and action', () => {
    const exerciceA = service.createExercice(adminUser, {
      libelle: 'Exercice A',
      code: 'EX-A',
      dateDebut: '2026-01-01',
      dateFin: '2026-12-31',
      statut: 'ouvert'
    });

    const exerciceB = service.createExercice(adminUser, {
      libelle: 'Exercice B',
      code: 'EX-B',
      dateDebut: '2027-01-01',
      dateFin: '2027-12-31',
      statut: 'ouvert'
    });

    const section = service.createSection(adminUser, {
      exerciceId: exerciceA.id,
      code: 'SEC-A',
      libelle: 'Section A',
      ordre: 1,
      statut: 'actif'
    });

    expect(() =>
      service.createProgramme(adminUser, {
        exerciceId: exerciceB.id,
        sectionId: section.id,
        code: 'PRG-1',
        libelle: 'Programme invalide',
        ordre: 1,
        statut: 'actif'
      })
    ).toThrow();
  });

  it('enforces tenant isolation on updates', () => {
    const exercice = service.createExercice(adminUser, {
      libelle: 'Exercice 2028',
      code: 'EX-2028',
      dateDebut: '2028-01-01',
      dateFin: '2028-12-31',
      statut: 'ouvert'
    });

    expect(() =>
      service.updateExercice(otherTenantUser, exercice.id, {
        libelle: 'Attempt cross-tenant'
      })
    ).toThrow(ForbiddenException);
  });

  it('archives entities non-destructively', () => {
    const exercice = service.createExercice(adminUser, {
      libelle: 'Exercice archive',
      code: 'EX-ARCH',
      dateDebut: '2029-01-01',
      dateFin: '2029-12-31',
      statut: 'ouvert'
    });

    service.archiveExercice(adminUser, exercice.id);

    const exercices = service.getExercices(adminUser);
    expect(exercices.find((entry) => entry.id === exercice.id)).toBeUndefined();

    const auditEntries = service.getAuditLog(adminUser, 'exercice', exercice.id);
    const archiveEntry = auditEntries.find((entry) => entry.action === 'archive');
    expect(archiveEntry).toBeDefined();
    expect(archiveEntry?.before).not.toBeNull();
    expect(archiveEntry?.after).not.toBeNull();
  });
});
