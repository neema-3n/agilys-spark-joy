import { NotFoundException } from '@nestjs/common';
import type { QueryResult, QueryResultRow } from 'pg';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import type { PostgresService } from '../common/postgres.service';
import { ProjetsService } from './projets.service';

const actor: AuthenticatedUser = {
  sub: 'user-1',
  tenantId: 'tenant-1',
  roles: ['admin_client'],
};

const makeResult = <T extends QueryResultRow>(rows: T[], rowCount = rows.length): QueryResult<T> =>
  ({
    rows,
    rowCount,
    command: 'SELECT',
    oid: 0,
    fields: [],
  }) as QueryResult<T>;

describe('ProjetsService', () => {
  const query = jest.fn();
  const postgresService = { query } as unknown as PostgresService;
  const service = new ProjetsService(postgresService);

  beforeEach(() => {
    query.mockReset();
  });

  it('scope getByExercice au tenant/exercice et mappe les montants numeriques', async () => {
    query.mockResolvedValueOnce(
      makeResult([
        {
          id: 'prj-1',
          client_id: actor.tenantId,
          exercice_id: 'ex-1',
          code: 'CC01-PROJ-A',
          nom: 'Projet A',
          description: null,
          responsable: 'Resp',
          date_debut: '2026-01-01',
          date_fin: '2026-12-31',
          budget_alloue: '1200',
          budget_consomme: '300',
          budget_engage: '500',
          enveloppe_id: null,
          statut: 'en_cours',
          type_projet: null,
          priorite: 'haute',
          taux_avancement: '41.5',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-02T00:00:00.000Z',
          created_by: actor.sub,
        },
      ])
    );

    const result = await service.getByExercice(actor, 'ex-1');

    expect(query).toHaveBeenCalledWith(expect.stringContaining('WHERE client_id = $1'), [actor.tenantId, 'ex-1']);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        clientId: actor.tenantId,
        exerciceId: 'ex-1',
        budgetAlloue: 1200,
        budgetConsomme: 300,
        budgetEngage: 500,
        tauxAvancement: 41.5,
      })
    );
  });

  it('refuse getById hors tenant', async () => {
    query.mockResolvedValueOnce(makeResult([]));
    await expect(service.getById(actor, 'prj-other-tenant')).rejects.toBeInstanceOf(NotFoundException);
  });
});

