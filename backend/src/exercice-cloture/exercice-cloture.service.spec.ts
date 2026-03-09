import { BadRequestException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import type { BudgetReferentielsService } from '../budget-referentiels/budget-referentiels.service';
import type { ExerciceEntity } from '../budget-referentiels/budget-referentiels.types';
import type { PostgresService } from '../common/postgres.service';
import { ExerciceClotureService } from './exercice-cloture.service';
import type { ExerciceChecklist } from './exercice-cloture.types';

const actor: AuthenticatedUser = {
  sub: 'user-1',
  tenantId: 'tenant-1',
  roles: ['admin_client']
};

const exercice: ExerciceEntity = {
  id: 'ex-1',
  clientId: 'tenant-1',
  libelle: 'Exercice 2026',
  code: 'EX-2026',
  dateDebut: '2026-01-01',
  dateFin: '2026-12-31',
  statut: 'ouverte',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  createdBy: 'user-1',
  archivedAt: null
};

const buildChecklist = (canClose: boolean): ExerciceChecklist => ({
  exerciceId: exercice.id,
  statutExercice: 'ouverte',
  generatedAt: '2026-03-08T00:00:00.000Z',
  canClose,
  items: []
});

describe('ExerciceClotureService', () => {
  const budgetReferentielsService = {
    getExercices: jest.fn(),
    updateExercice: jest.fn(),
    createExercice: jest.fn()
  } as unknown as jest.Mocked<BudgetReferentielsService>;

  const postgresService = {
    query: jest.fn()
  } as unknown as jest.Mocked<PostgresService>;

  let service: ExerciceClotureService;

  beforeEach(() => {
    jest.resetAllMocks();
    budgetReferentielsService.getExercices.mockReturnValue([exercice]);
    service = new ExerciceClotureService(budgetReferentielsService, postgresService);
    (service as any).syncExerciceToDatabase = jest.fn().mockResolvedValue(undefined);
    (service as any).recordEvent = jest.fn().mockResolvedValue(undefined);
  });

  it('blocks final close when checklist contains blocking anomalies', async () => {
    (service as any).buildChecklist = jest.fn().mockResolvedValue(buildChecklist(false));

    await expect(service.close(actor, exercice.id)).rejects.toThrow(BadRequestException);
    expect((service as any).recordEvent).toHaveBeenCalledWith(
      actor,
      exercice.id,
      'cloture',
      'ouverte',
      'en_revue',
      'blocked',
      expect.objectContaining({ canClose: false }),
      { reason: 'checklist-blocking' }
    );
  });

  it('closes the exercise through en_revue and prepares N+1 idempotently', async () => {
    const reviewed = { ...exercice, statut: 'en_revue' as const };
    const closed = { ...exercice, statut: 'fermee' as const };
    const nextExercice = {
      ...exercice,
      id: 'ex-2',
      libelle: 'Exercice 2027',
      code: 'EX-2027',
      dateDebut: '2027-01-01',
      dateFin: '2027-12-31',
      statut: 'ouverte' as const
    };

    (service as any).buildChecklist = jest.fn().mockResolvedValue(buildChecklist(true));
    (service as any).updateStoreStatus = jest
      .fn()
      .mockReturnValueOnce(reviewed)
      .mockReturnValueOnce(closed);
    (service as any).ensureNextExercice = jest.fn().mockResolvedValue(nextExercice);

    const result = await service.close(actor, exercice.id);

    expect(result.exercice.statut).toBe('fermee');
    expect(result.nextExercice.id).toBe('ex-2');
    expect((service as any).recordEvent).toHaveBeenCalledWith(
      actor,
      exercice.id,
      'cloture',
      'en_revue',
      'fermee',
      'accepted',
      expect.objectContaining({ canClose: true }),
      { nextExerciceId: 'ex-2' }
    );
  });

  it('rejects mutations on exercices in review or closed state', async () => {
    postgresService.query.mockResolvedValueOnce({
      rows: [
        {
          id: exercice.id,
          client_id: actor.tenantId,
          libelle: exercice.libelle,
          code: exercice.code,
          date_debut: exercice.dateDebut,
          date_fin: exercice.dateFin,
          statut: 'en_revue'
        }
      ]
    } as never);

    await expect(service.assertExerciceMutable(actor, exercice.id, 'création de facture')).rejects.toThrow(
      'Mutation refusée'
    );
  });

  it('allows mutations when exercise is still open or not yet synchronized in postgres', async () => {
    postgresService.query
      .mockResolvedValueOnce({
        rows: []
      } as never)
      .mockResolvedValueOnce({
        rows: []
      } as never);

    await expect(service.assertExerciceMutable(actor, exercice.id, 'création de dépense')).resolves.toBeUndefined();
    expect((service as any).syncExerciceToDatabase).toHaveBeenCalledWith(exercice);
  });

  it('blocks mutations when the postgres row is missing but the exercice is already closed in store', async () => {
    budgetReferentielsService.getExercices.mockReturnValue([{ ...exercice, statut: 'fermee' }]);
    postgresService.query.mockResolvedValueOnce({
      rows: []
    } as never);

    await expect(service.assertExerciceMutable(actor, exercice.id, 'création de dépense')).rejects.toThrow(
      'réouverture gouvernée'
    );
  });
});
