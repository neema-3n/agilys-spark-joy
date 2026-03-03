import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { AuthorizationAuditService } from '../src/auth/authorization-audit.service';
import { applyTestEnv } from './test-env';

describe('BudgetReferentielsController (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let readOnlyToken: string;
  let otherTenantToken: string;
  let incompatibleDutiesToken: string;
  let authorizationAuditService: AuthorizationAuditService;
  let logDecisionSpy: jest.SpyInstance;

  beforeAll(async () => {
    applyTestEnv();

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true
      })
    );
    await app.init();
    authorizationAuditService = moduleFixture.get(AuthorizationAuditService);
    logDecisionSpy = jest.spyOn(authorizationAuditService, 'logDecision');

    const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'user@agilys.local',
      password: 'ChangeMe123!'
    });

    accessToken = loginResponse.body.accessToken;

    const jwtService = moduleFixture.get(JwtService);
    readOnlyToken = await jwtService.signAsync(
      {
        sub: 'user-ops',
        tenantId: 'tenant-1',
        roles: ['operateur_saisie']
      },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: 600
      }
    );

    otherTenantToken = await jwtService.signAsync(
      {
        sub: 'user-other-tenant',
        tenantId: 'tenant-2',
        roles: ['admin_client']
      },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: 600
      }
    );

    incompatibleDutiesToken = await jwtService.signAsync(
      {
        sub: 'user-sod',
        tenantId: 'tenant-1',
        roles: ['ordonnateur', 'comptable']
      },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: 600
      }
    );
  });

  afterAll(async () => {
    logDecisionSpy.mockRestore();
    await app.close();
  });

  it('supports tenant-scoped CRUD with non-destructive archive', async () => {
    const createExerciceResponse = await request(app.getHttpServer())
      .post('/budget-referentiels/exercices')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        libelle: 'Exercice e2e',
        code: 'E2E-2026',
        dateDebut: '2026-01-01',
        dateFin: '2026-12-31',
        statut: 'ouvert'
      });

    expect(createExerciceResponse.status).toBe(201);

    const exerciceId = createExerciceResponse.body.id as string;

    const createSectionResponse = await request(app.getHttpServer())
      .post('/budget-referentiels/sections')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        exerciceId,
        code: 'SEC-E2E',
        libelle: 'Section e2e',
        ordre: 1,
        statut: 'actif'
      });

    expect(createSectionResponse.status).toBe(201);

    const createProgrammeResponse = await request(app.getHttpServer())
      .post('/budget-referentiels/programmes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        exerciceId,
        sectionId: createSectionResponse.body.id,
        code: 'PRG-E2E',
        libelle: 'Programme e2e',
        ordre: 1,
        statut: 'actif'
      });

    expect(createProgrammeResponse.status).toBe(201);

    const createActionResponse = await request(app.getHttpServer())
      .post('/budget-referentiels/actions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        exerciceId,
        programmeId: createProgrammeResponse.body.id,
        code: 'ACT-E2E',
        libelle: 'Action e2e',
        ordre: 1,
        statut: 'actif'
      });

    expect(createActionResponse.status).toBe(201);

    const archiveActionResponse = await request(app.getHttpServer())
      .delete(`/budget-referentiels/actions/${createActionResponse.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ exerciceId });

    expect(archiveActionResponse.status).toBe(200);

    const actionsResponse = await request(app.getHttpServer())
      .get('/budget-referentiels/actions')
      .query({ exerciceId })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(actionsResponse.status).toBe(200);
    expect(actionsResponse.body).toHaveLength(0);

    const auditResponse = await request(app.getHttpServer())
      .get('/budget-referentiels/audit-log')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ entityType: 'action', entityId: createActionResponse.body.id });

    expect(auditResponse.status).toBe(200);
    expect(auditResponse.body[0].action).toBe('archive');
    expect(auditResponse.body[0].before).toBeTruthy();
    expect(auditResponse.body[0].after).toBeTruthy();
  });

  it('creates allocation and reallocation with audit and scope enforcement', async () => {
    const createExerciceResponse = await request(app.getHttpServer())
      .post('/budget-referentiels/exercices')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        libelle: 'Exercice alloc e2e',
        code: 'E2E-ALLOC',
        dateDebut: '2040-01-01',
        dateFin: '2040-12-31',
        statut: 'ouvert'
      });

    expect(createExerciceResponse.status).toBe(201);
    const exerciceId = createExerciceResponse.body.id as string;
    const sectionResponse = await request(app.getHttpServer())
      .post('/budget-referentiels/sections')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        exerciceId,
        code: 'SEC-ALLOC-E2E',
        libelle: 'Section alloc e2e',
        ordre: 1,
        statut: 'actif'
      });
    expect(sectionResponse.status).toBe(201);
    const programmeResponse = await request(app.getHttpServer())
      .post('/budget-referentiels/programmes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        exerciceId,
        sectionId: sectionResponse.body.id,
        code: 'PRG-ALLOC-E2E',
        libelle: 'Programme alloc e2e',
        ordre: 1,
        statut: 'actif'
      });
    expect(programmeResponse.status).toBe(201);
    const actionAResponse = await request(app.getHttpServer())
      .post('/budget-referentiels/actions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        exerciceId,
        programmeId: programmeResponse.body.id,
        code: 'ACT-ALLOC-A',
        libelle: 'Action alloc A',
        ordre: 1,
        statut: 'actif'
      });
    expect(actionAResponse.status).toBe(201);
    const actionBResponse = await request(app.getHttpServer())
      .post('/budget-referentiels/actions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        exerciceId,
        programmeId: programmeResponse.body.id,
        code: 'ACT-ALLOC-B',
        libelle: 'Action alloc B',
        ordre: 2,
        statut: 'actif'
      });
    expect(actionBResponse.status).toBe(201);

    const allocationResponse = await request(app.getHttpServer())
      .post('/budget-referentiels/allocations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        exerciceId,
        destinationAxeId: actionAResponse.body.id,
        montant: 1000,
        motif: 'Dotation initiale AXE-A'
      });

    expect(allocationResponse.status).toBe(201);
    expect(allocationResponse.body.operationType).toBe('allocation');

    const reallocationResponse = await request(app.getHttpServer())
      .post('/budget-referentiels/reallocations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        exerciceId,
        sourceAxeId: actionAResponse.body.id,
        destinationAxeId: actionBResponse.body.id,
        montant: 300,
        motif: 'Arbitrage vers AXE-B'
      });

    expect(reallocationResponse.status).toBe(201);
    expect(reallocationResponse.body.operationType).toBe('reallocation');

    const allocationsResponse = await request(app.getHttpServer())
      .get('/budget-referentiels/allocations')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ exerciceId });

    expect(allocationsResponse.status).toBe(200);
    expect(allocationsResponse.body).toHaveLength(2);

    const insufficientBalanceResponse = await request(app.getHttpServer())
      .post('/budget-referentiels/reallocations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        exerciceId,
        sourceAxeId: actionAResponse.body.id,
        destinationAxeId: actionBResponse.body.id,
        montant: 2000,
        motif: 'Doit echouer'
      });

    expect(insufficientBalanceResponse.status).toBe(400);
    expect(String(insufficientBalanceResponse.body.message)).toContain('Montant incoherent');

    const crossTenantReadResponse = await request(app.getHttpServer())
      .get('/budget-referentiels/allocations')
      .set('Authorization', `Bearer ${otherTenantToken}`)
      .query({ exerciceId });

    expect(crossTenantReadResponse.status).toBe(403);
  });

  it('versionne les decisions budgetaires et expose historique + comparaison', async () => {
    const createExerciceResponse = await request(app.getHttpServer())
      .post('/budget-referentiels/exercices')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        libelle: 'Exercice decisions e2e',
        code: 'E2E-DEC',
        dateDebut: '2043-01-01',
        dateFin: '2043-12-31',
        statut: 'ouvert'
      });
    expect(createExerciceResponse.status).toBe(201);
    const exerciceId = createExerciceResponse.body.id as string;

    const sectionResponse = await request(app.getHttpServer())
      .post('/budget-referentiels/sections')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        exerciceId,
        code: 'SEC-DEC-E2E',
        libelle: 'Section decision e2e',
        ordre: 1,
        statut: 'actif'
      });
    expect(sectionResponse.status).toBe(201);

    const programmeResponse = await request(app.getHttpServer())
      .post('/budget-referentiels/programmes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        exerciceId,
        sectionId: sectionResponse.body.id,
        code: 'PRG-DEC-E2E',
        libelle: 'Programme decision e2e',
        ordre: 1,
        statut: 'actif'
      });
    expect(programmeResponse.status).toBe(201);

    const actionResponse = await request(app.getHttpServer())
      .post('/budget-referentiels/actions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        exerciceId,
        programmeId: programmeResponse.body.id,
        code: 'ACT-DEC-E2E',
        libelle: 'Action decision e2e',
        ordre: 1,
        statut: 'actif'
      });
    expect(actionResponse.status).toBe(201);

    const allocationResponse = await request(app.getHttpServer())
      .post('/budget-referentiels/allocations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        exerciceId,
        destinationAxeId: actionResponse.body.id,
        montant: 900,
        motif: 'Dotation pour decision'
      });
    expect(allocationResponse.status).toBe(201);

    const decisionId = allocationResponse.body.id as string;

    const rejectResponse = await request(app.getHttpServer())
      .post(`/budget-referentiels/allocations/${decisionId}/decision/reject`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        exerciceId,
        motif: 'Refus pour controle complementaire'
      });
    expect(rejectResponse.status).toBe(201);
    expect(rejectResponse.body.version).toBe(2);
    expect(rejectResponse.body.statutDecision).toBe('rejected');

    const validateResponse = await request(app.getHttpServer())
      .post(`/budget-referentiels/allocations/${decisionId}/decision/validate`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        exerciceId,
        motif: 'Validation apres correction'
      });
    expect(validateResponse.status).toBe(201);
    expect(validateResponse.body.version).toBe(3);
    expect(validateResponse.body.statutDecision).toBe('validated');

    const historyResponse = await request(app.getHttpServer())
      .get(`/budget-referentiels/allocations/${decisionId}/decisions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ exerciceId });
    expect(historyResponse.status).toBe(200);
    expect(historyResponse.body).toHaveLength(3);
    expect(historyResponse.body[0].snapshotAvant).toBeDefined();
    expect(historyResponse.body[0].snapshotApres).toBeDefined();

    const compareResponse = await request(app.getHttpServer())
      .get(`/budget-referentiels/allocations/${decisionId}/decisions/compare`)
      .set('Authorization', `Bearer ${accessToken}`)
      .query({
        exerciceId,
        leftVersion: 2,
        rightVersion: 3
      });
    expect(compareResponse.status).toBe(200);
    expect(compareResponse.body.differences.statutDecision).toBeDefined();
    expect(compareResponse.body.differences.motif).toBeDefined();

    const crossTenantHistoryResponse = await request(app.getHttpServer())
      .get(`/budget-referentiels/allocations/${decisionId}/decisions`)
      .set('Authorization', `Bearer ${otherTenantToken}`)
      .query({ exerciceId });
    expect(crossTenantHistoryResponse.status).toBe(403);
  });

  it('rejects inconsistent parent/exercice link', async () => {
    const firstExercice = await request(app.getHttpServer())
      .post('/budget-referentiels/exercices')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        libelle: 'Exercice 1',
        code: 'E2E-EX-1',
        dateDebut: '2030-01-01',
        dateFin: '2030-12-31',
        statut: 'ouvert'
      });

    const secondExercice = await request(app.getHttpServer())
      .post('/budget-referentiels/exercices')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        libelle: 'Exercice 2',
        code: 'E2E-EX-2',
        dateDebut: '2031-01-01',
        dateFin: '2031-12-31',
        statut: 'ouvert'
      });

    const section = await request(app.getHttpServer())
      .post('/budget-referentiels/sections')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        exerciceId: firstExercice.body.id,
        code: 'SEC-CROSS',
        libelle: 'Section cross',
        ordre: 1,
        statut: 'actif'
      });

    const invalidProgramme = await request(app.getHttpServer())
      .post('/budget-referentiels/programmes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        exerciceId: secondExercice.body.id,
        sectionId: section.body.id,
        code: 'PRG-CROSS',
        libelle: 'Programme cross',
        ordre: 1,
        statut: 'actif'
      });

    expect(invalidProgramme.status).toBe(400);
  });

  it('rejects invalid axe id format with actionable message', async () => {
    const createExerciceResponse = await request(app.getHttpServer())
      .post('/budget-referentiels/exercices')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        libelle: 'Exercice invalid axe format',
        code: 'E2E-AXE-FORMAT',
        dateDebut: '2041-01-01',
        dateFin: '2041-12-31',
        statut: 'ouvert'
      });

    expect(createExerciceResponse.status).toBe(201);

    const response = await request(app.getHttpServer())
      .post('/budget-referentiels/allocations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        exerciceId: createExerciceResponse.body.id,
        destinationAxeId: 'AXE-A',
        montant: 100,
        motif: 'Axe invalide'
      });

    expect(response.status).toBe(400);
    expect(String(response.body.message)).toContain('identifiant axe attendu au format UUID');
  });

  it('rejects allocation when axe does not exist in exercice scope', async () => {
    const createExerciceResponse = await request(app.getHttpServer())
      .post('/budget-referentiels/exercices')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        libelle: 'Exercice unknown axe',
        code: 'E2E-UNKNOWN-AXE',
        dateDebut: '2042-01-01',
        dateFin: '2042-12-31',
        statut: 'ouvert'
      });

    expect(createExerciceResponse.status).toBe(201);

    const response = await request(app.getHttpServer())
      .post('/budget-referentiels/allocations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        exerciceId: createExerciceResponse.body.id,
        destinationAxeId: '11111111-1111-4111-8111-111111111111',
        montant: 100,
        motif: 'Axe inconnu'
      });

    expect(response.status).toBe(404);
    expect(String(response.body.message)).toContain('Axe destination introuvable');
  });

  it('enforces RBAC on write endpoints', async () => {
    const response = await request(app.getHttpServer())
      .post('/budget-referentiels/exercices')
      .set('Authorization', `Bearer ${readOnlyToken}`)
      .send({
        libelle: 'Exercice denied',
        code: 'DENIED',
        dateDebut: '2032-01-01',
        dateFin: '2032-12-31',
        statut: 'ouvert'
      });

    expect(response.status).toBe(403);
  });

  it('blocks separation of duties conflicts with explicit message', async () => {
    const response = await request(app.getHttpServer())
      .post('/budget-referentiels/exercices')
      .set('Authorization', `Bearer ${incompatibleDutiesToken}`)
      .send({
        libelle: 'Exercice SOD denied',
        code: 'SOD-DENIED',
        dateDebut: '2035-01-01',
        dateFin: '2035-12-31',
        statut: 'ouvert'
      });

    expect(response.status).toBe(403);
    expect(response.body.message).toContain('Separation des responsabilites');
    expect(logDecisionSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-sod',
        tenantId: 'tenant-1',
        decision: 'deny'
      })
    );
  });

  it('emits minimal authorization audit payload without sensitive fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/budget-referentiels/exercices')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        libelle: 'Exercice audit allow',
        code: 'AUDIT-ALLOW',
        dateDebut: '2039-01-01',
        dateFin: '2039-12-31',
        statut: 'ouvert'
      });

    expect(response.status).toBe(201);
    expect(logDecisionSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        tenantId: 'tenant-1',
        decision: 'allow'
      })
    );
    const lastCall = logDecisionSpy.mock.calls[logDecisionSpy.mock.calls.length - 1]?.[0] as Record<string, unknown>;
    expect(lastCall).toBeDefined();
    expect(lastCall).toHaveProperty('action');
    expect(lastCall).not.toHaveProperty('password');
    expect(lastCall).not.toHaveProperty('passwordHash');
    expect(lastCall).not.toHaveProperty('refreshToken');
  });

  it('requires exerciceId query param for exercice-scoped updates and deletes', async () => {
    const createExerciceResponse = await request(app.getHttpServer())
      .post('/budget-referentiels/exercices')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        libelle: 'Exercice guard check',
        code: 'EX-GUARD',
        dateDebut: '2034-01-01',
        dateFin: '2034-12-31',
        statut: 'ouvert'
      });

    expect(createExerciceResponse.status).toBe(201);

    const createSectionResponse = await request(app.getHttpServer())
      .post('/budget-referentiels/sections')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        exerciceId: createExerciceResponse.body.id,
        code: 'SEC-GUARD',
        libelle: 'Section guard',
        ordre: 1,
        statut: 'actif'
      });

    expect(createSectionResponse.status).toBe(201);

    const response = await request(app.getHttpServer())
      .delete(`/budget-referentiels/sections/${createSectionResponse.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(400);
  });

  it('rejects cross-tenant access to exercice-scoped resources', async () => {
    const createExerciceResponse = await request(app.getHttpServer())
      .post('/budget-referentiels/exercices')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        libelle: 'Exercice tenant 1',
        code: 'TENANT-1-ONLY',
        dateDebut: '2033-01-01',
        dateFin: '2033-12-31',
        statut: 'ouvert'
      });

    expect(createExerciceResponse.status).toBe(201);

    const response = await request(app.getHttpServer())
      .get('/budget-referentiels/actions')
      .set('Authorization', `Bearer ${otherTenantToken}`)
      .query({ exerciceId: createExerciceResponse.body.id });

    expect(response.status).toBe(403);
  });
});
