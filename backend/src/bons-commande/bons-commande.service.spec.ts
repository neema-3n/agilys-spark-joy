import { BadRequestException } from '@nestjs/common';
import type { QueryResult, QueryResultRow } from 'pg';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import type { PostgresService } from '../common/postgres.service';
import type { EcrituresComptablesService } from '../ecritures-comptables/ecritures-comptables.service';
import type { ExerciceClotureService } from '../exercice-cloture/exercice-cloture.service';
import { BonsCommandeService } from './bons-commande.service';

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

describe('BonsCommandeService', () => {
  const query = jest.fn();
  const postgresService = { query } as unknown as PostgresService;
  const ecrituresComptablesService = {
    ensureGeneratedForOperation: jest.fn()
  } as unknown as EcrituresComptablesService;
  const exerciceClotureService = {
    assertExerciceMutable: jest.fn()
  } as unknown as ExerciceClotureService;
  const service = new BonsCommandeService(postgresService, ecrituresComptablesService, exerciceClotureService);

  beforeEach(() => {
    query.mockReset();
    (exerciceClotureService.assertExerciceMutable as jest.Mock).mockReset().mockResolvedValue(undefined);
  });

  it('refuse la creation dun BC si engagement hors statut actif', async () => {
    query
      .mockResolvedValueOnce(makeResult([{ code: 'EX2026' }]))
      .mockResolvedValueOnce(makeResult([{ id: 'fournisseur-1' }]))
      .mockResolvedValueOnce(
        makeResult([
          {
            id: 'eng-1',
            ligne_budgetaire_id: 'lb-1',
            projet_id: null,
            statut: 'brouillon'
          }
        ])
      );

    await expect(
      service.create(actor, {
        exerciceId: 'ex-1',
        fournisseurId: 'fournisseur-1',
        engagementId: 'eng-1',
        ligneBudgetaireId: 'lb-1',
        objet: 'Achat',
        montant: 100,
        dateCommande: '2026-01-15'
      })
    ).rejects.toThrow("engagement actif");
  });

  it('refuse la creation dun BC si la ligne ne correspond pas a engagement', async () => {
    query
      .mockResolvedValueOnce(makeResult([{ code: 'EX2026' }]))
      .mockResolvedValueOnce(makeResult([{ id: 'fournisseur-1' }]))
      .mockResolvedValueOnce(
        makeResult([
          {
            id: 'eng-1',
            ligne_budgetaire_id: 'lb-engagement',
            projet_id: null,
            statut: 'valide'
          }
        ])
      )
      .mockResolvedValueOnce(makeResult([{ id: 'lb-form' }]));

    await expect(
      service.create(actor, {
        exerciceId: 'ex-1',
        fournisseurId: 'fournisseur-1',
        engagementId: 'eng-1',
        ligneBudgetaireId: 'lb-form',
        objet: 'Achat',
        montant: 100,
        dateCommande: '2026-01-15'
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuse la creation dun BC cross-tenant ou hors exercice sur engagement', async () => {
    query
      .mockResolvedValueOnce(makeResult([{ code: 'EX2026' }]))
      .mockResolvedValueOnce(makeResult([{ id: 'fournisseur-1' }]))
      .mockResolvedValueOnce(makeResult([]));

    await expect(
      service.create(actor, {
        exerciceId: 'ex-1',
        fournisseurId: 'fournisseur-1',
        engagementId: 'eng-other-tenant',
        objet: 'Achat',
        montant: 100,
        dateCommande: '2026-01-15'
      })
    ).rejects.toThrow('tenant/exercice');
  });

  it("applique le verrou d'exercice avant la validation d'un bon de commande", async () => {
    jest.spyOn(service, 'getById').mockResolvedValue({
      id: 'bc-1',
      exerciceId: 'ex-1',
      statut: 'brouillon'
    } as any);
    (exerciceClotureService.assertExerciceMutable as jest.Mock).mockRejectedValueOnce(
      new BadRequestException('verrou')
    );

    await expect(service.valider(actor, 'bc-1')).rejects.toThrow('verrou');
    expect(exerciceClotureService.assertExerciceMutable).toHaveBeenCalledWith(actor, 'ex-1', 'validation de bon de commande');
    expect(query).toHaveBeenCalledTimes(0);
  });
});
