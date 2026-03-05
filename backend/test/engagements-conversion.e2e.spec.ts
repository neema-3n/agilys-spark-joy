import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { AuthorizationPolicyGuard } from '../src/auth/authorization-policy.guard';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { EngagementsController } from '../src/engagements/engagements.controller';
import { EngagementsService } from '../src/engagements/engagements.service';

describe('Engagements conversion (e2e)', () => {
  let app: INestApplication;
  const createFromReservation = jest.fn();

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      controllers: [EngagementsController],
      providers: [
        {
          provide: EngagementsService,
          useValue: {
            getAll: jest.fn(),
            getById: jest.fn(),
            getMontantDisponibleReservation: jest.fn(),
            createFromReservation,
            create: jest.fn(),
            update: jest.fn(),
            valider: jest.fn(),
            annuler: jest.fn(),
            delete: jest.fn()
          }
        }
      ]
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AuthorizationPolicyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true
      })
    );
    app.use((req: { user?: unknown }, _res: unknown, next: () => void) => {
      req.user = { sub: 'user-1', tenantId: 'tenant-1', roles: ['admin_client'] };
      next();
    });
    await app.init();
  });

  beforeEach(() => {
    createFromReservation.mockReset();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts a valid reservation -> engagement conversion request', async () => {
    createFromReservation.mockResolvedValue({
      id: 'eng-1',
      numero: 'ENG/EX-2026/001',
      exerciceId: '11111111-1111-4111-8111-111111111111',
      clientId: 'tenant-1',
      reservationCreditId: '22222222-2222-4222-8222-222222222222',
      ligneBudgetaireId: '33333333-3333-4333-8333-333333333333',
      objet: 'Objet test',
      montant: 450,
      statut: 'brouillon',
      dateCreation: '2026-01-01',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    });

    const response = await request(app.getHttpServer()).post('/engagements/from-reservation').send({
      reservationId: '22222222-2222-4222-8222-222222222222',
      exerciceId: '11111111-1111-4111-8111-111111111111',
      montant: 450
    });

    expect(response.status).toBe(201);
    expect(createFromReservation).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-1' }),
      expect.objectContaining({
        reservationId: '22222222-2222-4222-8222-222222222222',
        exerciceId: '11111111-1111-4111-8111-111111111111',
        montant: 450
      })
    );
    expect(response.body.id).toBe('eng-1');
  });

  it('rejects payload missing required fields with dto validation', async () => {
    const response = await request(app.getHttpServer()).post('/engagements/from-reservation').send({
      reservationId: '22222222-2222-4222-8222-222222222222'
    });

    expect(response.status).toBe(400);
    expect(createFromReservation).not.toHaveBeenCalled();
  });
});
