import type { QueryResult, QueryResultRow } from 'pg';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import type { AuthorizationAuditService } from '../auth/authorization-audit.service';
import type { PostgresService } from '../common/postgres.service';
import { ReportingFournisseursService } from './reporting-fournisseurs.service';

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

describe('ReportingFournisseursService', () => {
  const query = jest.fn();
  const postgresService = { query } as unknown as PostgresService;
  const auditLogDecision = jest.fn();
  const authorizationAuditService = {
    logDecision: auditLogDecision
  } as unknown as AuthorizationAuditService;

  const service = new ReportingFournisseursService(postgresService, authorizationAuditService);

  beforeEach(() => {
    query.mockReset();
    auditLogDecision.mockReset();
  });

  it('construit l etat dettes fournisseurs avec aging, reste a payer et regularisation', async () => {
    query.mockResolvedValueOnce(
      makeResult([
        {
          facture_id: 'fac-1',
          facture_numero: 'FAC-001',
          facture_date: '2026-03-01',
          date_echeance: '2026-03-05',
          facture_statut: 'validee',
          fournisseur_id: 'fr-1',
          fournisseur_code: 'FRN-001',
          fournisseur_nom: 'Fournisseur A',
          montant_ttc: 1000,
          total_liquide: 400,
          total_paye: 250,
          dernier_paiement: '2026-03-06',
          paiements_count: 2,
          ecritures_count: 1
        },
        {
          facture_id: 'fac-2',
          facture_numero: 'FAC-002',
          facture_date: '2026-03-10',
          date_echeance: '2026-03-10',
          facture_statut: 'validee',
          fournisseur_id: 'fr-2',
          fournisseur_code: 'FRN-002',
          fournisseur_nom: 'Fournisseur B',
          montant_ttc: 500,
          total_liquide: 500,
          total_paye: 500,
          dernier_paiement: '2026-03-11',
          paiements_count: 1,
          ecritures_count: 2
        }
      ])
    );

    const result = await service.getEtatDettesFournisseurs(actor, {
      periode: '2026-03'
    });

    expect(result.view).toBe('etat-dettes-fournisseurs');
    expect(result.summary.count).toBe(2);
    expect(result.summary.totalMontant).toBe(1500);
    expect(result.summary.totalResteOuEcart).toBe(750);
    expect(result.rows[0]?.agingBucket).toBe('J0-30');
    expect(result.rows[0]?.resteAPayer).toBe(750);
    expect(result.rows[0]?.statutRegularisation).toBe('partielle');
    expect(result.rows[1]?.statutRegularisation).toBe('regularisee');
  });

  it('filtre l etat dettes fournisseurs par agingBucket', async () => {
    query.mockResolvedValueOnce(
      makeResult([
        {
          facture_id: 'fac-1',
          facture_numero: 'FAC-001',
          facture_date: '2026-03-01',
          date_echeance: '2026-02-01',
          facture_statut: 'validee',
          fournisseur_id: 'fr-1',
          fournisseur_code: 'FRN-001',
          fournisseur_nom: 'Fournisseur A',
          montant_ttc: 1000,
          total_liquide: 100,
          total_paye: 0,
          dernier_paiement: null,
          paiements_count: 0,
          ecritures_count: 1
        },
        {
          facture_id: 'fac-2',
          facture_numero: 'FAC-002',
          facture_date: '2026-03-28',
          date_echeance: '2026-03-28',
          facture_statut: 'validee',
          fournisseur_id: 'fr-2',
          fournisseur_code: 'FRN-002',
          fournisseur_nom: 'Fournisseur B',
          montant_ttc: 500,
          total_liquide: 0,
          total_paye: 0,
          dernier_paiement: null,
          paiements_count: 0,
          ecritures_count: 0
        }
      ])
    );

    const result = await service.getEtatDettesFournisseurs(actor, {
      periode: '2026-03',
      agingBucket: 'J0-30'
    });

    expect(result.summary.count).toBe(1);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.factureId).toBe('fac-2');
  });

  it('construit l etat avances regularisations agrege par fournisseur', async () => {
    query.mockResolvedValueOnce(
      makeResult([
        {
          depense_id: 'dep-1',
          depense_numero: 'DEP-001',
          depense_date: '2026-03-05',
          depense_statut: 'ordonnancee',
          fournisseur_id: 'fr-1',
          fournisseur_code: 'FRN-001',
          fournisseur_nom: 'Fournisseur A',
          avance_initiale: 1000,
          consommation: 750,
          ecritures_count: 2
        },
        {
          depense_id: 'dep-2',
          depense_numero: 'DEP-002',
          depense_date: '2026-03-15',
          depense_statut: 'ordonnancee',
          fournisseur_id: 'fr-1',
          fournisseur_code: 'FRN-001',
          fournisseur_nom: 'Fournisseur A',
          avance_initiale: 500,
          consommation: 600,
          ecritures_count: 1
        }
      ])
    );

    const result = await service.getEtatAvancesRegularisations(actor, {
      periode: '2026-03'
    });

    expect(result.view).toBe('etat-avances-regularisations');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      fournisseurId: 'fr-1',
      avanceInitiale: 1500,
      consommation: 1350,
      ecart: 150,
      statutRegularisation: 'a-regulariser',
      depensesCount: 2,
      ecrituresAssociees: 3
    });
  });

  it('scope les requetes SQL avec tenantId', async () => {
    query.mockResolvedValueOnce(makeResult([]));

    await service.getEtatDettesFournisseurs(actor, {
      periode: '2026-03'
    });

    expect(query).toHaveBeenCalled();
    expect(query.mock.calls[0]?.[1]?.[0]).toBe(actor.tenantId);
  });

  it('evite le double comptage des paiements en repartissant par depense facture', async () => {
    query.mockResolvedValueOnce(makeResult([]));

    await service.getEtatDettesFournisseurs(actor, {
      periode: '2026-03'
    });

    const sql = String(query.mock.calls[0]?.[0] ?? '');
    expect(sql).toContain('paiements_depenses');
    expect(sql).toContain('pd.total_paye_depense * (df.montant / dt.total_liquide_depense)');
  });

  it('rejette une periode invalide', async () => {
    await expect(
      service.getEtatDettesFournisseurs(actor, {
        periode: '03-2026'
      })
    ).rejects.toThrow('Periode invalide');
  });

  it('gere le cycle export asynchrone xlsx et journalise les actions', async () => {
    query.mockResolvedValueOnce(makeResult([]));

    const started = await service.startExport(actor, {
      periode: '2026-03',
      view: 'etat-dettes-fournisseurs',
      format: 'xlsx'
    });

    expect(started.exportId).toBeDefined();

    await new Promise((resolve) => setTimeout(resolve, 350));

    const status = service.getExportStatus(actor, started.exportId);
    expect(status.status).toBe('completed');
    expect(status.downloadUrl).toContain(`/reporting-fournisseurs/exports/${started.exportId}/download`);

    const token = new URL(`http://localhost${status.downloadUrl ?? ''}`).searchParams.get('token');
    expect(token).toBeTruthy();

    const file = service.downloadExport(actor, started.exportId, token ?? '');
    expect(file.filename.endsWith('.xlsx')).toBe(true);
    expect(file.content.subarray(0, 2).toString('utf-8')).toBe('PK');
    expect(file.content.length).toBeGreaterThan(0);
    expect(auditLogDecision).toHaveBeenCalledTimes(2);
  });

  it('genere un fichier pdf valide', async () => {
    query.mockResolvedValueOnce(makeResult([]));

    const started = await service.startExport(actor, {
      periode: '2026-03',
      view: 'etat-avances-regularisations',
      format: 'pdf'
    });

    await new Promise((resolve) => setTimeout(resolve, 350));
    const status = service.getExportStatus(actor, started.exportId);
    const token = new URL(`http://localhost${status.downloadUrl ?? ''}`).searchParams.get('token');
    const file = service.downloadExport(actor, started.exportId, token ?? '');

    expect(file.filename.endsWith('.pdf')).toBe(true);
    expect(file.content.subarray(0, 5).toString('utf-8')).toBe('%PDF-');
  });

  it('refuse le telechargement export pour un autre tenant utilisateur', async () => {
    query.mockResolvedValueOnce(makeResult([]));

    const started = await service.startExport(actor, {
      periode: '2026-03',
      view: 'etat-dettes-fournisseurs',
      format: 'csv'
    });

    expect(() => service.getExportStatus(actorOther, started.exportId)).toThrow('Export introuvable pour ce tenant');
  });
});
