import type { QueryResult, QueryResultRow } from 'pg';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import type { PostgresService } from '../common/postgres.service';
import { EcrituresComptablesService } from './ecritures-comptables.service';

const actor: AuthenticatedUser = {
  sub: 'user-1',
  tenantId: 'tenant-1',
  roles: ['admin_client']
};

const makeResult = <T extends QueryResultRow>(rows: T[], rowCount = rows.length): QueryResult<T> =>
  ({
    rows,
    rowCount,
    command: 'SELECT',
    oid: 0,
    fields: []
  }) as QueryResult<T>;

describe('EcrituresComptablesService', () => {
  const query = jest.fn();
  const postgresService = { query } as unknown as PostgresService;
  const service = new EcrituresComptablesService(postgresService);

  beforeEach(() => {
    query.mockReset();
  });

  it('expose la preuve de la version de regle appliquee', async () => {
    query.mockResolvedValueOnce(
      makeResult([
        {
          id: 'ecr-1',
          client_id: actor.tenantId,
          exercice_id: 'ex-1',
          numero_piece: 'DEP/2026/001',
          numero_ligne: 1,
          date_ecriture: '2026-03-07',
          compte_debit_id: 'compte-debit',
          compte_credit_id: 'compte-credit',
          montant: 1250,
          libelle: 'Depense mission',
          type_operation: 'depense',
          source_id: 'dep-1',
          regle_comptable_id: 'reg-1',
          statut_ecriture: 'validee',
          ecriture_origine_id: null,
          created_at: '2026-03-07T10:00:00.000Z',
          created_by: actor.sub,
          updated_at: '2026-03-07T10:00:00.000Z',
          compte_debit_numero: '601',
          compte_debit_libelle: 'Achats',
          compte_credit_numero: '401',
          compte_credit_libelle: 'Fournisseurs',
          regle_code: 'RG-DEP-001',
          regle_nom: 'Depense 2026',
          regle_version_group_id: 'group-1',
          regle_version_number: 3,
          regle_version_status: 'published',
          regle_date_debut: '2026-01-01',
          regle_date_fin: '2026-12-31'
        }
      ])
    );

    const result = await service.getBySource(actor, 'depense', 'dep-1');

    expect(result).toHaveLength(1);
    expect(result[0]?.regleComptable?.versionNumber).toBe(3);
    expect(result[0]?.regleComptable?.versionStatus).toBe('published');
  });

  it('appelle la fonction SQL avec le tenant comme premiere cle de scope', async () => {
    query
      .mockResolvedValueOnce(
        makeResult([
          {
            id: 'dep-1',
            client_id: actor.tenantId,
            numero: 'DEP/2026/001',
            date_depense: '2026-03-07',
            montant: 4500,
            objet: 'Mission terrain'
          }
        ])
      )
      .mockResolvedValueOnce(
        makeResult([
          {
            generate_ecritures_comptables: {
              success: true,
              ecritures_count: 1
            }
          }
        ])
      );

    await service.generateForOperation(actor, 'depense', 'dep-1', 'ex-1');

    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1]?.[1]).toEqual([
      actor.tenantId,
      'ex-1',
      'depense',
      'dep-1',
      'DEP/2026/001',
      '2026-03-07',
      4500,
      JSON.stringify({
        id: 'dep-1',
        client_id: actor.tenantId,
        numero: 'DEP/2026/001',
        date_depense: '2026-03-07',
        montant: 4500,
        objet: 'Mission terrain'
      }),
      actor.sub
    ]);
  });
});
