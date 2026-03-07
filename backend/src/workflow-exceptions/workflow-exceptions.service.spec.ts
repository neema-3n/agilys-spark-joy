import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { QueryResult, QueryResultRow } from 'pg';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CashRiskBlockedException } from '../cash-risk/cash-risk-blocked.exception';
import type { CashRiskService } from '../cash-risk/cash-risk.service';
import type { PostgresService } from '../common/postgres.service';
import { WorkflowExceptionsService } from './workflow-exceptions.service';

const actor: AuthenticatedUser = {
  sub: 'user-1',
  tenantId: 'tenant-1',
  roles: ['directeur_financier'],
};

const makeResult = <T extends QueryResultRow>(rows: T[], rowCount = rows.length): QueryResult<T> =>
  ({
    rows,
    rowCount,
    command: 'SELECT',
    oid: 0,
    fields: [],
  }) as QueryResult<T>;

const makeExceptionRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'exc-1',
  tenant_id: actor.tenantId,
  exercice_id: 'ex-1',
  status: 'soumise',
  transition: 'paiement:execute',
  source_type: 'paiement',
  source_id: 'pay-1',
  entity_id: 'dep-1',
  correlation_id: 'corr-1',
  motif: 'm',
  justification: 'j',
  urgence: 'haute',
  quorum_required: 2,
  expires_at: '2030-01-01T00:00:00.000Z',
  requested_by: 'user-2',
  approved_at: null,
  decided_at: null,
  consumed_at: null,
  consumed_by: null,
  consumed_transition: null,
  risk_decision: {
    riskLevel: 'high',
    riskScore: 70,
    decision: 'block',
    reasons: [],
    snapshot: {
      transition: 'paiement:execute',
      sourceType: 'paiement',
      correlationId: 'corr-1',
    },
  },
  created_at: '2026-03-07T00:00:00.000Z',
  updated_at: '2026-03-07T00:00:00.000Z',
  ...overrides,
});

describe('WorkflowExceptionsService', () => {
  const query = jest.fn();
  const postgresService = { query } as unknown as PostgresService;
  const cashRiskService = {
    evaluate: jest.fn(),
  } as unknown as CashRiskService;
  const service = new WorkflowExceptionsService(postgresService, cashRiskService);

  beforeEach(() => {
    query.mockReset();
    query.mockImplementation(async () => makeResult([]));
    jest.clearAllMocks();
  });

  it('crée une demande si la transition est effectivement bloquée', async () => {
    (cashRiskService.evaluate as jest.Mock).mockResolvedValue({
      riskLevel: 'critical',
      riskScore: 88,
      decision: 'block',
      reasons: ['blocked'],
      snapshot: {
        tenantId: actor.tenantId,
        exerciceId: 'ex-1',
        transition: 'paiement:execute',
        sourceType: 'paiement',
        sourceId: 'pay-1',
        entityId: 'dep-1',
        projectedAmount: 100,
        availableCash: 5,
        outstandingDepenses: 10,
        remainingEngagements: 2,
        projectedExposure: 100,
        projectedGap: 95,
        nonReconciledOperations: 1,
        threshold: 60,
        correlationId: 'corr-1',
      },
    });

    query
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([{ id: 'exc-1' }]))
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([makeExceptionRow({ motif: 'urgence de liquidation', justification: 'texte', requested_by: actor.sub })]));

    const created = await service.create(actor, {
      exerciceId: 'ex-1',
      transition: 'paiement:execute',
      sourceType: 'paiement',
      sourceId: 'pay-1',
      entityId: 'dep-1',
      amount: 100,
      motif: 'urgence de liquidation',
      justification: 'texte',
      urgence: 'haute',
      expiresAt: '2030-01-01T00:00:00.000Z',
    });

    expect(created.id).toBe('exc-1');
    expect(created.status).toBe('soumise');
    expect(created.events).toEqual([]);
  });

  it('refuse une création si la transition nest pas bloquée', async () => {
    (cashRiskService.evaluate as jest.Mock).mockResolvedValue({
      decision: 'allow',
      reasons: [],
      snapshot: { correlationId: 'corr-1' },
    });

    await expect(
      service.create(actor, {
        exerciceId: 'ex-1',
        transition: 'paiement:execute',
        sourceType: 'paiement',
        sourceId: 'pay-1',
        entityId: 'dep-1',
        amount: 100,
        motif: 'urgence',
        justification: 'texte',
        urgence: 'normale',
        expiresAt: '2030-01-01T00:00:00.000Z',
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuse une création sans justification', async () => {
    await expect(
      service.create(actor, {
        exerciceId: 'ex-1',
        transition: 'paiement:execute',
        sourceType: 'paiement',
        sourceId: 'pay-1',
        entityId: 'dep-1',
        amount: 100,
        motif: 'urgence',
        justification: '   ',
        urgence: 'normale',
        expiresAt: '2030-01-01T00:00:00.000Z',
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejette un vote venant dun role non eligible', async () => {
    const readerOnly: AuthenticatedUser = {
      ...actor,
      roles: ['operateur_saisie'],
    };

    await expect(
      service.vote(readerOnly, 'exc-1', {
        exerciceId: 'ex-1',
        decision: 'approuver',
      })
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('bloque le double vote', async () => {
    query
      .mockResolvedValueOnce(makeResult([makeExceptionRow()]))
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([{ id: 'vote-1' }]));

    await expect(
      service.vote(actor, 'exc-1', {
        exerciceId: 'ex-1',
        decision: 'approuver',
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('renvoie QUORUM_INCOMPLET sur tentative de rejeu avec exception encore soumise', async () => {
    (cashRiskService.evaluate as jest.Mock).mockResolvedValue({
      decision: 'block',
      riskLevel: 'critical',
      riskScore: 99,
      reasons: ['blocked'],
      snapshot: {
        transition: 'paiement:execute',
        sourceType: 'paiement',
        correlationId: 'corr-1',
      },
    });

    query.mockResolvedValueOnce(makeResult([makeExceptionRow()]));

    await expect(
      service.assertTransitionAllowed(actor, {
        exerciceId: 'ex-1',
        transition: 'paiement:execute',
        sourceType: 'paiement',
        sourceId: 'pay-1',
        entityId: 'dep-1',
        amount: 50,
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('passe en approuvée quand le quorum est atteint après vote', async () => {
    query
      .mockResolvedValueOnce(makeResult([makeExceptionRow({ id: 'exc-2', correlation_id: 'corr-2' })]))
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([{ approvals: 2, approvals_from_others: 1, quorum_required: 2 }]))
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(
        makeResult([
          makeExceptionRow({
            id: 'exc-2',
            status: 'approuvee',
            correlation_id: 'corr-2',
            approved_at: '2026-03-07T10:10:00.000Z',
            decided_at: '2026-03-07T10:10:00.000Z',
            updated_at: '2026-03-07T10:10:00.000Z',
          }),
        ])
      )
      .mockResolvedValueOnce(
        makeResult([
          {
            id: 'vote-1',
            actor_user_id: actor.sub,
            actor_roles: actor.roles,
            decision: 'approuver',
            commentaire: null,
            created_at: '2026-03-07T10:05:00.000Z',
          },
        ])
      );

    const updated = await service.vote(actor, 'exc-2', {
      exerciceId: 'ex-1',
      decision: 'approuver',
    });

    expect(updated.status).toBe('approuvee');
  });

  it('autorise le vote du demandeur si un autre approbateur contribue aussi au quorum', async () => {
    query
      .mockResolvedValueOnce(
        makeResult([
          makeExceptionRow({
            id: 'exc-3',
            transition: 'engagement:validate',
            source_type: 'engagement',
            source_id: 'eng-1',
            entity_id: 'lb-1',
            correlation_id: 'corr-3',
            urgence: 'normale',
            requested_by: actor.sub,
          }),
        ])
      )
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([{ approvals: 2, approvals_from_others: 1, quorum_required: 2 }]))
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(
        makeResult([
          makeExceptionRow({
            id: 'exc-3',
            status: 'approuvee',
            transition: 'engagement:validate',
            source_type: 'engagement',
            source_id: 'eng-1',
            entity_id: 'lb-1',
            correlation_id: 'corr-3',
            urgence: 'normale',
            requested_by: actor.sub,
            approved_at: '2026-03-07T00:05:00.000Z',
            decided_at: '2026-03-07T00:05:00.000Z',
            updated_at: '2026-03-07T00:05:00.000Z',
          }),
        ])
      );

    const updated = await service.vote(actor, 'exc-3', {
      exerciceId: 'ex-1',
      decision: 'approuver',
    });

    expect(updated.status).toBe('approuvee');
  });

  it('refuse que le demandeur atteigne seul le quorum quand celui-ci vaut 1', async () => {
    query
      .mockResolvedValueOnce(
        makeResult([
          makeExceptionRow({
            id: 'exc-self',
            transition: 'engagement:validate',
            source_type: 'engagement',
            source_id: 'eng-1',
            entity_id: 'lb-1',
            correlation_id: 'corr-self',
            urgence: 'normale',
            requested_by: actor.sub,
            quorum_required: 1,
          }),
        ])
      )
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([{ approvals: 1, approvals_from_others: 0, quorum_required: 1 }]));

    await expect(
      service.vote(actor, 'exc-self', {
        exerciceId: 'ex-1',
        decision: 'approuver',
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('privilégie une exception approuvée active sur une demande plus récente du même scope', async () => {
    (cashRiskService.evaluate as jest.Mock).mockResolvedValue({
      decision: 'block',
      riskLevel: 'critical',
      riskScore: 91,
      reasons: ['blocked'],
      snapshot: {
        transition: 'paiement:execute',
        sourceType: 'paiement',
        correlationId: 'corr-same',
      },
    });

    query
      .mockResolvedValueOnce(
        makeResult([
          makeExceptionRow({
            id: 'exc-approved',
            status: 'approuvee',
            correlation_id: 'corr-same',
            approved_at: '2026-03-07T00:00:00.000Z',
            decided_at: '2026-03-07T00:00:00.000Z',
          }),
          makeExceptionRow({
            id: 'exc-submitted',
            status: 'soumise',
            correlation_id: 'corr-same',
            motif: 'submitted',
            justification: 'submitted',
            created_at: '2026-03-07T01:00:00.000Z',
            updated_at: '2026-03-07T01:00:00.000Z',
          }),
        ])
      )
      .mockResolvedValueOnce(makeResult([{ id: 'exc-approved' }], 1));

    const result = await service.assertTransitionAllowed(actor, {
      exerciceId: 'ex-1',
      transition: 'paiement:execute',
      sourceType: 'paiement',
      sourceId: 'pay-1',
      entityId: 'dep-1',
      amount: 100,
    });

    expect(result.decision).toBe('block');
    expect(query.mock.calls[0]?.[0]).toContain('CASE status');
    expect(query.mock.calls[0]?.[0]).toContain('correlation_id = $7');
  });

  it('expire automatiquement une exception approuvée hors fenêtre puis refuse l override', async () => {
    (cashRiskService.evaluate as jest.Mock).mockResolvedValue({
      decision: 'block',
      riskLevel: 'critical',
      riskScore: 90,
      reasons: ['blocked'],
      snapshot: {
        transition: 'paiement:execute',
        sourceType: 'paiement',
        correlationId: 'corr-exp',
      },
    });

    query
      .mockResolvedValueOnce(
        makeResult([
          makeExceptionRow({
            id: 'exc-exp',
            status: 'approuvee',
            correlation_id: 'corr-exp',
            expires_at: '2020-01-01T00:00:00.000Z',
            approved_at: '2026-03-07T00:00:00.000Z',
            decided_at: '2026-03-07T00:00:00.000Z',
          }),
        ])
      )
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([]));

    await expect(
      service.assertTransitionAllowed(actor, {
        exerciceId: 'ex-1',
        transition: 'paiement:execute',
        sourceType: 'paiement',
        sourceId: 'pay-1',
        entityId: 'dep-1',
        amount: 100,
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuse la consommation concurrente si déjà consommée entre-temps', async () => {
    (cashRiskService.evaluate as jest.Mock).mockResolvedValue({
      decision: 'block',
      riskLevel: 'critical',
      riskScore: 91,
      reasons: ['blocked'],
      snapshot: {
        transition: 'paiement:execute',
        sourceType: 'paiement',
        correlationId: 'corr-consume',
      },
    });

    query
      .mockResolvedValueOnce(
        makeResult([
          makeExceptionRow({
            id: 'exc-consume',
            status: 'approuvee',
            correlation_id: 'corr-consume',
            approved_at: '2026-03-07T00:00:00.000Z',
            decided_at: '2026-03-07T00:00:00.000Z',
          }),
        ])
      )
      .mockResolvedValueOnce(makeResult([], 0));

    await expect(
      service.assertTransitionAllowed(actor, {
        exerciceId: 'ex-1',
        transition: 'paiement:execute',
        sourceType: 'paiement',
        sourceId: 'pay-1',
        entityId: 'dep-1',
        amount: 100,
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('respecte l isolation tenant: sans exception du tenant courant, le blocage cash-risk est maintenu', async () => {
    (cashRiskService.evaluate as jest.Mock).mockResolvedValue({
      decision: 'block',
      riskLevel: 'critical',
      riskScore: 97,
      reasons: ['blocked'],
      snapshot: {
        transition: 'paiement:execute',
        sourceType: 'paiement',
        correlationId: 'corr-tenant',
      },
    });

    query.mockResolvedValueOnce(makeResult([]));

    await expect(
      service.assertTransitionAllowed(actor, {
        exerciceId: 'ex-1',
        transition: 'paiement:execute',
        sourceType: 'paiement',
        sourceId: 'pay-1',
        entityId: 'dep-1',
        amount: 100,
      })
    ).rejects.toBeInstanceOf(CashRiskBlockedException);
  });
});
