import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { applyTestEnv } from './test-env';

describe('BudgetReferentielsController (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let readOnlyToken: string;

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

    const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'user@agilys.local',
      password: 'ChangeMe123!'
    });

    accessToken = loginResponse.body.accessToken;

    const jwtService = moduleFixture.get(JwtService);
    readOnlyToken = await jwtService.signAsync(
      {
        sub: 'user-read-only',
        tenantId: 'tenant-1',
        roles: ['operateur_saisie']
      },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: 600
      }
    );
  });

  afterAll(async () => {
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
      .set('Authorization', `Bearer ${accessToken}`);

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
});
