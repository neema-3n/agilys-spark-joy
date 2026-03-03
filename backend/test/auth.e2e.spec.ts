import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { applyTestEnv } from './test-env';

const postgresOnly = (process.env.AUTH_STORAGE_MODE ?? '').toLowerCase() === 'postgres' ? it : it.skip;

describe('AuthController (e2e)', () => {
  let app: INestApplication;

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/login success returns token pair with expected claims', async () => {
    const response = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'user@agilys.local',
      password: 'ChangeMe123!'
    });

    expect(response.status).toBe(201);
    expect(response.body.accessToken).toBeDefined();
    expect(response.body.refreshToken).toBeDefined();

    const decodedPayload = JSON.parse(Buffer.from(response.body.accessToken.split('.')[1], 'base64').toString('utf8'));
    expect(decodedPayload.sub).toBe('user-1');
    expect(decodedPayload.tenantId).toBe('tenant-1');
    expect(decodedPayload.roles).toEqual(['admin_client']);
  });

  it('POST /auth/login returns 401 for invalid credentials', async () => {
    const response = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'user@agilys.local',
      password: 'bad-password'
    });

    expect(response.status).toBe(401);
  });

  it('POST /auth/login returns 400 for invalid payload', async () => {
    const response = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'not-an-email',
      password: 'short'
    });

    expect(response.status).toBe(400);
  });

  it('POST /auth/refresh rotates refresh token and invalidates old one', async () => {
    const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'user@agilys.local',
      password: 'ChangeMe123!'
    });

    const initialRefresh = loginResponse.body.refreshToken;
    const refreshResponse = await request(app.getHttpServer()).post('/auth/refresh').send({
      refreshToken: initialRefresh
    });

    expect(refreshResponse.status).toBe(201);
    expect(refreshResponse.body.refreshToken).toBeDefined();
    expect(refreshResponse.body.refreshToken).not.toEqual(initialRefresh);

    const reusedResponse = await request(app.getHttpServer()).post('/auth/refresh').send({
      refreshToken: initialRefresh
    });

    expect(reusedResponse.status).toBe(403);
  });

  it('POST /auth/logout revokes refresh token', async () => {
    const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'user@agilys.local',
      password: 'ChangeMe123!'
    });

    const refreshToken = loginResponse.body.refreshToken;
    const logoutResponse = await request(app.getHttpServer()).post('/auth/logout').send({
      refreshToken
    });

    expect(logoutResponse.status).toBe(204);

    const refreshResponse = await request(app.getHttpServer()).post('/auth/refresh').send({
      refreshToken
    });

    expect(refreshResponse.status).toBe(403);
  });

  postgresOnly('revocation done on instance A is enforced on instance B', async () => {
    const moduleFixtureB = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();
    const appB = moduleFixtureB.createNestApplication();
    appB.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true
      })
    );
    await appB.init();

    try {
      const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({
        email: 'user@agilys.local',
        password: 'ChangeMe123!'
      });
      const refreshToken = loginResponse.body.refreshToken;

      const logoutResponse = await request(app.getHttpServer()).post('/auth/logout').send({
        refreshToken
      });
      expect(logoutResponse.status).toBe(204);

      const refreshFromSecondInstance = await request(appB.getHttpServer()).post('/auth/refresh').send({
        refreshToken
      });
      expect(refreshFromSecondInstance.status).toBe(403);
    } finally {
      await appB.close();
    }
  });

  it('POST /auth/refresh returns 400 for invalid payload', async () => {
    const response = await request(app.getHttpServer()).post('/auth/refresh').send({
      refreshToken: 'tiny'
    });

    expect(response.status).toBe(400);
  });

  it('PATCH /auth/users/:userId/roles assign/revoke is idempotent and effective immediately', async () => {
    const superAdminSession = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'superadmin@agilys.local',
      password: 'ChangeMe123!'
    });
    expect(superAdminSession.status).toBe(201);

    const operatorSession = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'ops@agilys.local',
      password: 'ChangeMe123!'
    });
    expect(operatorSession.status).toBe(201);

    const superToken = superAdminSession.body.accessToken as string;
    const operatorToken = operatorSession.body.accessToken as string;

    const deniedBeforeAssign = await request(app.getHttpServer())
      .post('/budget-referentiels/exercices')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        libelle: 'Exercice role test before assign',
        code: 'ROLE-TEST-BEFORE',
        dateDebut: '2036-01-01',
        dateFin: '2036-12-31',
        statut: 'ouvert'
      });
    expect(deniedBeforeAssign.status).toBe(403);

    const assignRoleResponse = await request(app.getHttpServer())
      .patch('/auth/users/user-ops/roles/assign')
      .set('Authorization', `Bearer ${superToken}`)
      .send({ role: 'directeur_financier' });
    expect(assignRoleResponse.status).toBe(200);
    expect(assignRoleResponse.body.roles).toContain('directeur_financier');

    const assignAgainResponse = await request(app.getHttpServer())
      .patch('/auth/users/user-ops/roles/assign')
      .set('Authorization', `Bearer ${superToken}`)
      .send({ role: 'directeur_financier' });
    expect(assignAgainResponse.status).toBe(200);
    expect(
      (assignAgainResponse.body.roles as string[]).filter((role) => role === 'directeur_financier')
    ).toHaveLength(1);

    const allowedAfterAssign = await request(app.getHttpServer())
      .post('/budget-referentiels/exercices')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        libelle: 'Exercice role test after assign',
        code: 'ROLE-TEST-AFTER-ASSIGN',
        dateDebut: '2037-01-01',
        dateFin: '2037-12-31',
        statut: 'ouvert'
      });
    expect(allowedAfterAssign.status).toBe(201);

    const revokeRoleResponse = await request(app.getHttpServer())
      .patch('/auth/users/user-ops/roles/revoke')
      .set('Authorization', `Bearer ${superToken}`)
      .send({ role: 'directeur_financier' });
    expect(revokeRoleResponse.status).toBe(200);
    expect(revokeRoleResponse.body.roles).not.toContain('directeur_financier');

    const deniedAfterRevoke = await request(app.getHttpServer())
      .post('/budget-referentiels/exercices')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        libelle: 'Exercice role test after revoke',
        code: 'ROLE-TEST-AFTER-REVOKE',
        dateDebut: '2038-01-01',
        dateFin: '2038-12-31',
        statut: 'ouvert'
      });
    expect(deniedAfterRevoke.status).toBe(403);
  });

  it('PATCH /auth/users/:userId/roles allows admin_client to manage roles in same tenant', async () => {
    const adminSession = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'user@agilys.local',
      password: 'ChangeMe123!'
    });
    expect(adminSession.status).toBe(201);

    const adminToken = adminSession.body.accessToken as string;

    const assignResponse = await request(app.getHttpServer())
      .patch('/auth/users/user-ops/roles/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'auditeur' });
    expect(assignResponse.status).toBe(200);
    expect(assignResponse.body.roles).toContain('auditeur');

    const revokeResponse = await request(app.getHttpServer())
      .patch('/auth/users/user-ops/roles/revoke')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'auditeur' });
    expect(revokeResponse.status).toBe(200);
    expect(revokeResponse.body.roles).not.toContain('auditeur');
  });

  it('PATCH /auth/users/:userId/roles rejects cross-tenant role management for admin_client', async () => {
    const adminSession = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'user@agilys.local',
      password: 'ChangeMe123!'
    });
    expect(adminSession.status).toBe(201);

    const adminToken = adminSession.body.accessToken as string;

    const assignResponse = await request(app.getHttpServer())
      .patch('/auth/users/user-other-tenant/roles/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'auditeur' });

    expect(assignResponse.status).toBe(403);
    expect(assignResponse.body.message).toContain('inter-tenant');
  });

  it('PATCH /auth/users/:userId/roles blocks incompatible SoD role assignment', async () => {
    const adminSession = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'user@agilys.local',
      password: 'ChangeMe123!'
    });
    expect(adminSession.status).toBe(201);

    const adminToken = adminSession.body.accessToken as string;

    const assignOrdonnateur = await request(app.getHttpServer())
      .patch('/auth/users/user-ops/roles/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'ordonnateur' });
    expect(assignOrdonnateur.status).toBe(200);

    const assignComptable = await request(app.getHttpServer())
      .patch('/auth/users/user-ops/roles/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'comptable' });
    expect(assignComptable.status).toBe(403);
    expect(assignComptable.body.message).toContain('Separation des responsabilites');

    const cleanupOrdonnateur = await request(app.getHttpServer())
      .patch('/auth/users/user-ops/roles/revoke')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'ordonnateur' });
    expect(cleanupOrdonnateur.status).toBe(200);
  });
});
