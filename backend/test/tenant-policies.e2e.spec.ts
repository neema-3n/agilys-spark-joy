import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { AuthorizationAuditService } from '../src/auth/authorization-audit.service';
import { applyTestEnv } from './test-env';

describe('TenantPoliciesController (e2e)', () => {
  let app: INestApplication;
  let tenant1AdminToken: string;
  let tenant2AdminToken: string;
  let superAdminToken: string;
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

    const jwtService = moduleFixture.get(JwtService);
    tenant1AdminToken = await jwtService.signAsync(
      {
        sub: 'user-1',
        tenantId: 'tenant-1',
        roles: ['admin_client']
      },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: 600
      }
    );

    tenant2AdminToken = await jwtService.signAsync(
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

    superAdminToken = await jwtService.signAsync(
      {
        sub: 'user-super',
        tenantId: 'tenant-1',
        roles: ['super_admin']
      },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: 600
      }
    );

    authorizationAuditService = moduleFixture.get(AuthorizationAuditService);
    logDecisionSpy = jest.spyOn(authorizationAuditService, 'logDecision');
  });

  afterAll(async () => {
    logDecisionSpy.mockRestore();
    await app.close();
  });

  it('allows tenant admin to update and read own retention policy with versioning', async () => {
    const firstUpdate = await request(app.getHttpServer())
      .patch('/tenant-policies/retention')
      .set('Authorization', `Bearer ${tenant1AdminToken}`)
      .send({
        retentionDays: 365,
        legalHoldEnabled: false
      });

    expect(firstUpdate.status).toBe(200);
    expect(firstUpdate.body.tenantId).toBe('tenant-1');
    expect(firstUpdate.body.version).toBe(1);

    const secondUpdate = await request(app.getHttpServer())
      .patch('/tenant-policies/retention')
      .set('Authorization', `Bearer ${tenant1AdminToken}`)
      .send({
        retentionDays: 730,
        legalHoldEnabled: true
      });

    expect(secondUpdate.status).toBe(200);
    expect(secondUpdate.body.tenantId).toBe('tenant-1');
    expect(secondUpdate.body.version).toBe(2);

    const readPolicy = await request(app.getHttpServer())
      .get('/tenant-policies/retention')
      .set('Authorization', `Bearer ${tenant1AdminToken}`);

    expect(readPolicy.status).toBe(200);
    expect(readPolicy.body.version).toBe(2);
    expect(readPolicy.body.retentionDays).toBe(730);
    expect(readPolicy.body.legalHoldEnabled).toBe(true);
  });

  it('rejects cross-tenant mutation for non super-admin', async () => {
    const response = await request(app.getHttpServer())
      .patch('/tenant-policies/retention')
      .set('Authorization', `Bearer ${tenant1AdminToken}`)
      .send({
        tenantId: 'tenant-2',
        retentionDays: 90,
        legalHoldEnabled: false
      });

    expect(response.status).toBe(403);
    expect(response.body.message).toContain('Access hors tenant refuse');
  });

  it('ensures tenant A policy changes do not affect tenant B', async () => {
    const updateTenant1 = await request(app.getHttpServer())
      .patch('/tenant-policies/retention')
      .set('Authorization', `Bearer ${tenant1AdminToken}`)
      .send({
        retentionDays: 120,
        legalHoldEnabled: false
      });
    expect(updateTenant1.status).toBe(200);

    const updateTenant2 = await request(app.getHttpServer())
      .patch('/tenant-policies/retention')
      .set('Authorization', `Bearer ${tenant2AdminToken}`)
      .send({
        retentionDays: 540,
        legalHoldEnabled: true
      });
    expect(updateTenant2.status).toBe(200);

    const readTenant1 = await request(app.getHttpServer())
      .get('/tenant-policies/retention')
      .set('Authorization', `Bearer ${tenant1AdminToken}`);
    expect(readTenant1.status).toBe(200);
    expect(readTenant1.body.tenantId).toBe('tenant-1');
    expect(readTenant1.body.retentionDays).toBe(120);

    const readTenant2 = await request(app.getHttpServer())
      .get('/tenant-policies/retention')
      .set('Authorization', `Bearer ${tenant2AdminToken}`);
    expect(readTenant2.status).toBe(200);
    expect(readTenant2.body.tenantId).toBe('tenant-2');
    expect(readTenant2.body.retentionDays).toBe(540);
  });

  it('allows super-admin to update another tenant policy explicitly', async () => {
    const response = await request(app.getHttpServer())
      .patch('/tenant-policies/retention')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        tenantId: 'tenant-2',
        retentionDays: 400,
        legalHoldEnabled: true
      });

    expect(response.status).toBe(200);
    expect(response.body.tenantId).toBe('tenant-2');
  });

  it('logs minimal authorization audit payload for tenant policy endpoints', async () => {
    const response = await request(app.getHttpServer())
      .get('/tenant-policies/retention')
      .set('Authorization', `Bearer ${tenant1AdminToken}`);

    expect(response.status).toBe(200);
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
});
