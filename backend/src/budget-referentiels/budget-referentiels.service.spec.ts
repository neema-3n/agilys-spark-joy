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

const createActionAxe = (service: BudgetReferentielsService, user: AuthenticatedUser, exerciceId: string, suffix: string) => {
  const section = service.createSection(user, {
    exerciceId,
    code: `SEC-${suffix}`,
    libelle: `Section ${suffix}`,
    ordre: 1,
    statut: 'actif'
  });
  const programme = service.createProgramme(user, {
    exerciceId,
    sectionId: section.id,
    code: `PRG-${suffix}`,
    libelle: `Programme ${suffix}`,
    ordre: 1,
    statut: 'actif'
  });

  return service.createAction(user, {
    exerciceId,
    programmeId: programme.id,
    code: `ACT-${suffix}`,
    libelle: `Action ${suffix}`,
    ordre: 1,
    statut: 'actif'
  });
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

  it('creates allocation and reallocation with audit trace and non-destructive history', () => {
    const exercice = service.createExercice(adminUser, {
      libelle: 'Exercice allocations',
      code: 'EX-ALLOC',
      dateDebut: '2030-01-01',
      dateFin: '2030-12-31',
      statut: 'ouvert'
    });
    const axeA = createActionAxe(service, adminUser, exercice.id, 'A');
    const axeB = createActionAxe(service, adminUser, exercice.id, 'B');

    const allocation = service.createAllocation(adminUser, {
      exerciceId: exercice.id,
      destinationAxeId: axeA.id,
      montant: 1000,
      motif: 'Dotation initiale axe A'
    });

    const reallocation = service.createReallocation(adminUser, {
      exerciceId: exercice.id,
      sourceAxeId: axeA.id,
      destinationAxeId: axeB.id,
      montant: 400,
      motif: 'Arbitrage vers axe B'
    });

    expect(allocation.operationType).toBe('allocation');
    expect(reallocation.operationType).toBe('reallocation');

    const list = service.getAllocations(adminUser, exercice.id);
    expect(list).toHaveLength(2);
    expect(list.some((entry) => entry.id === allocation.id)).toBeTruthy();
    expect(list.some((entry) => entry.id === reallocation.id)).toBeTruthy();

    const auditEntries = service.getAuditLog(adminUser, 'allocation');
    const actions = new Set(auditEntries.map((entry) => entry.action));
    expect(actions.has('allocate')).toBeTruthy();
    expect(actions.has('reallocate')).toBeTruthy();
  });

  it('rejects reallocation when source balance is insufficient', () => {
    const exercice = service.createExercice(adminUser, {
      libelle: 'Exercice insuffisant',
      code: 'EX-INS',
      dateDebut: '2031-01-01',
      dateFin: '2031-12-31',
      statut: 'ouvert'
    });
    const axeA = createActionAxe(service, adminUser, exercice.id, 'INS-A');
    const axeB = createActionAxe(service, adminUser, exercice.id, 'INS-B');

    service.createAllocation(adminUser, {
      exerciceId: exercice.id,
      destinationAxeId: axeA.id,
      montant: 200,
      motif: 'Base axe A'
    });

    expect(() =>
      service.createReallocation(adminUser, {
        exerciceId: exercice.id,
        sourceAxeId: axeA.id,
        destinationAxeId: axeB.id,
        montant: 500,
        motif: 'Tentative depassement'
      })
    ).toThrow('Montant incoherent');
  });

  it('enforces tenant isolation on allocations', () => {
    const exercice = service.createExercice(adminUser, {
      libelle: 'Exercice tenant allocation',
      code: 'EX-TEN-ALLOC',
      dateDebut: '2032-01-01',
      dateFin: '2032-12-31',
      statut: 'ouvert'
    });
    const axe = createActionAxe(service, adminUser, exercice.id, 'TENANT');

    expect(() =>
      service.createAllocation(otherTenantUser, {
        exerciceId: exercice.id,
        destinationAxeId: axe.id,
        montant: 300,
        motif: 'Cross tenant interdit'
      })
    ).toThrow(ForbiddenException);
  });

  it('creates decision versions append-only and compares consecutive versions', () => {
    const exercice = service.createExercice(adminUser, {
      libelle: 'Exercice versions',
      code: 'EX-VERS',
      dateDebut: '2035-01-01',
      dateFin: '2035-12-31',
      statut: 'ouvert'
    });
    const axe = createActionAxe(service, adminUser, exercice.id, 'VERS');
    const allocation = service.createAllocation(adminUser, {
      exerciceId: exercice.id,
      destinationAxeId: axe.id,
      montant: 1000,
      motif: 'Dotation initiale'
    });

    const rejectedVersion = service.createDecisionRejection(adminUser, allocation.id, {
      exerciceId: exercice.id,
      motif: 'Pieces justificatives insuffisantes'
    });

    const validatedVersion = service.createDecisionValidation(adminUser, allocation.id, {
      exerciceId: exercice.id,
      motif: 'Validation finale apres correction'
    });

    expect(rejectedVersion.version).toBe(2);
    expect(validatedVersion.version).toBe(3);

    const history = service.getDecisionHistory(adminUser, allocation.id, exercice.id);
    expect(history).toHaveLength(3);
    expect(history[0]?.version).toBe(1);
    expect(history[2]?.statutDecision).toBe('validated');

    const comparison = service.compareDecisionVersions(adminUser, allocation.id, {
      exerciceId: exercice.id,
      leftVersion: 2,
      rightVersion: 3
    });
    expect(comparison.leftVersion.version).toBe(2);
    expect(comparison.rightVersion.version).toBe(3);
    expect(comparison.differences.statutDecision).toBeDefined();
    expect(comparison.differences.motif).toBeDefined();
  });

  it('rejects decision history access outside tenant or exercice scope', () => {
    const exercice = service.createExercice(adminUser, {
      libelle: 'Exercice scope',
      code: 'EX-SCOPE',
      dateDebut: '2036-01-01',
      dateFin: '2036-12-31',
      statut: 'ouvert'
    });
    const axe = createActionAxe(service, adminUser, exercice.id, 'SCOPE');
    const allocation = service.createAllocation(adminUser, {
      exerciceId: exercice.id,
      destinationAxeId: axe.id,
      montant: 500,
      motif: 'Dotation scope'
    });

    expect(() => service.getDecisionHistory(otherTenantUser, allocation.id, exercice.id)).toThrow(ForbiddenException);
  });

  it('rejects allocation when axe does not exist in exercice scope', () => {
    const exercice = service.createExercice(adminUser, {
      libelle: 'Exercice missing axe',
      code: 'EX-MISSING-AXE',
      dateDebut: '2034-01-01',
      dateFin: '2034-12-31',
      statut: 'ouvert'
    });

    expect(() =>
      service.createAllocation(adminUser, {
        exerciceId: exercice.id,
        destinationAxeId: '11111111-1111-4111-8111-111111111111',
        montant: 100,
        motif: 'Axe inconnu'
      })
    ).toThrow('Axe destination introuvable');
  });

  it('rejects invalid axe identifier format', () => {
    const exercice = service.createExercice(adminUser, {
      libelle: 'Exercice invalid axe',
      code: 'EX-INV-AXE',
      dateDebut: '2033-01-01',
      dateFin: '2033-12-31',
      statut: 'ouvert'
    });

    expect(() =>
      service.createAllocation(adminUser, {
        exerciceId: exercice.id,
        destinationAxeId: 'AXE-A',
        montant: 100,
        motif: 'Axe invalide'
      })
    ).toThrow('identifiant axe attendu au format UUID');
  });
});
