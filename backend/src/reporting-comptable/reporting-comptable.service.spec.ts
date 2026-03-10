import type { QueryResult, QueryResultRow } from 'pg';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import type { PostgresService } from '../common/postgres.service';
import { ReportingComptableService } from './reporting-comptable.service';

const actor: AuthenticatedUser = {
  sub: 'user-1',
  tenantId: 'tenant-1',
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

describe('ReportingComptableService', () => {
  const query = jest.fn();
  const postgresService = { query } as unknown as PostgresService;
  const service = new ReportingComptableService(postgresService);

  beforeEach(() => {
    query.mockReset();
  });

  it('construit une balance coherente debit=credit et dedupe le grand livre', async () => {
    query
      .mockResolvedValueOnce(
        makeResult([
          {
            ecriture_id: 'e1',
            date_ecriture: '2026-03-01',
            numero_piece: 'PC-1',
            numero_ligne: 1,
            libelle: 'Ligne 1',
            montant: 100,
            compte_debit_id: 'c1',
            compte_debit_numero: '601',
            compte_debit_libelle: 'Achats',
            compte_credit_id: 'c2',
            compte_credit_numero: '401',
            compte_credit_libelle: 'Fournisseurs',
            projet_id: null,
            projet_code: null,
            projet_nom: null,
            action_id: null,
            action_code: null,
            programme_code: null,
            section_code: null
          },
          {
            ecriture_id: 'e1',
            date_ecriture: '2026-03-01',
            numero_piece: 'PC-1',
            numero_ligne: 1,
            libelle: 'Ligne 1',
            montant: 100,
            compte_debit_id: 'c1',
            compte_debit_numero: '601',
            compte_debit_libelle: 'Achats',
            compte_credit_id: 'c2',
            compte_credit_numero: '401',
            compte_credit_libelle: 'Fournisseurs',
            projet_id: null,
            projet_code: null,
            projet_nom: null,
            action_id: null,
            action_code: null,
            programme_code: null,
            section_code: null
          }
        ])
      )
      .mockResolvedValueOnce(makeResult([{ debit: 0, credit: 0 }]));

    const result = await service.getReport(actor, {
      dateDebut: '2026-03-01',
      dateFin: '2026-03-31'
    });

    expect(result.integrity.totalDebit).toBe(100);
    expect(result.integrity.totalCredit).toBe(100);
    expect(result.integrity.ecart).toBe(0);
    expect(result.integrity.isBalanced).toBe(true);
    expect(result.grandLivre.total).toBe(1);
  });

  it('rejette une periode invalide', async () => {
    await expect(
      service.getReport(actor, {
        dateDebut: '2026-04-01',
        dateFin: '2026-03-01'
      })
    ).rejects.toThrow('dateDebut doit etre <= dateFin');
  });

  it('scope toutes les requetes avec tenantId', async () => {
    query.mockResolvedValueOnce(makeResult([])).mockResolvedValueOnce(makeResult([{ debit: 0, credit: 0 }]));

    await service.getReport(actor, {
      dateDebut: '2026-03-01',
      dateFin: '2026-03-31'
    });

    expect(query).toHaveBeenCalled();
    expect(query.mock.calls[0]?.[1]?.[0]).toBe(actor.tenantId);
  });

  it('gere le cycle export asynchrone xlsx avec status polling', async () => {
    query.mockResolvedValueOnce(makeResult([])).mockResolvedValueOnce(makeResult([{ debit: 0, credit: 0 }]));

    const started = await service.startExport(actor, {
      dateDebut: '2026-03-01',
      dateFin: '2026-03-31',
      view: 'balance',
      format: 'xlsx'
    });

    expect(started.exportId).toBeDefined();
    expect(['pending', 'processing', 'completed']).toContain(started.status);

    await new Promise((resolve) => setTimeout(resolve, 300));

    const status = service.getExportStatus(actor, started.exportId);
    expect(status.status).toBe('completed');
    expect(status.downloadUrl).toContain(`/reporting-comptable/exports/${started.exportId}/download`);

    const downloadUrl = status.downloadUrl ?? '';
    const token = new URL(`http://localhost${downloadUrl}`).searchParams.get('token');
    expect(token).toBeTruthy();

    const file = service.downloadExport(actor, started.exportId, token ?? '');
    expect(file.filename.endsWith('.xlsx')).toBe(true);
    expect(file.content.length).toBeGreaterThan(0);
  });

  it('rejette un token de telechargement altere', async () => {
    query.mockResolvedValueOnce(makeResult([])).mockResolvedValueOnce(makeResult([{ debit: 0, credit: 0 }]));

    const started = await service.startExport(actor, {
      dateDebut: '2026-03-01',
      dateFin: '2026-03-31',
      view: 'balance',
      format: 'xlsx'
    });

    await new Promise((resolve) => setTimeout(resolve, 300));

    const status = service.getExportStatus(actor, started.exportId);
    const downloadUrl = status.downloadUrl ?? '';
    const token = new URL(`http://localhost${downloadUrl}`).searchParams.get('token');
    expect(token).toBeTruthy();

    const tampered = `${token?.slice(0, -1)}x`;
    expect(() => service.downloadExport(actor, started.exportId, tampered)).toThrow('Signature de telechargement invalide');
  });

  it('echappe les cellules CSV sensibles (separateur, guillemets, formules)', async () => {
    query
      .mockResolvedValueOnce(
        makeResult([
          {
            ecriture_id: 'e1',
            date_ecriture: '2026-03-01',
            numero_piece: 'PC-1',
            numero_ligne: 1,
            libelle: '=HYPERLINK(\"http://malicious\")',
            montant: 100,
            compte_debit_id: 'c1',
            compte_debit_numero: '601',
            compte_debit_libelle: 'Achats;\"A\"',
            compte_credit_id: 'c2',
            compte_credit_numero: '401',
            compte_credit_libelle: 'Fournisseurs',
            projet_id: null,
            projet_code: null,
            projet_nom: null,
            action_id: null,
            action_code: null,
            programme_code: null,
            section_code: null
          }
        ])
      )
      .mockResolvedValueOnce(makeResult([{ debit: 0, credit: 0 }]));

    const started = await service.startExport(actor, {
      dateDebut: '2026-03-01',
      dateFin: '2026-03-31',
      view: 'grand-livre',
      format: 'csv'
    });

    const status = service.getExportStatus(actor, started.exportId);
    const downloadUrl = status.downloadUrl ?? '';
    const token = new URL(`http://localhost${downloadUrl}`).searchParams.get('token');
    const file = service.downloadExport(actor, started.exportId, token ?? '');
    const content = file.content.toString('utf-8');

    expect(content).toContain('"601 Achats;""A"""');
    expect(content).toContain("'=HYPERLINK");
  });
});
