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
  const withTransaction = jest.fn();
  const postgresService = { query, withTransaction } as unknown as PostgresService;
  const service = new EcrituresComptablesService(postgresService);

  beforeEach(() => {
    query.mockReset();
    withTransaction.mockReset();
    withTransaction.mockImplementation(async (callback: (executor: { query: typeof query }) => Promise<unknown>) =>
      callback({ query })
    );
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
            objet: 'Mission terrain',
            exercice_id: 'ex-1'
          }
        ])
      )
      .mockResolvedValueOnce(
        makeResult([
          {
            generate_ecritures_comptables: {
              success: true,
              status: 'created',
              ecritures_count: 1
            }
          }
        ])
      );

    const result = await service.generateForOperation(actor, 'depense', 'dep-1', 'ex-1');

    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0]?.[1]).toEqual(['dep-1', actor.tenantId, 'ex-1']);
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
        objet: 'Mission terrain',
        exercice_id: 'ex-1'
      }),
      actor.sub
    ]);
    expect(result.status).toBe('created');
    expect(result.ecrituresCount).toBe(1);
  });

  it('normalise un resultat idempotent sans duplicat logique', async () => {
    query
      .mockResolvedValueOnce(
        makeResult([
          {
            id: 'dep-1',
            client_id: actor.tenantId,
            exercice_id: 'ex-1',
            numero: 'DEP/2026/001',
            date_depense: '2026-03-07',
            montant: 4500
          }
        ])
      )
      .mockResolvedValueOnce(
        makeResult([
          {
            generate_ecritures_comptables: {
              success: true,
              status: 'already_generated',
              code: 'ECRITURES_DEJA_PRESENTES',
              message: 'Les ecritures comptables existent deja pour cette source et cette configuration.',
              ecritures_count: 1
            }
          }
        ])
      );

    const result = await service.generateForOperation(actor, 'depense', 'dep-1', 'ex-1');

    expect(result.success).toBe(true);
    expect(result.status).toBe('already_generated');
    expect(result.code).toBe('ECRITURES_DEJA_PRESENTES');
    expect(result.ecrituresCount).toBe(1);
  });

  it('leve une erreur metier exploitable via ensureGeneratedForOperation', async () => {
    query
      .mockResolvedValueOnce(
        makeResult([
          {
            id: 'dep-1',
            client_id: actor.tenantId,
            exercice_id: 'ex-1',
            numero: 'DEP/2026/001',
            date_depense: '2026-03-07',
            montant: 4500
          }
        ])
      )
      .mockResolvedValueOnce(
        makeResult([
          {
            generate_ecritures_comptables: {
              success: false,
              status: 'error',
              code: 'REGLE_COMPTABLE_MANQUANTE',
              message: 'Aucune regle comptable publiee ne couvre cette operation pour la date et le contexte fournis.',
              ecritures_count: 0
            }
          }
        ])
      );

    await expect(service.ensureGeneratedForOperation(actor, 'depense', 'dep-1', 'ex-1')).rejects.toThrow(
      'Aucune regle comptable publiee'
    );
  });

  it('cree une contre-passation en inversant les comptes et en preservant le lien d audit', async () => {
    query
      .mockResolvedValueOnce(
        makeResult([
          {
            id: 'ecr-1',
            client_id: actor.tenantId,
            exercice_id: 'ex-1',
            source_id: 'dep-1',
            statut_ecriture: 'validee',
            has_existing_contrepassation: false
          }
        ])
      )
      .mockResolvedValueOnce(
        makeResult([
          {
            numero_piece: 'DEP/2026/001',
            numero_ligne: 1
          }
        ])
      )
      .mockResolvedValueOnce(makeResult([]));

    await service.createContrepassations(
      actor,
      [
        {
          id: 'ecr-1',
          client_id: actor.tenantId,
          exercice_id: 'ex-1',
          numero_piece: 'DEP/2026/001',
          numero_ligne: 1,
          compte_debit_id: 'compte-debit',
          compte_credit_id: 'compte-credit',
          montant: 1250,
          libelle: 'Depense mission',
          type_operation: 'depense',
          source_id: 'dep-1',
          regle_comptable_id: 'reg-1',
          engagement_id: null,
          reservation_id: null,
          bon_commande_id: null,
          facture_id: null,
          depense_id: 'dep-1',
          paiement_id: null
        }
      ],
      {
        motif: 'Erreur de saisie',
        libellePrefix: 'Annulation',
        expectedExerciceId: 'ex-1',
        expectedSourceId: 'dep-1'
      }
    );

    expect(withTransaction).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledTimes(3);
    expect(query.mock.calls[2]?.[1]).toEqual([
      actor.tenantId,
      'ex-1',
      'DEP/2026/001',
      2,
      'compte-credit',
      'compte-debit',
      1250,
      'Annulation: Depense mission - Erreur de saisie',
      'depense',
      'dep-1',
      'reg-1',
      'ecr-1',
      actor.sub,
      null,
      null,
      null,
      null,
      'dep-1',
      null
    ]);
  });

  it('refuse une double contre-passation sur la meme origine', async () => {
    query.mockResolvedValueOnce(
      makeResult([
        {
          id: 'ecr-1',
          client_id: actor.tenantId,
          exercice_id: 'ex-1',
          source_id: 'dep-1',
          statut_ecriture: 'validee',
          has_existing_contrepassation: true
        }
      ])
    );

    await expect(
      service.createContrepassations(
        actor,
        [
          {
            id: 'ecr-1',
            client_id: actor.tenantId,
            exercice_id: 'ex-1',
            numero_piece: 'DEP/2026/001',
            numero_ligne: 1,
            compte_debit_id: 'compte-debit',
            compte_credit_id: 'compte-credit',
            montant: 1250,
            libelle: 'Depense mission',
            type_operation: 'depense',
            source_id: 'dep-1',
            regle_comptable_id: 'reg-1',
            engagement_id: null,
            reservation_id: null,
            bon_commande_id: null,
            facture_id: null,
            depense_id: 'dep-1',
            paiement_id: null
          }
        ],
        {
          motif: 'Erreur de saisie',
          libellePrefix: 'Annulation',
          expectedExerciceId: 'ex-1',
          expectedSourceId: 'dep-1'
        }
      )
    ).rejects.toThrow('déjà été contre-passée');
  });

  it('refuse une contre-passation cross-tenant ou exercice incoherent', async () => {
    await expect(
      service.createContrepassations(
        actor,
        [
          {
            id: 'ecr-1',
            client_id: 'tenant-2',
            exercice_id: 'ex-2',
            numero_piece: 'DEP/2026/001',
            numero_ligne: 1,
            compte_debit_id: 'compte-debit',
            compte_credit_id: 'compte-credit',
            montant: 1250,
            libelle: 'Depense mission',
            type_operation: 'depense',
            source_id: 'dep-1',
            regle_comptable_id: 'reg-1',
            engagement_id: null,
            reservation_id: null,
            bon_commande_id: null,
            facture_id: null,
            depense_id: 'dep-1',
            paiement_id: null
          }
        ],
        {
          motif: 'Erreur de saisie',
          libellePrefix: 'Annulation',
          expectedExerciceId: 'ex-1',
          expectedSourceId: 'dep-1'
        }
      )
    ).rejects.toThrow('hors scope tenant');
  });

  it('attribue des numeros de ligne consecutifs a partir du maximum deja present pour la piece', async () => {
    query
      .mockResolvedValueOnce(
        makeResult([
          {
            id: 'ecr-1',
            client_id: actor.tenantId,
            exercice_id: 'ex-1',
            source_id: 'dep-1',
            statut_ecriture: 'validee',
            has_existing_contrepassation: false
          },
          {
            id: 'ecr-2',
            client_id: actor.tenantId,
            exercice_id: 'ex-1',
            source_id: 'dep-1',
            statut_ecriture: 'validee',
            has_existing_contrepassation: false
          }
        ])
      )
      .mockResolvedValueOnce(
        makeResult([
          {
            numero_piece: 'DEP/2026/001',
            numero_ligne: 1
          },
          {
            numero_piece: 'DEP/2026/001',
            numero_ligne: 1004
          }
        ])
      )
      .mockResolvedValue(makeResult([]));

    await service.createContrepassations(
      actor,
      [
        {
          id: 'ecr-1',
          client_id: actor.tenantId,
          exercice_id: 'ex-1',
          numero_piece: 'DEP/2026/001',
          numero_ligne: 1,
          compte_debit_id: 'compte-debit',
          compte_credit_id: 'compte-credit',
          montant: 1250,
          libelle: 'Depense mission',
          type_operation: 'depense',
          source_id: 'dep-1',
          regle_comptable_id: 'reg-1',
          engagement_id: null,
          reservation_id: null,
          bon_commande_id: null,
          facture_id: null,
          depense_id: 'dep-1',
          paiement_id: null
        },
        {
          id: 'ecr-2',
          client_id: actor.tenantId,
          exercice_id: 'ex-1',
          numero_piece: 'DEP/2026/001',
          numero_ligne: 2,
          compte_debit_id: 'compte-debit',
          compte_credit_id: 'compte-credit',
          montant: 450,
          libelle: 'TVA mission',
          type_operation: 'depense',
          source_id: 'dep-1',
          regle_comptable_id: 'reg-1',
          engagement_id: null,
          reservation_id: null,
          bon_commande_id: null,
          facture_id: null,
          depense_id: 'dep-1',
          paiement_id: null
        }
      ],
      {
        motif: 'Erreur de saisie',
        libellePrefix: 'Annulation',
        expectedExerciceId: 'ex-1',
        expectedSourceId: 'dep-1'
      }
    );

    expect(query.mock.calls[2]?.[1]?.[3]).toBe(1005);
    expect(query.mock.calls[3]?.[1]?.[3]).toBe(1006);
  });

  it("traduit une collision d'unicite sur la piece en erreur explicite", async () => {
    query
      .mockResolvedValueOnce(
        makeResult([
          {
            id: 'ecr-1',
            client_id: actor.tenantId,
            exercice_id: 'ex-1',
            source_id: 'dep-1',
            statut_ecriture: 'validee',
            has_existing_contrepassation: false
          }
        ])
      )
      .mockResolvedValueOnce(
        makeResult([
          {
            numero_piece: 'DEP/2026/001',
            numero_ligne: 7
          }
        ])
      )
      .mockRejectedValueOnce({
        code: '23505',
        constraint: 'unique_piece_ligne'
      });

    await expect(
      service.createContrepassations(
        actor,
        [
          {
            id: 'ecr-1',
            client_id: actor.tenantId,
            exercice_id: 'ex-1',
            numero_piece: 'DEP/2026/001',
            numero_ligne: 1,
            compte_debit_id: 'compte-debit',
            compte_credit_id: 'compte-credit',
            montant: 1250,
            libelle: 'Depense mission',
            type_operation: 'depense',
            source_id: 'dep-1',
            regle_comptable_id: 'reg-1',
            engagement_id: null,
            reservation_id: null,
            bon_commande_id: null,
            facture_id: null,
            depense_id: 'dep-1',
            paiement_id: null
          }
        ],
        {
          motif: 'Erreur de saisie',
          libellePrefix: 'Annulation',
          expectedExerciceId: 'ex-1',
          expectedSourceId: 'dep-1'
        }
      )
    ).rejects.toThrow('numérotation de ligne');
  });
});
