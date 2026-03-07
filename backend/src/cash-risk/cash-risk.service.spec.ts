import { Logger } from '@nestjs/common';
import { performance } from 'node:perf_hooks';
import type { QueryResult, QueryResultRow } from 'pg';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import type { PostgresService } from '../common/postgres.service';
import { CashRiskBlockedException } from './cash-risk-blocked.exception';
import { CashRiskService } from './cash-risk.service';

const actor: AuthenticatedUser = {
  sub: 'user-1',
  tenantId: 'tenant-1',
  roles: ['admin_client'],
};

const makeResult = <T extends QueryResultRow>(rows: T[], rowCount = rows.length): QueryResult<T> => {
  return {
    rows,
    rowCount,
    command: 'SELECT',
    oid: 0,
    fields: [],
  } as QueryResult<T>;
};

describe('CashRiskService', () => {
  const query = jest.fn();
  const postgresService = { query } as unknown as PostgresService;
  const service = new CashRiskService(postgresService);

  beforeEach(() => {
    query.mockReset();
    jest.restoreAllMocks();
  });

  it('autorise un engagement sous seuil avec un score deterministic', async () => {
    query
      .mockResolvedValueOnce(makeResult([{ available_cash: 1000 }]))
      .mockResolvedValueOnce(
        makeResult([
          {
            outstanding_depenses: 100,
            pending_depenses: 1,
            remaining_engagements: 120,
            pending_engagements: 1,
          },
        ])
      )
      .mockResolvedValueOnce(makeResult([{ non_reconciled_count: 0 }]));

    const first = await service.evaluate(actor, {
      exerciceId: 'ex-1',
      transition: 'engagement:create',
      sourceType: 'engagement',
      entityId: 'lb-1',
      amount: 80,
    });

    query.mockReset();
    query
      .mockResolvedValueOnce(makeResult([{ available_cash: 1000 }]))
      .mockResolvedValueOnce(
        makeResult([
          {
            outstanding_depenses: 100,
            pending_depenses: 1,
            remaining_engagements: 120,
            pending_engagements: 1,
          },
        ])
      )
      .mockResolvedValueOnce(makeResult([{ non_reconciled_count: 0 }]));

    const second = await service.evaluate(actor, {
      exerciceId: 'ex-1',
      transition: 'engagement:create',
      sourceType: 'engagement',
      entityId: 'lb-1',
      amount: 80,
    });

    expect(first.decision).toBe('allow');
    expect(first.riskScore).toBe(second.riskScore);
    expect(first.snapshot.tenantId).toBe(actor.tenantId);
    expect(first.snapshot.correlationId).toContain('ligne-budgetaire:lb-1');
  });

  it("scope les aggregats par ligne budgetaire pour une transition d'engagement", async () => {
    query
      .mockResolvedValueOnce(makeResult([{ available_cash: 800 }]))
      .mockResolvedValueOnce(
        makeResult([
          {
            outstanding_depenses: 120,
            pending_depenses: 2,
            remaining_engagements: 80,
            pending_engagements: 1,
          },
        ])
      )
      .mockResolvedValueOnce(makeResult([{ non_reconciled_count: 1 }]));

    await service.evaluate(actor, {
      exerciceId: 'ex-1',
      transition: 'engagement:validate',
      sourceType: 'engagement',
      sourceId: 'eng-1',
      entityId: 'lb-42',
      amount: 60,
    });

    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('AND d.ligne_budgetaire_id = $3'),
      [actor.tenantId, 'ex-1', 'lb-42']
    );
    expect(query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('AND ligne_budgetaire_id = $3'),
      [actor.tenantId, 'ex-1', 'lb-42']
    );
  });

  it('bloque une transition quand le gap de trésorerie est positif', async () => {
    query
      .mockResolvedValueOnce(makeResult([{ available_cash: 50 }]))
      .mockResolvedValueOnce(
        makeResult([
          {
            outstanding_depenses: 70,
            pending_depenses: 2,
            remaining_engagements: 60,
            pending_engagements: 1,
          },
        ])
      )
      .mockResolvedValueOnce(makeResult([{ non_reconciled_count: 2 }]));

    await expect(
      service.assertAllowed(actor, {
        exerciceId: 'ex-1',
        transition: 'paiement:execute',
        sourceType: 'paiement',
        sourceId: 'pay-1',
        amount: 40,
      })
    ).rejects.toBeInstanceOf(CashRiskBlockedException);
  });

  it('journalise les décisions allow et block sans sortir du tenant', async () => {
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

    query
      .mockResolvedValueOnce(makeResult([{ available_cash: 1000 }]))
      .mockResolvedValueOnce(
        makeResult([
          {
            outstanding_depenses: 0,
            pending_depenses: 0,
            remaining_engagements: 0,
            pending_engagements: 0,
          },
        ])
      )
      .mockResolvedValueOnce(makeResult([{ non_reconciled_count: 0 }]));

    await service.evaluate(actor, {
      exerciceId: 'ex-1',
      transition: 'engagement:validate',
      sourceType: 'engagement',
      sourceId: 'eng-1',
      amount: 100,
    });

    query.mockReset();
    query
      .mockResolvedValueOnce(makeResult([{ available_cash: 20 }]))
      .mockResolvedValueOnce(
        makeResult([
          {
            outstanding_depenses: 80,
            pending_depenses: 1,
            remaining_engagements: 30,
            pending_engagements: 1,
          },
        ])
      )
      .mockResolvedValueOnce(makeResult([{ non_reconciled_count: 1 }]));

    await service.evaluate(actor, {
      exerciceId: 'ex-1',
      transition: 'paiement:reprendre',
      sourceType: 'paiement',
      sourceId: 'pay-2',
      amount: 20,
    });

    expect(logSpy).toHaveBeenCalledTimes(2);
    const payloads = logSpy.mock.calls.map((call) => JSON.parse(call[0] as string));
    expect(payloads.every((payload) => payload.tenantId === actor.tenantId)).toBe(true);
    expect(payloads.every((payload) => typeof payload.threshold === 'number')).toBe(true);
    expect(payloads.every((payload) => payload.snapshot?.correlationId)).toBe(true);
  });

  it("expose un point d'extension propre pour l'ordonnancement de dépense", async () => {
    query
      .mockResolvedValueOnce(makeResult([{ available_cash: 500 }]))
      .mockResolvedValueOnce(
        makeResult([
          {
            outstanding_depenses: 100,
            pending_depenses: 1,
            remaining_engagements: 50,
            pending_engagements: 1,
          },
        ])
      )
      .mockResolvedValueOnce(makeResult([{ non_reconciled_count: 0 }]));

    const decision = await service.evaluateOrdonnancementRisk(actor, 'ex-1', 40, 'dep-1');

    expect(decision.snapshot.transition).toBe('depense:ordonnancer');
    expect(decision.snapshot.sourceId).toBe('dep-1');
    expect(decision.snapshot.entityId).toBe('dep-1');
  });

  it('reste sous un p95 synthétique de 500 ms pour les évaluations critiques', async () => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM public.comptes_tresorerie')) {
        return makeResult([{ available_cash: 1500 }]);
      }

      if (sql.includes('FROM depenses_outstanding, engagements_remaining')) {
        return makeResult([
          {
            outstanding_depenses: 120,
            pending_depenses: 2,
            remaining_engagements: 180,
            pending_engagements: 2,
          },
        ]);
      }

      return makeResult([{ non_reconciled_count: 1 }]);
    });

    const durations: number[] = [];

    for (let index = 0; index < 75; index += 1) {
      const startedAt = performance.now();
      await service.evaluate(actor, {
        exerciceId: 'ex-1',
        transition: index % 2 === 0 ? 'engagement:validate' : 'paiement:execute',
        sourceType: index % 2 === 0 ? 'engagement' : 'paiement',
        sourceId: `source-${index}`,
        entityId: index % 2 === 0 ? `lb-${index % 5}` : `dep-${index % 5}`,
        amount: 75 + (index % 10),
      });
      durations.push(performance.now() - startedAt);
    }

    const sortedDurations = [...durations].sort((left, right) => left - right);
    const p95Index = Math.ceil(sortedDurations.length * 0.95) - 1;
    const p95 = sortedDurations[Math.max(p95Index, 0)] ?? 0;

    expect(p95).toBeLessThanOrEqual(500);
  });
});
