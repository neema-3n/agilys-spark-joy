import type { QueryResult, QueryResultRow } from 'pg';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import type { AuthorizationAuditService } from '../auth/authorization-audit.service';
import type { PostgresService } from '../common/postgres.service';
import { ReportingExecutionTresorerieService } from './reporting-execution-tresorerie.service';

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

describe('ReportingExecutionTresorerieService', () => {
  const query = jest.fn();
  const postgresService = { query } as unknown as PostgresService;
  const auditLogDecision = jest.fn();
  const authorizationAuditService = {
    logDecision: auditLogDecision
  } as unknown as AuthorizationAuditService;

  const service = new ReportingExecutionTresorerieService(postgresService, authorizationAuditService);

  beforeEach(() => {
    query.mockReset();
    auditLogDecision.mockReset();
  });

  it('construit la vue execution budgetaire avec ecart et alerte seuil', async () => {
    query.mockResolvedValueOnce(
      makeResult([
        {
          ligne_id: 'lb-1',
          ligne_libelle: 'Ligne Fonctionnement',
          section_code: 'SEC-01',
          section_libelle: 'Section 1',
          programme_code: 'PRG-01',
          programme_libelle: 'Programme 1',
          action_id: 'act-1',
          action_code: 'ACT-01',
          action_libelle: 'Action 1',
          montant_initial: 1000,
          montant_modifie: 1500,
          montant_engage: 1200,
          montant_paye: 600,
          disponible: 900
        }
      ])
    );

    const result = await service.getExecutionBudgetaire(actor, {
      exerciceId: '11111111-1111-4111-8111-111111111111',
      periode: '2026-03',
      seuil: 500
    });

    expect(result.view).toBe('execution-budgetaire');
    expect(result.summary.totalBudgetModifie).toBe(1500);
    expect(result.summary.totalPaye).toBe(600);
    expect(result.summary.totalEcart).toBe(900);
    expect(result.summary.totalAlertes).toBe(1);
    expect(result.rows[0]?.alerteSeuil).toBe(true);
  });

  it('construit la vue tresorerie avec journal, paiements et rapprochements', async () => {
    query
      .mockResolvedValueOnce(
        makeResult([
          {
            id: 'op-1',
            numero: 'OPE000001',
            date_operation: '2026-03-01',
            type_operation: 'decaissement',
            libelle: 'Paiement fournisseur A',
            reference_bancaire: 'REF-1',
            compte_code: '5121',
            compte_libelle: 'Banque A',
            montant: 500,
            statut: 'validee',
            rapproche: false
          }
        ])
      )
      .mockResolvedValueOnce(
        makeResult([
          {
            compte_id: 'ct-1',
            compte_code: '5121',
            compte_libelle: 'Banque A',
            solde_actuel: 2000,
            total_encaissements: 0,
            total_decaissements: 500,
            total_transferts: 0
          }
        ])
      )
      .mockResolvedValueOnce(
        makeResult([
          {
            date_depense: '2026-03-10',
            montant: 400,
            montant_paye: 100
          }
        ])
      )
      .mockResolvedValueOnce(
        makeResult([
          {
            statut: 'execute',
            count: 2,
            montant: 500
          }
        ])
      )
      .mockResolvedValueOnce(
        makeResult([
          {
            statut_detaille: 'a_traiter',
            count: 1,
            ecart_total: 40
          }
        ])
      );

    const result = await service.getTresorerie(actor, {
      exerciceId: '11111111-1111-4111-8111-111111111111',
      periode: '2026-03',
      seuil: 200
    });

    expect(result.view).toBe('tresorerie');
    expect(result.journalFlux).toHaveLength(1);
    expect(result.situationComptes).toHaveLength(1);
    expect(result.previsions).toHaveLength(1);
    expect(result.etatPaiements).toHaveLength(1);
    expect(result.etatRapprochements).toHaveLength(1);
    expect(result.summary.totalFlux).toBe(1);
  });

  it('applique les filtres entite/axe dans la requete etat rapprochements', async () => {
    query
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([]));

    await service.getTresorerie(actor, {
      exerciceId: '11111111-1111-4111-8111-111111111111',
      periode: '2026-03',
      entite: '22222222-2222-4222-8222-222222222222',
      axeAnalytique: '33333333-3333-4333-8333-333333333333'
    });

    const rapprochementCall = query.mock.calls[4];
    expect(rapprochementCall).toBeDefined();
    const sql = (rapprochementCall?.[0] as string) || '';
    const params = (rapprochementCall?.[1] as unknown[]) || [];

    expect(sql).toContain('EXISTS (');
    expect(sql).toContain('d.projet_id = $5');
    expect(sql).toContain('lb.action_id = $6');
    expect(params[4]).toBe('22222222-2222-4222-8222-222222222222');
    expect(params[5]).toBe('33333333-3333-4333-8333-333333333333');
  });

  it('scope les requetes SQL avec tenantId', async () => {
    query.mockResolvedValueOnce(makeResult([]));

    await service.getExecutionBudgetaire(actor, {
      exerciceId: '11111111-1111-4111-8111-111111111111',
      periode: '2026-03'
    });

    expect(query).toHaveBeenCalled();
    expect(query.mock.calls[0]?.[1]?.[0]).toBe(actor.tenantId);
  });

  it('rejette une periode invalide', async () => {
    await expect(
      service.getExecutionBudgetaire(actor, {
        exerciceId: '11111111-1111-4111-8111-111111111111',
        periode: '03-2026'
      })
    ).rejects.toThrow('Periode invalide');
  });

  it('gere le cycle export asynchrone xlsx', async () => {
    query.mockResolvedValueOnce(makeResult([]));

    const started = await service.startExport(actor, {
      exerciceId: '11111111-1111-4111-8111-111111111111',
      periode: '2026-03',
      view: 'execution-budgetaire',
      format: 'xlsx'
    });

    expect(started.exportId).toBeDefined();

    const status = service.getExportStatus(actor, started.exportId);
    expect(status.status).toBe('completed');
    expect(status.downloadUrl).toContain(`/reporting-execution-tresorerie/exports/${started.exportId}/download`);

    const token = new URL(`http://localhost${status.downloadUrl ?? ''}`).searchParams.get('token');
    expect(token).toBeTruthy();

    const file = service.downloadExport(actor, started.exportId, token ?? '');
    expect(file.filename.endsWith('.xlsx')).toBe(true);
    expect(file.content.length).toBeGreaterThan(0);
    expect(auditLogDecision).toHaveBeenCalledTimes(2);
  });

  it('genere un fichier pdf', async () => {
    query
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([]));

    const started = await service.startExport(actor, {
      exerciceId: '11111111-1111-4111-8111-111111111111',
      periode: '2026-03',
      view: 'tresorerie',
      format: 'pdf'
    });

    const status = service.getExportStatus(actor, started.exportId);
    const token = new URL(`http://localhost${status.downloadUrl ?? ''}`).searchParams.get('token');
    const file = service.downloadExport(actor, started.exportId, token ?? '');

    expect(file.filename.endsWith('.pdf')).toBe(true);
    expect(file.content.toString('utf-8')).toContain('Tresorerie operationnelle');
  });

  it('propage correlationId dans le log de telechargement export', async () => {
    const loggerSpy = jest.spyOn((service as unknown as { logger: { log: (message: string) => void } }).logger, 'log');
    query.mockResolvedValueOnce(makeResult([]));

    const started = await service.startExport(actor, {
      exerciceId: '11111111-1111-4111-8111-111111111111',
      periode: '2026-03',
      view: 'execution-budgetaire',
      format: 'csv',
      correlationId: 'corr-9-3'
    });

    const status = service.getExportStatus(actor, started.exportId);
    const token = new URL(`http://localhost${status.downloadUrl ?? ''}`).searchParams.get('token');
    service.downloadExport(actor, started.exportId, token ?? '');

    const downloadLogCall = loggerSpy.mock.calls
      .map(([message]) => String(message))
      .find((message) => message.includes('reporting_execution_tresorerie_export_downloaded'));
    expect(downloadLogCall).toContain('"correlationId":"corr-9-3"');

    loggerSpy.mockRestore();
  });

  it('refuse le telechargement export pour un autre tenant utilisateur', async () => {
    query.mockResolvedValueOnce(makeResult([]));

    const started = await service.startExport(actor, {
      exerciceId: '11111111-1111-4111-8111-111111111111',
      periode: '2026-03',
      view: 'execution-budgetaire',
      format: 'csv'
    });

    expect(() => service.getExportStatus(actorOther, started.exportId)).toThrow('Export introuvable pour ce tenant');
  });
});
