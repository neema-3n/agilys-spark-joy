import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { AppModule } from '../src/app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleFixture.createNestApplication();
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
    expect(decodedPayload.roles).toEqual(['USER']);
  });

  it('POST /auth/login returns 401 for invalid credentials', async () => {
    const response = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'user@agilys.local',
      password: 'bad-password'
    });

    expect(response.status).toBe(401);
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
});
