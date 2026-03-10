import type { QueryResult, QueryResultRow } from 'pg';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import type { AuthorizationAuditService } from '../auth/authorization-audit.service';
import type { PostgresService } from '../common/postgres.service';
import { ReportingAnalytiqueService } from './reporting-analytique.service';

const actor: AuthenticatedUser = {
  sub: 'user-1',
  tenantId: 'tenant-1',
  roles: ['comptable']
};

const actorOther: AuthenticatedUser = {
  sub: 'user-2',
  tenantId: 'tenant-2',
  roles: ['comptable']
};

const makeResult = <T extends QueryResultRow>(rows: T[], rowCount = rows.length): QueryResult<T> =>
  ({
    rows,
    rowCount,
    command: 'SELECT',
    oid: 0,
    fields: []
  }) as QueryResult<T>;

describe('ReportingAnalytiqueService', () => {
  const query = jest.fn();
  const postgresService = { query } as unknown as PostgresService;
  const auditLogDecision = jest.fn();
  const authorizationAuditService = { logDecision: auditLogDecision } as unknown as AuthorizationAuditService;

  const service = new ReportingAnalytiqueService(postgresService, authorizationAuditService);

  beforeEach(() => {
    query.mockReset();
    auditLogDecision.mockReset();
  });

  it('construit un tableau croise multi-dimensions avec agrégations correctes', async () => {
    query.mockResolvedValueOnce(
      makeResult([
        {
          depense_id: 'dep-1',
          date_depense: '2026-03-01',
          projet_id: 'prj-1',
          projet_code: 'PRJ-001',
          projet_nom: 'Projet A',
          section_code: 'SEC-1',
          programme_code: 'PRG-1',
          action_id: 'act-1',
          action_code: 'ACT-1',
          fournisseur_id: 'fr-1',
          fournisseur_code: 'F-001',
          fournisseur_nom: 'Fournisseur A',
          depense_statut: 'ordonnancee',
          montant_budget_modifie: 1000,
          montant_engage: 500,
          montant_paye_ligne: 100,
          montant_depense: 450,
          montant_paye_depense: 200
        },
        {
          depense_id: 'dep-2',
          date_depense: '2026-03-15',
          projet_id: 'prj-1',
          projet_code: 'PRJ-001',
          projet_nom: 'Projet A',
          section_code: 'SEC-1',
          programme_code: 'PRG-1',
          action_id: 'act-2',
          action_code: 'ACT-2',
          fournisseur_id: 'fr-2',
          fournisseur_code: 'F-002',
          fournisseur_nom: 'Fournisseur B',
          depense_statut: 'validee',
          montant_budget_modifie: 1200,
          montant_engage: 800,
          montant_paye_ligne: 200,
          montant_depense: 600,
          montant_paye_depense: 300
        }
      ])
    );

    const result = await service.getTableauCroise(actor, {
      exerciceId: '11111111-1111-4111-8111-111111111111',
      periode: '2026-03',
      rowDimension: 'axe-analytique',
      columnDimension: 'fournisseur',
      measure: 'montant-depense'
    });

    expect(result.view).toBe('tableau-croise');
    expect(result.summary.grandTotal).toBe(1050);
    expect(result.summary.totalRows).toBe(2);
    expect(result.summary.totalColumns).toBe(2);
  });

  it('scope les requetes SQL avec tenantId', async () => {
    query.mockResolvedValueOnce(makeResult([]));

    await service.getTableauCroise(actor, {
      exerciceId: '11111111-1111-4111-8111-111111111111',
      periode: '2026-03'
    });

    expect(query).toHaveBeenCalled();
    expect(query.mock.calls[0]?.[1]?.[0]).toBe(actor.tenantId);
  });

  it('evite doubles comptages via agrégat paiements par depense', async () => {
    query.mockResolvedValueOnce(makeResult([]));

    await service.getTableauCroise(actor, {
      exerciceId: '11111111-1111-4111-8111-111111111111',
      periode: '2026-03'
    });

    const sql = String(query.mock.calls[0]?.[0] ?? '');
    expect(sql).toContain('WITH paiements_agg AS');
    expect(sql).toContain('GROUP BY p.depense_id');
  });

  it('rejette une periode invalide', async () => {
    await expect(
      service.getTableauCroise(actor, {
        exerciceId: '11111111-1111-4111-8111-111111111111',
        periode: '03-2026'
      })
    ).rejects.toThrow('Periode invalide');
  });

  it('calcule les percentiles cycle-time, tendances et alertes', async () => {
    query.mockResolvedValueOnce(
      makeResult([
        { stage: 'reservation-engagement', duration_hours: 24, period_key: '2026-02' },
        { stage: 'reservation-engagement', duration_hours: 48, period_key: '2026-03' },
        { stage: 'reservation-engagement', duration_hours: 72, period_key: '2026-03' },
        { stage: 'depense-paiement', duration_hours: 96, period_key: '2026-03' }
      ])
    );

    const result = await service.getCycleTimeMetrics(actor, {
      exerciceId: '11111111-1111-4111-8111-111111111111',
      periode: '2026-03-01:2026-03-31',
      seuilReservationEngagementHeures: 40,
      seuilVariationPct: 10
    });

    expect(result.view).toBe('cycle-time');
    const reservationMetric = result.metrics.find((metric) => metric.stage === 'reservation-engagement');
    expect(reservationMetric).toBeDefined();
    expect(reservationMetric?.p50).toBe(48);
    expect(reservationMetric?.p95).toBe(69.6);
    expect(reservationMetric?.alert.active).toBe(true);
    expect(result.alerts.length).toBeGreaterThan(0);
  });

  it('isole cycle-time par tenant et etape demandee', async () => {
    query.mockResolvedValueOnce(makeResult([]));

    await service.getCycleTimeMetrics(actor, {
      exerciceId: '11111111-1111-4111-8111-111111111111',
      periode: '2026-03',
      etape: 'depense-paiement'
    });

    expect(query).toHaveBeenCalled();
    const sql = String(query.mock.calls[0]?.[0] ?? '');
    const values = query.mock.calls[0]?.[1] as unknown[];
    expect(sql).toContain('FROM public.paiements p');
    expect(sql).toContain('MAX(p.date_paiement) AS date_paiement');
    expect(sql).not.toContain('MIN(p.date_paiement)::date');
    expect(values[0]).toBe(actor.tenantId);
    expect(values[values.length - 1]).toBe('depense-paiement');
  });

  it('retourne des metriques nulles quand aucune transition ne correspond', async () => {
    query.mockResolvedValueOnce(makeResult([]));

    const result = await service.getCycleTimeMetrics(actor, {
      exerciceId: '11111111-1111-4111-8111-111111111111',
      periode: '2026-03',
      etape: 'depense-paiement'
    });

    expect(result.metrics).toHaveLength(1);
    expect(result.metrics[0]?.stage).toBe('depense-paiement');
    expect(result.metrics[0]?.p50).toBe(0);
    expect(result.metrics[0]?.p95).toBe(0);
    expect(result.metrics[0]?.volume).toBe(0);
    expect(result.metrics[0]?.alert.active).toBe(false);
    expect(result.alerts).toHaveLength(0);
  });

  it('gere le cycle export csv', async () => {
    query.mockResolvedValueOnce(makeResult([]));

    const started = await service.startExport(actor, {
      exerciceId: '11111111-1111-4111-8111-111111111111',
      periode: '2026-03',
      view: 'tableau-croise',
      format: 'csv'
    });

    expect(started.exportId).toBeDefined();

    const status = service.getExportStatus(actor, started.exportId);
    expect(status.status).toBe('completed');
    expect(status.downloadUrl).toContain(`/reporting-analytique/exports/${started.exportId}/download`);

    const token = new URL(`http://localhost${status.downloadUrl}`).searchParams.get('token');
    expect(token).toBeTruthy();

    const file = service.downloadExport(actor, started.exportId, token ?? '');
    expect(file.filename.endsWith('.csv')).toBe(true);
    expect(file.content.toString('utf-8')).toContain('rowKey');
    expect(auditLogDecision).toHaveBeenCalledTimes(2);
  });

  it('refuse le telechargement export pour un autre tenant utilisateur', async () => {
    query.mockResolvedValueOnce(makeResult([]));

    const started = await service.startExport(actor, {
      exerciceId: '11111111-1111-4111-8111-111111111111',
      periode: '2026-03',
      view: 'dashboard',
      format: 'pdf'
    });

    expect(() => service.getExportStatus(actorOther, started.exportId)).toThrow('Export introuvable pour ce tenant');
  });
});
