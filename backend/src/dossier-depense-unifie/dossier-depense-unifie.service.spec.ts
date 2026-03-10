import type { QueryResult, QueryResultRow } from 'pg';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import type { AuthorizationAuditService } from '../auth/authorization-audit.service';
import type { PostgresService } from '../common/postgres.service';
import { DossierDepenseUnifieService } from './dossier-depense-unifie.service';

const actor: AuthenticatedUser = {
  sub: 'user-audit-1',
  tenantId: 'tenant-1',
  roles: ['auditeur']
};

const makeResult = <T extends QueryResultRow>(rows: T[], rowCount = rows.length): QueryResult<T> =>
  ({
    rows,
    rowCount,
    command: 'SELECT',
    oid: 0,
    fields: []
  }) as QueryResult<T>;

describe('DossierDepenseUnifieService', () => {
  const query = jest.fn();
  const postgresService = { query } as unknown as PostgresService;
  const logDecision = jest.fn();
  const authorizationAuditService = { logDecision } as unknown as AuthorizationAuditService;
  const service = new DossierDepenseUnifieService(postgresService, authorizationAuditService);

  beforeEach(() => {
    query.mockReset();
    logDecision.mockReset();
  });

  it('compose la chaine complete avec timeline et preuves', async () => {
    query
      .mockResolvedValueOnce(
        makeResult([
          {
            depense_id: 'dep-1',
            depense_numero: 'DEP-001',
            depense_objet: 'Achat equipement',
            depense_statut: 'ordonnancee',
            depense_montant: 1000,
            depense_montant_paye: 500,
            depense_date: '2026-03-01',
            depense_date_validation: '2026-03-02',
            depense_date_ordonnancement: '2026-03-03',
            depense_date_paiement: null,
            depense_created_at: '2026-03-01T08:00:00.000Z',
            depense_created_by: 'user-compta',
            depense_observations: null,
            depense_reference_paiement: null,
            exercice_id: 'ex-2026',
            reservation_id: 'res-1',
            reservation_numero: 'RES-001',
            reservation_statut: 'utilisee',
            reservation_date: '2026-02-25',
            reservation_created_at: '2026-02-25T08:00:00.000Z',
            reservation_created_by: 'user-ordo',
            engagement_id: 'eng-1',
            engagement_numero: 'ENG-001',
            engagement_statut: 'valide',
            engagement_date: '2026-02-27',
            engagement_date_validation: '2026-02-28',
            engagement_created_at: '2026-02-27T08:00:00.000Z',
            engagement_created_by: 'user-ordo',
            fournisseur_id: 'fr-1',
            fournisseur_code: 'FRN-001',
            fournisseur_nom: 'Fournisseur A',
            projet_id: 'prj-1',
            projet_code: 'PRJ-001',
            projet_nom: 'Projet A'
          }
        ])
      )
      .mockResolvedValueOnce(
        makeResult([
          {
            id: 'bc-1',
            numero: 'BC-001',
            statut: 'valide',
            date_commande: '2026-02-28',
            date_validation: '2026-03-01',
            created_at: '2026-02-28T09:00:00.000Z',
            created_by: 'user-ordo',
            montant: 1000
          }
        ])
      )
      .mockResolvedValueOnce(
        makeResult([
          {
            id: 'fac-1',
            numero: 'FAC-001',
            statut: 'validee',
            date_facture: '2026-03-01',
            date_echeance: '2026-03-15',
            created_at: '2026-03-01T10:00:00.000Z',
            created_by: 'user-ordo',
            montant_ttc: 1000,
            montant_liquide: 1000,
            reference_piece: 'PJ-2026-001',
            numero_facture_fournisseur: 'F-A-01'
          }
        ])
      )
      .mockResolvedValueOnce(
        makeResult([
          {
            id: 'pay-1',
            numero: 'PAY-001',
            statut: 'execute',
            date_paiement: '2026-03-05',
            created_at: '2026-03-05T12:00:00.000Z',
            created_by: 'user-compta',
            montant: 500,
            mode_paiement: 'virement',
            reference_paiement: 'REF-PAY-01',
            motif_annulation: null,
            motif_rejet: null
          }
        ])
      )
      .mockResolvedValueOnce(
        makeResult([
          {
            id: 'ot-1',
            numero: 'OT-001',
            type_operation: 'decaissement',
            date_operation: '2026-03-05',
            piece_justificative: 'RECU-001.pdf',
            reference_bancaire: 'BR-01',
            paiement_id: 'pay-1',
            depense_id: 'dep-1',
            created_at: '2026-03-05T12:30:00.000Z',
            created_by: 'user-compta'
          }
        ])
      )
      .mockResolvedValueOnce(
        makeResult([
          {
            id: 'ec-1',
            numero_piece: 'EC-001',
            type_operation: 'depense',
            montant: 500,
            depense_id: 'dep-1',
            reservation_id: 'res-1',
            engagement_id: 'eng-1',
            bon_commande_id: 'bc-1',
            facture_id: 'fac-1',
            paiement_id: 'pay-1',
            created_at: '2026-03-05T12:31:00.000Z'
          }
        ])
      );

    const result = await service.getDossier(actor, 'dep-1', {
      detailLevel: 'full'
    });

    expect(result.depense.id).toBe('dep-1');
    expect(result.chaine.factures).toHaveLength(1);
    expect(result.chaine.paiements).toHaveLength(1);
    expect(result.timeline.length).toBeGreaterThan(5);
    expect(result.preuves.some((preuve) => preuve.value === 'PJ-2026-001')).toBe(true);
    expect(result.synthese.controles.some((controle) => controle.code === 'tenant-scope')).toBe(true);
    expect('traces' in result && result.traces.ecritures.length === 1).toBe(true);
  });

  it('expose les trous de preuve quand les references sont absentes', async () => {
    query
      .mockResolvedValueOnce(
        makeResult([
          {
            depense_id: 'dep-2',
            depense_numero: 'DEP-002',
            depense_objet: 'Prestations',
            depense_statut: 'validee',
            depense_montant: 200,
            depense_montant_paye: 0,
            depense_date: '2026-03-10',
            depense_date_validation: '2026-03-11',
            depense_date_ordonnancement: null,
            depense_date_paiement: null,
            depense_created_at: '2026-03-10T08:00:00.000Z',
            depense_created_by: 'user-compta',
            depense_observations: null,
            depense_reference_paiement: null,
            exercice_id: 'ex-2026',
            reservation_id: null,
            reservation_numero: null,
            reservation_statut: null,
            reservation_date: null,
            reservation_created_at: null,
            reservation_created_by: null,
            engagement_id: null,
            engagement_numero: null,
            engagement_statut: null,
            engagement_date: null,
            engagement_date_validation: null,
            engagement_created_at: null,
            engagement_created_by: null,
            fournisseur_id: null,
            fournisseur_code: null,
            fournisseur_nom: null,
            projet_id: null,
            projet_code: null,
            projet_nom: null
          }
        ])
      )
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([]));

    const result = await service.getDossier(actor, 'dep-2', {});
    expect(result.preuves.some((preuve) => preuve.missing)).toBe(true);
    expect(result.synthese.controles.find((controle) => controle.code === 'preuves-completes')?.status).toBe('warning');
  });

  it('refuse une depense hors scope tenant', async () => {
    query.mockResolvedValueOnce(makeResult([]));

    await expect(service.getDossier(actor, 'dep-introuvable', {})).rejects.toThrow('Depense introuvable ou hors scope');
  });

  it('genere un export pdf et zip probatoires', async () => {
    const chainRow = {
      depense_id: 'dep-3',
      depense_numero: 'DEP-003',
      depense_objet: 'Services',
      depense_statut: 'payee',
      depense_montant: 150,
      depense_montant_paye: 150,
      depense_date: '2026-03-12',
      depense_date_validation: '2026-03-12',
      depense_date_ordonnancement: '2026-03-12',
      depense_date_paiement: '2026-03-13',
      depense_created_at: '2026-03-12T08:00:00.000Z',
      depense_created_by: 'user-compta',
      depense_observations: null,
      depense_reference_paiement: 'REF-DEP-3',
      exercice_id: 'ex-2026',
      reservation_id: null,
      reservation_numero: null,
      reservation_statut: null,
      reservation_date: null,
      reservation_created_at: null,
      reservation_created_by: null,
      engagement_id: null,
      engagement_numero: null,
      engagement_statut: null,
      engagement_date: null,
      engagement_date_validation: null,
      engagement_created_at: null,
      engagement_created_by: null,
      fournisseur_id: null,
      fournisseur_code: null,
      fournisseur_nom: null,
      projet_id: null,
      projet_code: null,
      projet_nom: null
    };

    const mockDossierQueries = () => {
      query.mockImplementationOnce(async () => makeResult([chainRow]));
      query.mockImplementationOnce(async () => makeResult([]));
      query.mockImplementationOnce(async () => makeResult([]));
      query.mockImplementationOnce(async () => makeResult([]));
      query.mockImplementationOnce(async () => makeResult([]));
      query.mockImplementationOnce(async () => makeResult([]));
    };

    mockDossierQueries();
    const pdf = await service.exportDossier(actor, 'dep-3', { format: 'pdf' });
    query.mockReset();
    mockDossierQueries();
    const zip = await service.exportDossier(actor, 'dep-3', { format: 'zip' });

    expect(pdf.filename.endsWith('.pdf')).toBe(true);
    expect(pdf.content.subarray(0, 5).toString('utf-8')).toBe('%PDF-');
    expect(zip.filename.endsWith('.zip')).toBe(true);
    expect(zip.content.subarray(0, 2).toString('utf-8')).toBe('PK');
    expect(logDecision).toHaveBeenCalledTimes(2);
  });
});
