import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { QueryResult, QueryResultRow } from 'pg';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import type { PostgresService } from '../common/postgres.service';
import { TresorerieService } from './tresorerie.service';

const actor: AuthenticatedUser = {
  sub: 'user-1',
  tenantId: 'tenant-1',
  roles: ['directeur_financier'],
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

describe('TresorerieService', () => {
  const query = jest.fn();
  const postgresService = { query } as unknown as PostgresService;
  const service = new TresorerieService(postgresService);

  beforeEach(() => {
    query.mockReset();
  });

  it('calcule un read model supervision déterministe avec alertes', async () => {
    query
      .mockResolvedValueOnce(
        makeResult([
          {
            available_cash: 1000,
            pending_disbursements: 650,
            pending_disbursements_count: 2,
            remaining_engagements: 180,
            remaining_engagements_count: 1,
            non_reconciled_operations: 4,
          },
        ])
      )
      .mockResolvedValueOnce(
        makeResult([
          {
            active_exceptions: 2,
            expired_exceptions: 1,
            consumed_exceptions: 3,
          },
        ])
      );

    const result = await service.getSupervision(actor, 'ex-1');

    expect(result.currentPosition).toBe(1000);
    expect(result.projectedExposure).toBe(830);
    expect(result.shortTermProjection).toBe(170);
    expect(result.alerts.map((item) => item.code)).toEqual(
      expect.arrayContaining(['NON_RECONCILED_OPERATIONS', 'ACTIVE_EXCEPTIONS', 'EXPIRED_EXCEPTIONS'])
    );
    expect(query).toHaveBeenCalledWith(expect.any(String), [actor.tenantId, 'ex-1']);
  });

  it('retourne un journal d audit paginé et filtré', async () => {
    query.mockResolvedValueOnce(
      makeResult([
        {
          id: 'ex-1',
          exercice_id: 'exercice-1',
          status: 'approuvee',
          transition: 'engagement:validate',
          source_type: 'engagement',
          source_id: 'eng-1',
          entity_id: 'lb-1',
          correlation_id: 'corr-1',
          motif: 'Risque temporaire',
          justification: 'Fenêtre critique',
          quorum_required: 2,
          expires_at: '2026-03-08T10:00:00.000Z',
          requested_by: 'requester-1',
          approved_at: '2026-03-07T10:00:00.000Z',
          decided_at: '2026-03-07T10:00:00.000Z',
          consumed_at: null,
          consumed_by: null,
          consumed_transition: null,
          risk_decision: {
            riskLevel: 'high',
            riskScore: 77,
            decision: 'block',
            reasons: ['gap'],
            snapshot: {
              tenantId: actor.tenantId,
              exerciceId: 'exercice-1',
              transition: 'engagement:validate',
              sourceType: 'engagement',
              projectedAmount: 300,
              availableCash: 1000,
              outstandingDepenses: 450,
              remainingEngagements: 300,
              projectedExposure: 1050,
              projectedGap: 50,
              nonReconciledOperations: 3,
              threshold: 68,
              correlationId: 'corr-1',
            },
          },
          created_at: '2026-03-07T09:00:00.000Z',
          updated_at: '2026-03-07T10:00:00.000Z',
          approvers_json: [
            {
              actorUserId: 'approver-1',
              decision: 'approuver',
              commentaire: 'ok',
              createdAt: '2026-03-07T10:00:00.000Z',
            },
          ],
          total_count: 1,
        },
      ])
    );

    const result = await service.getExceptionAudit(actor, {
      exerciceId: 'exercice-1',
      page: 1,
      pageSize: 10,
      status: 'exception-approved',
      transition: 'engagement:validate',
      severity: 'high',
      decision: 'block',
    });

    expect(result.pagination.total).toBe(1);
    expect(result.items[0]?.status).toBe('exception-approved');
    expect(result.items[0]?.approvers.length).toBe(1);
    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("CASE\n           WHEN e.status = 'soumise'"),
      expect.arrayContaining([actor.tenantId, 'exercice-1', 'engagement:validate', 'block', 'high', 'exception-approved'])
    );
  });

  it('fournit le détail d une entrée d audit via correlationId', async () => {
    query
      .mockResolvedValueOnce(
        makeResult([
          {
            id: 'exception-1',
            exercice_id: 'ex-1',
            status: 'consommee',
            transition: 'paiement:execute',
            source_type: 'paiement',
            source_id: 'pay-1',
            entity_id: 'dep-1',
            correlation_id: 'corr-detail',
            motif: 'Urgence',
            justification: 'Paiement critique',
            quorum_required: 2,
            expires_at: '2026-03-08T10:00:00.000Z',
            requested_by: 'requester-1',
            approved_at: '2026-03-07T11:00:00.000Z',
            decided_at: '2026-03-07T11:00:00.000Z',
            consumed_at: '2026-03-07T12:00:00.000Z',
            consumed_by: 'user-2',
            consumed_transition: 'paiement:execute',
            risk_decision: {
              riskLevel: 'critical',
              riskScore: 88,
              decision: 'block',
              reasons: ['gap'],
              snapshot: {
                tenantId: actor.tenantId,
                exerciceId: 'ex-1',
                transition: 'paiement:execute',
                sourceType: 'paiement',
                projectedAmount: 150,
                availableCash: 100,
                outstandingDepenses: 250,
                remainingEngagements: 90,
                projectedExposure: 490,
                projectedGap: 390,
                nonReconciledOperations: 2,
                threshold: 60,
                correlationId: 'corr-detail',
              },
            },
            created_at: '2026-03-07T10:00:00.000Z',
            updated_at: '2026-03-07T12:00:00.000Z',
            approvers_json: [],
            total_count: 1,
          },
        ])
      )
      .mockResolvedValueOnce(
        makeResult([
          {
            id: 'evt-1',
            actor_user_id: 'actor-1',
            actor_roles: ['directeur_financier'],
            event_type: 'soumise',
            payload: { commentaire: 'init' },
            created_at: '2026-03-07T10:00:00.000Z',
          },
        ])
      )
      .mockResolvedValueOnce(
        makeResult([
          {
            id: 'vote-1',
            actor_user_id: 'actor-2',
            actor_roles: ['comptable'],
            decision: 'approuver',
            commentaire: 'go',
            created_at: '2026-03-07T11:00:00.000Z',
          },
        ])
      );

    const detail = await service.getExceptionAuditDetail(actor, {
      exerciceId: 'ex-1',
      correlationId: 'corr-detail',
    });

    expect(detail.status).toBe('executed-under-exception');
    expect(detail.events).toHaveLength(1);
    expect(detail.votes).toHaveLength(1);
  });

  it('rejette une requête détail sans identifiant', async () => {
    await expect(
      service.getExceptionAuditDetail(actor, {
        exerciceId: 'ex-1',
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('renvoie NotFound quand le détail audit est absent', async () => {
    query.mockResolvedValueOnce(makeResult([]));

    await expect(
      service.getExceptionAuditDetail(actor, {
        exerciceId: 'ex-1',
        exceptionId: 'missing',
      })
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('prépare un payload d export audit sans exécuter un export complet', async () => {
    query.mockResolvedValueOnce(
      makeResult([
        {
          id: 'ex-2',
          exercice_id: 'ex-1',
          status: 'soumise',
          transition: 'engagement:create',
          source_type: 'engagement',
          source_id: 'eng-2',
          entity_id: null,
          correlation_id: 'corr-exp',
          motif: 'Urgence budgétaire',
          justification: 'Risque de blocage',
          quorum_required: 2,
          expires_at: '2026-03-09T10:00:00.000Z',
          requested_by: 'requester-2',
          approved_at: null,
          decided_at: null,
          consumed_at: null,
          consumed_by: null,
          consumed_transition: null,
          risk_decision: {
            riskLevel: 'medium',
            riskScore: 52,
            decision: 'block',
            reasons: ['reason'],
            snapshot: {
              tenantId: actor.tenantId,
              exerciceId: 'ex-1',
              transition: 'engagement:create',
              sourceType: 'engagement',
              projectedAmount: 300,
              availableCash: 400,
              outstandingDepenses: 250,
              remainingEngagements: 90,
              projectedExposure: 640,
              projectedGap: 240,
              nonReconciledOperations: 1,
              threshold: 70,
              correlationId: 'corr-exp',
            },
          },
          created_at: '2026-03-07T09:00:00.000Z',
          updated_at: '2026-03-07T09:10:00.000Z',
          approvers_json: [],
          total_count: 1,
        },
      ])
    );

    const payload = await service.getExceptionAuditExportPrep(actor, {
      exerciceId: 'ex-1',
      page: 1,
      pageSize: 20,
    });

    expect(payload.totalEntries).toBe(1);
    expect(payload.preview[0]?.status).toBe('exception-requested');
    expect(payload.fields).toEqual(expect.arrayContaining(['id', 'correlationId', 'createdAt']));
  });
});
