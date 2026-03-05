import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { applyTestEnv } from './test-env';

describe('PrevisionsController (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects anonymous requests', async () => {
    const response = await request(app.getHttpServer())
      .get('/previsions/ecarts')
      .query({
        exerciceId: '2f0715a2-3860-4584-b8ca-df8bcd5b6f64'
      });

    expect(response.status).toBe(401);
  });

  it('returns actionable error for invalid period format', async () => {
    const response = await request(app.getHttpServer())
      .get('/previsions/ecarts')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({
        exerciceId: '2f0715a2-3860-4584-b8ca-df8bcd5b6f64',
        periode: '2026-Q1'
      });

    expect(response.status).toBe(400);
    expect(String(response.body.message)).toContain('AAAA');
  });

  it('returns 404 for exercice out of tenant scope', async () => {
    const response = await request(app.getHttpServer())
      .get('/previsions/ecarts')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({
        exerciceId: '71b22b74-4a30-4f6e-afc9-9f81546567a9'
      });

    expect(response.status).toBe(404);
    expect(String(response.body.message)).toContain('tenant');
  });
});
