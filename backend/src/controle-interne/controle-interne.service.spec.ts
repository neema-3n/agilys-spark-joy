import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import type { PostgresService } from '../common/postgres.service';
import type { TresorerieService } from '../tresorerie/tresorerie.service';
import { ControleInterneService } from './controle-interne.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ControleInterneService', () => {
  const actor: AuthenticatedUser = {
    sub: 'user-1',
    tenantId: 'tenant-1',
    roles: ['auditeur'],
  };

  const basePlanRow = {
    id: 'plan-1',
    tenant_id: 'tenant-1',
    exercice_id: 'ex-2026',
    title: 'Résoudre écart',
    description: 'Traiter l exception',
    owner_user_id: 'owner-1',
    due_date: '2030-03-09T12:00:00.000Z',
    priority: 'haute',
    status: 'a_traiter',
    source_type: 'workflow_exception',
    source_id: 'exc-1',
    entity_id: null,
    exception_id: 'exc-1',
    correlation_id: 'corr-1',
    evidence_refs: [],
    rejection_reason: null,
    resolution_note: null,
    created_by: 'user-1',
    updated_by: 'user-1',
    created_at: '2026-03-09T10:00:00.000Z',
    updated_at: '2026-03-09T10:00:00.000Z',
  };

  const buildService = () => {
    const postgresMock = {
      query: jest.fn(),
      withTransaction: jest.fn(),
    } as unknown as PostgresService;

    const tresorerieMock = {
      getSupervision: jest.fn().mockResolvedValue({
        qualifiedDiscrepancies: 2,
        pendingReconciliations: 1,
        activeExceptions: 1,
        alerts: [
          {
            key: 'liquidity-gap',
            severity: 'critical',
            code: 'LIQUIDITY_GAP',
            label: 'Tension de liquidité',
            message: 'Gap détecté',
          },
        ],
        generatedAt: '2026-03-09T11:00:00.000Z',
      }),
      getExceptionAudit: jest.fn().mockResolvedValue({
        items: [
          {
            id: 'exc-1',
            severity: 'high',
            sourceType: 'paiement',
            sourceId: 'pay-1',
            correlationId: 'corr-1',
            motif: 'Exception paiement',
            justification: 'Besoin urgent',
            status: 'exception-approved',
            createdAt: '2026-03-09T09:00:00.000Z',
          },
        ],
      }),
    } as unknown as TresorerieService;

    return {
      service: new ControleInterneService(postgresMock, tresorerieMock),
      postgresMock,
      tresorerieMock,
    };
  };

  it('agrège le workspace de contrôle interne avec stratégie RBAC explicite', async () => {
    const { service, postgresMock } = buildService();
    (postgresMock.query as jest.Mock).mockResolvedValue({
      rows: [{ total_count: '4', overdue_count: '1' }],
    });

    const workspace = await service.getWorkspace(actor, 'ex-2026');

    expect(workspace.summary.openDiscrepancies).toBe(3);
    expect(workspace.summary.totalActionPlans).toBe(4);
    expect(workspace.roleStrategy.requiredPermission).toBe('referentiels:audit:read');
    expect(workspace.controlItems).toHaveLength(2);
  });

  it('crée un plan d action et journalise un événement append-only', async () => {
    const { service, postgresMock } = buildService();
    (postgresMock.withTransaction as jest.Mock).mockImplementation(async (callback) => {
      const executor = {
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [basePlanRow] })
          .mockResolvedValueOnce({ rows: [] }),
      };
      return callback(executor);
    });

    const created = await service.createActionPlan(actor, {
      exerciceId: 'ex-2026',
      title: 'Résoudre écart',
      description: 'Traiter l exception',
      ownerUserId: 'owner-1',
      dueDate: '2030-03-09T12:00:00.000Z',
      priority: 'haute',
      status: 'a_traiter',
      sourceType: 'workflow_exception',
      sourceId: 'exc-1',
      exceptionId: 'exc-1',
      correlationId: 'corr-1',
      evidenceRefs: [],
    });

    expect(created.id).toBe('plan-1');
    expect(created.status).toBe('a_traiter');
  });

  it('met à jour le statut et conserve l historique via événement status_changed', async () => {
    const { service, postgresMock } = buildService();
    (postgresMock.query as jest.Mock).mockResolvedValueOnce({ rows: [basePlanRow] });
    (postgresMock.withTransaction as jest.Mock).mockImplementation(async (callback) => {
      const executor = {
        query: jest
          .fn()
          .mockResolvedValueOnce({
            rows: [{
              ...basePlanRow,
              status: 'resolu',
              updated_at: '2026-03-09T12:00:00.000Z',
            }],
          })
          .mockResolvedValueOnce({ rows: [] }),
      };
      return callback(executor);
    });

    const updated = await service.updateActionPlan(actor, 'plan-1', 'ex-2026', {
      status: 'resolu',
      reason: 'preuve validée',
    });

    expect(updated.status).toBe('resolu');
  });

  it('refuse un passage au statut rejete sans motif de rejet', async () => {
    const { service } = buildService();

    await expect(
      service.updateActionPlan(actor, 'plan-1', 'ex-2026', {
        status: 'rejete',
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('retourne les événements historisés d un plan scope tenant/exercice', async () => {
    const { service, postgresMock } = buildService();
    (postgresMock.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ id: 'plan-1' }], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'evt-1',
            action_plan_id: 'plan-1',
            tenant_id: 'tenant-1',
            exercice_id: 'ex-2026',
            event_type: 'status_changed',
            changed_by: 'user-1',
            reason: 'preuve validée',
            payload: { after: { status: 'resolu' } },
            created_at: '2026-03-09T12:00:00.000Z',
          },
        ],
      });

    const events = await service.listActionPlanEvents(actor, 'plan-1', 'ex-2026');

    expect(events.items).toHaveLength(1);
    expect(events.items[0]?.eventType).toBe('status_changed');
  });

  it('rejette la consultation d historique hors tenant/exercice', async () => {
    const { service, postgresMock } = buildService();
    (postgresMock.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await expect(service.listActionPlanEvents(actor, 'plan-unknown', 'ex-2026')).rejects.toBeInstanceOf(
      NotFoundException
    );
  });
});
