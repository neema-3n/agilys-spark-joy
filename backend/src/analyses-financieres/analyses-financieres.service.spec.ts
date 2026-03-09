import type { QueryResult, QueryResultRow } from 'pg';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import type { PostgresService } from '../common/postgres.service';
import { AnalysesFinancieresService } from './analyses-financieres.service';

const actor: AuthenticatedUser = {
  sub: 'user-1',
  tenantId: 'tenant-1',
  roles: ['controleur_gestion']
};

const makeResult = <T extends QueryResultRow>(rows: T[], rowCount = rows.length): QueryResult<T> =>
  ({
    rows,
    rowCount,
    command: 'SELECT',
    oid: 0,
    fields: []
  }) as QueryResult<T>;

describe('AnalysesFinancieresService', () => {
  const query = jest.fn();
  const postgresService = { query } as unknown as PostgresService;
  const service = new AnalysesFinancieresService(postgresService);

  beforeEach(() => {
    query.mockReset();
  });

  it("agregre correctement les vues projet/structure/axe et scopee au tenant/exercice", async () => {
    query
      .mockResolvedValueOnce(
        makeResult([
          {
            projet_id: 'projet-1',
            projet_code: 'CC01-PROJ-A',
            projet_nom: 'Projet A',
            budget_alloue: '1000',
            engage: '350',
            paye: '200',
            structure_id: 'structure-1',
            structure_code: 'CC01',
            structure_nom: 'Centre 01'
          }
        ])
      )
      .mockResolvedValueOnce(
        makeResult([
          {
            section_id: 'section-1',
            section_code: 'SEC-1',
            programme_id: 'programme-1',
            programme_code: 'PRG-1',
            action_id: 'action-1',
            action_code: 'ACT-1',
            budget_alloue: '1000',
            engage: '350',
            paye: '200'
          }
        ])
      )
      .mockResolvedValueOnce(makeResult([{ value: '1' }]))
      .mockResolvedValueOnce(makeResult([{ value: '1' }]))
      .mockResolvedValueOnce(makeResult([{ value: '1' }]));

    const result = await service.getAggregation(actor, {
      exerciceId: '0f9ca8f0-c115-44f8-b20b-6f5d26e38149'
    });

    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('WHERE p.client_id = $1'),
      [actor.tenantId, '0f9ca8f0-c115-44f8-b20b-6f5d26e38149']
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('WHERE lb.client_id = $1'),
      [actor.tenantId, '0f9ca8f0-c115-44f8-b20b-6f5d26e38149']
    );

    expect(result.projetRows).toHaveLength(1);
    expect(result.structureRows).toHaveLength(1);
    expect(result.axeRows).toHaveLength(1);
    expect(result.kpis).toEqual({
      budgetAlloue: 1000,
      engage: 350,
      paye: 200,
      disponible: 650,
      tauxExecution: 20
    });
    expect(result.counts).toEqual({ projets: 1, structures: 1, axes: 1 });
  });

  it('retourne des zero quand aucune ligne ne remonte', async () => {
    query
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([{ value: '0' }]))
      .mockResolvedValueOnce(makeResult([{ value: '0' }]))
      .mockResolvedValueOnce(makeResult([{ value: '0' }]));

    const result = await service.getAggregation(actor, {
      exerciceId: '0f9ca8f0-c115-44f8-b20b-6f5d26e38149'
    });

    expect(result.kpis).toEqual({
      budgetAlloue: 0,
      engage: 0,
      paye: 0,
      disponible: 0,
      tauxExecution: 0
    });
    expect(result.counts).toEqual({ projets: 0, structures: 0, axes: 0 });
  });
});

