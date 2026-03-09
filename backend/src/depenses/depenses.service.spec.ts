import { BadRequestException } from '@nestjs/common';
import type { QueryResult, QueryResultRow } from 'pg';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import type { PostgresService } from '../common/postgres.service';
import type { EcrituresComptablesService } from '../ecritures-comptables/ecritures-comptables.service';
import type { ExerciceClotureService } from '../exercice-cloture/exercice-cloture.service';
import type { WorkflowExceptionsService } from '../workflow-exceptions/workflow-exceptions.service';
import { DepensesService } from './depenses.service';

const actor: AuthenticatedUser = {
  sub: 'user-1',
  tenantId: 'tenant-1',
  roles: ['admin_client'],
};

const makeResult = <T extends QueryResultRow>(rows: T[], rowCount = rows.length): QueryResult<T> =>
  ({
    rows,
    rowCount,
    command: 'SELECT',
    oid: 0,
    fields: [],
  }) as QueryResult<T>;

describe('DepensesService', () => {
  const query = jest.fn();
  const postgresService = { query } as unknown as PostgresService;
  const workflowExceptionsService = {
    assertTransitionAllowed: jest.fn(),
  } as unknown as WorkflowExceptionsService;
  const ecrituresComptablesService = {
    ensureGeneratedForOperation: jest.fn(),
    createContrepassations: jest.fn(),
  } as unknown as EcrituresComptablesService;
  const exerciceClotureService = {
    assertExerciceMutable: jest.fn(),
  } as unknown as ExerciceClotureService;
  const service = new DepensesService(
    postgresService,
    workflowExceptionsService,
    ecrituresComptablesService,
    exerciceClotureService
  );

  beforeEach(() => {
    query.mockReset();
    jest.restoreAllMocks();
    (exerciceClotureService.assertExerciceMutable as jest.Mock).mockReset().mockResolvedValue(undefined);
  });

  it('centralise la génération nominale des écritures de dépense', async () => {
    const internalService = service as unknown as {
      generateEcrituresForDepense: (actor: AuthenticatedUser, depense: { id: string; exerciceId: string }) => Promise<void>;
    };

    await internalService.generateEcrituresForDepense(actor, {
      id: 'dep-1',
      exerciceId: 'ex-1',
    });

    expect((ecrituresComptablesService.ensureGeneratedForOperation as jest.Mock)).toHaveBeenCalledWith(
      actor,
      'depense',
      'dep-1',
      'ex-1'
    );
  });

  it('refuse la création depuis plus de 20 factures', async () => {
    const factureIds = Array.from({ length: 21 }, (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`);

    await expect(
      service.createFromFacture(actor, {
        exerciceId: 'ex-1',
        factureIds,
        dateDepense: '2026-03-05',
      })
    ).rejects.toThrow('maximum 20 factures');

    expect(query).toHaveBeenCalledTimes(0);
  });

  it('crée une dépense multi-factures cohérente (2 factures)', async () => {
    query
      .mockResolvedValueOnce(
        makeResult([
          {
            id: 'f-1',
            client_id: actor.tenantId,
            exercice_id: 'ex-1',
            numero: 'FAC/001',
            objet: 'Achat 1',
            montant_ttc: 100,
            statut: 'validee',
            fournisseur_id: 'fr-1',
            engagement_id: 'eng-1',
            ligne_budgetaire_id: 'lb-1',
            projet_id: 'pr-1',
          },
          {
            id: 'f-2',
            client_id: actor.tenantId,
            exercice_id: 'ex-1',
            numero: 'FAC/002',
            objet: 'Achat 2',
            montant_ttc: 50,
            statut: 'validee',
            fournisseur_id: 'fr-1',
            engagement_id: 'eng-1',
            ligne_budgetaire_id: 'lb-1',
            projet_id: 'pr-1',
          },
        ])
      )
      .mockResolvedValueOnce(makeResult([]));

    const createInternalSpy = jest
      .spyOn(service as any, 'createInternal')
      .mockResolvedValue({ id: 'dep-1', statut: 'brouillon' });

    await service.createFromFacture(actor, {
      exerciceId: 'ex-1',
      factureIds: ['f-1', 'f-2'],
      dateDepense: '2026-03-05',
    });

    expect(createInternalSpy).toHaveBeenCalledTimes(1);
    const [, payload, allocations] = createInternalSpy.mock.calls[0] as [AuthenticatedUser, { factureIds: string[]; montant: number }, Array<{ factureId: string; montant: number }>];
    expect(payload.factureIds).toEqual(['f-1', 'f-2']);
    expect(payload.montant).toBe(150);
    expect(allocations).toEqual([
      { factureId: 'f-1', montant: 100 },
      { factureId: 'f-2', montant: 50 },
    ]);
  });

  it('refuse une facture hors statut validee', async () => {
    query.mockResolvedValueOnce(
      makeResult([
        {
          id: 'f-1',
          client_id: actor.tenantId,
          exercice_id: 'ex-1',
          numero: 'FAC/001',
          objet: 'Achat',
          montant_ttc: 100,
          statut: 'brouillon',
          fournisseur_id: 'fr-1',
          engagement_id: 'eng-1',
          ligne_budgetaire_id: 'lb-1',
          projet_id: 'pr-1',
        },
      ])
    );

    await expect(
      service.createFromFacture(actor, {
        exerciceId: 'ex-1',
        factureIds: ['f-1'],
        dateDepense: '2026-03-05',
      })
    ).rejects.toThrow('non éligible');
  });

  it('refuse une sélection multi-factures incohérente', async () => {
    query.mockResolvedValueOnce(
      makeResult([
        {
          id: 'f-1',
          client_id: actor.tenantId,
          exercice_id: 'ex-1',
          numero: 'FAC/001',
          objet: 'Achat 1',
          montant_ttc: 100,
          statut: 'validee',
          fournisseur_id: 'fr-1',
          engagement_id: 'eng-1',
          ligne_budgetaire_id: 'lb-1',
          projet_id: 'pr-1',
        },
        {
          id: 'f-2',
          client_id: actor.tenantId,
          exercice_id: 'ex-1',
          numero: 'FAC/002',
          objet: 'Achat 2',
          montant_ttc: 50,
          statut: 'validee',
          fournisseur_id: 'fr-1',
          engagement_id: 'eng-2',
          ligne_budgetaire_id: 'lb-1',
          projet_id: 'pr-1',
        },
      ])
    );

    await expect(
      service.createFromFacture(actor, {
        exerciceId: 'ex-1',
        factureIds: ['f-1', 'f-2'],
        dateDepense: '2026-03-05',
      })
    ).rejects.toThrow('Sélection incohérente');
  });

  it('bloque une transition valider invalide', async () => {
    jest.spyOn(service, 'getById').mockResolvedValue({
      id: 'dep-1',
      clientId: actor.tenantId,
      exerciceId: 'ex-1',
      numero: 'DEP/EX/0001',
      dateDepense: '2026-03-05',
      objet: 'Test',
      montant: 10,
      montantPaye: 0,
      statut: 'validee',
      createdAt: '2026-03-05T00:00:00.000Z',
      updatedAt: '2026-03-05T00:00:00.000Z',
    } as any);

    await expect(service.valider(actor, 'dep-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(query).toHaveBeenCalledTimes(0);
  });

  it('bloque une transition ordonnancer invalide', async () => {
    jest.spyOn(service, 'getById').mockResolvedValue({
      id: 'dep-1',
      clientId: actor.tenantId,
      exerciceId: 'ex-1',
      numero: 'DEP/EX/0001',
      dateDepense: '2026-03-05',
      objet: 'Test',
      montant: 10,
      montantPaye: 0,
      statut: 'brouillon',
      createdAt: '2026-03-05T00:00:00.000Z',
      updatedAt: '2026-03-05T00:00:00.000Z',
    } as any);

    await expect(service.ordonnancer(actor, 'dep-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(query).toHaveBeenCalledTimes(0);
  });

  it("bloque l'ancien endpoint marquerPayee et redirige vers le workflow paiements", async () => {
    await expect(
      service.marquerPayee(actor, 'dep-1', {
        datePaiement: '2026-03-05',
        modePaiement: 'virement',
      })
    ).rejects.toThrow('workflow /paiements');
  });

  it('bloque l’annulation directe d’une dépense partiellement payée', async () => {
    jest.spyOn(service, 'getById').mockResolvedValue({
      id: 'dep-1',
      clientId: actor.tenantId,
      exerciceId: 'ex-1',
      numero: 'DEP/EX/0001',
      dateDepense: '2026-03-05',
      objet: 'Test',
      montant: 100,
      montantPaye: 25,
      statut: 'partiellement_payee',
      createdAt: '2026-03-05T00:00:00.000Z',
      updatedAt: '2026-03-05T00:00:00.000Z',
    } as any);

    await expect(service.annuler(actor, 'dep-1', 'Erreur de saisie')).rejects.toThrow('paiements liés');
    expect(query).toHaveBeenCalledTimes(0);
  });

  it("applique le verrou d'exercice avant l'ordonnancement", async () => {
    jest.spyOn(service, 'getById').mockResolvedValue({
      id: 'dep-1',
      clientId: actor.tenantId,
      exerciceId: 'ex-1',
      numero: 'DEP/EX/0001',
      dateDepense: '2026-03-05',
      objet: 'Test',
      montant: 10,
      montantPaye: 0,
      statut: 'validee',
      createdAt: '2026-03-05T00:00:00.000Z',
      updatedAt: '2026-03-05T00:00:00.000Z',
    } as any);
    (exerciceClotureService.assertExerciceMutable as jest.Mock).mockRejectedValueOnce(
      new BadRequestException('verrou')
    );

    await expect(service.ordonnancer(actor, 'dep-1')).rejects.toThrow('verrou');
    expect(exerciceClotureService.assertExerciceMutable).toHaveBeenCalledWith(actor, 'ex-1', 'ordonnancement de dépense');
    expect(query).toHaveBeenCalledTimes(0);
  });

  it("délègue l'annulation comptable d'une dépense au service partagé", async () => {
    jest.spyOn(service, 'getById').mockResolvedValue({
      id: 'dep-1',
      clientId: actor.tenantId,
      exerciceId: 'ex-1',
      numero: 'DEP/EX/0001',
      dateDepense: '2026-03-05',
      objet: 'Test',
      montant: 100,
      montantPaye: 0,
      statut: 'validee',
      createdAt: '2026-03-05T00:00:00.000Z',
      updatedAt: '2026-03-05T00:00:00.000Z',
    } as any);
    query
      .mockResolvedValueOnce(
        makeResult([
          {
            id: 'ecr-1',
            client_id: actor.tenantId,
            exercice_id: 'ex-1',
            numero_piece: 'DEP/EX/0001',
            numero_ligne: 1,
            compte_debit_id: 'cd',
            compte_credit_id: 'cc',
            montant: 100,
            libelle: 'Depense',
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
        ])
      )
      .mockResolvedValueOnce(makeResult([], 1));

    await service.annuler(actor, 'dep-1', 'motif');

    expect((ecrituresComptablesService.createContrepassations as jest.Mock)).toHaveBeenCalledWith(
      actor,
      expect.arrayContaining([expect.objectContaining({ id: 'ecr-1', source_id: 'dep-1' })]),
      expect.objectContaining({
        motif: 'motif',
        expectedExerciceId: 'ex-1',
        expectedSourceId: 'dep-1'
      })
    );
  });
});
