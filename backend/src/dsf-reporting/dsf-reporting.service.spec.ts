import type { QueryResult, QueryResultRow } from 'pg';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import type { AuthorizationAuditService } from '../auth/authorization-audit.service';
import type { PostgresService } from '../common/postgres.service';
import { DsfReportingService } from './dsf-reporting.service';

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

describe('DsfReportingService', () => {
  const query = jest.fn();
  const logDecision = jest.fn();
  const postgresService = { query } as unknown as PostgresService;
  const authorizationAuditService = { logDecision } as unknown as AuthorizationAuditService;
  const service = new DsfReportingService(postgresService, authorizationAuditService);

  beforeEach(() => {
    query.mockReset();
    logDecision.mockReset();
  });

  it('valide un jeu d ecritures conforme et autorise export', async () => {
    query.mockResolvedValueOnce(
      makeResult([
        {
          ecriture_id: 'e1',
          date_ecriture: '2026-03-01',
          numero_piece: 'PC-1',
          numero_ligne: 1,
          libelle: 'Achat fournitures',
          montant: 120000,
          compte_debit_numero: '601100',
          compte_credit_numero: '401100'
        }
      ])
    );

    const result = await service.validate(actor, {
      exerciceId: '11111111-1111-1111-1111-111111111111',
      referentielVersion: 'OHADA-SYCEBNL-2025'
    });

    expect(result.status).toBe('conforme');
    expect(result.isExportAllowed).toBe(true);
    expect(result.blockingErrors).toHaveLength(0);
  });

  it('retourne non-conforme quand compte hors OHADA', async () => {
    query.mockResolvedValueOnce(
      makeResult([
        {
          ecriture_id: 'e1',
          date_ecriture: '2026-03-01',
          numero_piece: 'PC-2',
          numero_ligne: 1,
          libelle: 'Ecriture invalide',
          montant: 50000,
          compte_debit_numero: 'A011',
          compte_credit_numero: '401100'
        }
      ])
    );

    const result = await service.validate(actor, {
      exerciceId: '11111111-1111-1111-1111-111111111111',
      referentielVersion: 'OHADA-SYCEBNL-2025'
    });

    expect(result.status).toBe('non-conforme');
    expect(result.blockingErrors.some((item) => item.code === 'DSF-OHADA-ACCOUNT-FORMAT')).toBe(true);
  });

  it('applique des regles de compte differentes selon referentiel version', async () => {
    query.mockResolvedValueOnce(
      makeResult([
        {
          ecriture_id: 'e1',
          date_ecriture: '2026-03-01',
          numero_piece: 'PC-2017',
          numero_ligne: 1,
          libelle: 'Compte court OHADA 2017',
          montant: 1000,
          compte_debit_numero: '4011',
          compte_credit_numero: '6011'
        }
      ])
    );

    const result2017 = await service.validate(actor, {
      exerciceId: '11111111-1111-1111-1111-111111111111',
      referentielVersion: 'OHADA-SYCEBNL-2017'
    });
    expect(result2017.status).toBe('conforme');

    query.mockResolvedValueOnce(
      makeResult([
        {
          ecriture_id: 'e2',
          date_ecriture: '2026-03-01',
          numero_piece: 'PC-2025',
          numero_ligne: 1,
          libelle: 'Compte court non conforme 2025',
          montant: 1000,
          compte_debit_numero: '4011',
          compte_credit_numero: '6011'
        }
      ])
    );

    const result2025 = await service.validate(actor, {
      exerciceId: '11111111-1111-1111-1111-111111111111',
      referentielVersion: 'OHADA-SYCEBNL-2025'
    });
    expect(result2025.status).toBe('non-conforme');
    expect(result2025.blockingErrors.some((item) => item.code === 'DSF-OHADA-ACCOUNT-FORMAT')).toBe(true);
  });

  it('bloque export si validation non-conforme', async () => {
    query.mockResolvedValueOnce(
      makeResult([
        {
          ecriture_id: 'e1',
          date_ecriture: '2026-03-01',
          numero_piece: '',
          numero_ligne: 1,
          libelle: 'Ecriture invalide',
          montant: 50000,
          compte_debit_numero: '601100',
          compte_credit_numero: '401100'
        }
      ])
    );

    await expect(
      service.startExport(actor, {
        exerciceId: '11111111-1111-1111-1111-111111111111',
        referentielVersion: 'OHADA-SYCEBNL-2025',
        format: 'csv'
      })
    ).rejects.toThrow('Export DSF bloque');
  });

  it('produit hash et restreint statut export au tenant courant', async () => {
    query.mockResolvedValueOnce(
      makeResult([
        {
          ecriture_id: 'e1',
          date_ecriture: '2026-03-01',
          numero_piece: 'PC-1',
          numero_ligne: 1,
          libelle: 'Achat fournitures',
          montant: 120000,
          compte_debit_numero: '601100',
          compte_credit_numero: '401100'
        }
      ])
    );

    const started = await service.startExport(actor, {
      exerciceId: '11111111-1111-1111-1111-111111111111',
      referentielVersion: 'OHADA-SYCEBNL-2025',
      format: 'csv'
    });

    expect(started.hash).toMatch(/^[a-f0-9]{64}$/);

    const status = service.getExportStatus(actor, started.exportId);
    expect(status.hash).toBe(started.hash);
    expect(status.downloadUrl).toContain(`/dsf-reporting/exports/${started.exportId}/download`);

    const otherActor: AuthenticatedUser = {
      ...actor,
      tenantId: 'tenant-2'
    };

    expect(() => service.getExportStatus(otherActor, started.exportId)).toThrow('Export introuvable pour ce tenant');
  });

  it('genere de vrais binaires XLSX et PDF', async () => {
    query.mockResolvedValueOnce(
      makeResult([
        {
          ecriture_id: 'e1',
          date_ecriture: '2026-03-01',
          numero_piece: 'PC-XLSX',
          numero_ligne: 1,
          libelle: 'Export xlsx',
          montant: 10000,
          compte_debit_numero: '601100',
          compte_credit_numero: '401100'
        }
      ])
    );

    const xlsxExport = await service.startExport(actor, {
      exerciceId: '11111111-1111-1111-1111-111111111111',
      referentielVersion: 'OHADA-SYCEBNL-2025',
      format: 'xlsx'
    });

    const xlsxToken = decodeURIComponent(service.getExportStatus(actor, xlsxExport.exportId).downloadUrl.split('token=')[1] ?? '');
    const xlsxDownload = service.downloadExport(actor, xlsxExport.exportId, xlsxToken);
    expect(xlsxDownload.content.subarray(0, 2).toString('utf-8')).toBe('PK');

    query.mockResolvedValueOnce(
      makeResult([
        {
          ecriture_id: 'e2',
          date_ecriture: '2026-03-01',
          numero_piece: 'PC-PDF',
          numero_ligne: 1,
          libelle: 'Export pdf',
          montant: 10000,
          compte_debit_numero: '601100',
          compte_credit_numero: '401100'
        }
      ])
    );

    const pdfExport = await service.startExport(actor, {
      exerciceId: '11111111-1111-1111-1111-111111111111',
      referentielVersion: 'OHADA-SYCEBNL-2025',
      format: 'pdf'
    });

    const pdfToken = decodeURIComponent(service.getExportStatus(actor, pdfExport.exportId).downloadUrl.split('token=')[1] ?? '');
    const pdfDownload = service.downloadExport(actor, pdfExport.exportId, pdfToken);
    expect(pdfDownload.content.subarray(0, 5).toString('utf-8')).toBe('%PDF-');
  });
});
