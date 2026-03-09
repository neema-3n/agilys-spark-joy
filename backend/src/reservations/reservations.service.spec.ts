import { BadRequestException } from '@nestjs/common';
import type { QueryResult, QueryResultRow } from 'pg';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import type { PostgresService } from '../common/postgres.service';
import type { EcrituresComptablesService } from '../ecritures-comptables/ecritures-comptables.service';
import type { ExerciceClotureService } from '../exercice-cloture/exercice-cloture.service';
import { ReservationsService } from './reservations.service';

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

const makeReservationRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'res-1',
  numero: 'RES-00001',
  exercice_id: 'ex-1',
  ligne_budgetaire_id: 'lb-1',
  montant: 1000,
  objet: 'Objet',
  beneficiaire: null,
  projet_id: null,
  date_reservation: '2026-01-01',
  date_expiration: null,
  statut: 'active',
  motif_annulation: null,
  created_by: 'user-1',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  client_id: 'tenant-1',
  ecritures_count: 0,
  ligne_budgetaire_libelle: 'LB',
  ligne_budgetaire_disponible: 1000,
  projet_code: null,
  projet_nom: null,
  projet_statut: null,
  engagements_json: [],
  ...overrides
});

describe('ReservationsService', () => {
  const query = jest.fn();
  const postgresService = { query } as unknown as PostgresService;
  const ecrituresComptablesService = {
    ensureGeneratedForOperation: jest.fn(),
    createContrepassations: jest.fn()
  } as unknown as EcrituresComptablesService;
  const exerciceClotureService = {
    assertExerciceMutable: jest.fn()
  } as unknown as ExerciceClotureService;
  const service = new ReservationsService(postgresService, ecrituresComptablesService, exerciceClotureService);

  beforeEach(() => {
    query.mockReset();
    (exerciceClotureService.assertExerciceMutable as jest.Mock).mockReset().mockResolvedValue(undefined);
  });

  it("refuse la transition 'utiliser' quand la réservation n'est pas active", async () => {
    query.mockResolvedValueOnce(makeResult([makeReservationRow({ statut: 'annulee' })]));

    await expect(service.utiliser(actor, 'res-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('valide le scope tenant/exercice de la ligne budgétaire à la création', async () => {
    query
      .mockResolvedValueOnce(makeResult([{ code: 'EX-2026' }]))
      .mockResolvedValueOnce(makeResult([]));

    await expect(
      service.create(actor, {
        exerciceId: 'ex-1',
        ligneBudgetaireId: 'lb-invalide',
        montant: 200,
        objet: 'Achat'
      })
    ).rejects.toThrow('Ligne budgétaire invalide');
  });

  it('valide le scope tenant/exercice du projet à la mise à jour', async () => {
    query
      .mockResolvedValueOnce(makeResult([makeReservationRow()]))
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([]));

    await expect(
      service.update(actor, 'res-1', {
        projetId: 'projet-invalide'
      })
    ).rejects.toThrow('Projet invalide');
  });

  it("délègue l'annulation comptable au service partagé de contre-passation", async () => {
    query
      .mockResolvedValueOnce(makeResult([makeReservationRow()]))
      .mockResolvedValueOnce(
        makeResult([
          {
            id: 'ecr-1',
            client_id: actor.tenantId,
            exercice_id: 'ex-1',
            numero_piece: 'RES-00001',
            numero_ligne: 1,
            compte_debit_id: 'cd',
            compte_credit_id: 'cc',
            montant: 1000,
            libelle: 'Reservation',
            type_operation: 'reservation',
            source_id: 'res-1',
            regle_comptable_id: 'reg-1',
            engagement_id: null,
            reservation_id: 'res-1',
            bon_commande_id: null,
            facture_id: null,
            depense_id: null,
            paiement_id: null
          }
        ])
      )
      .mockResolvedValueOnce(makeResult([], 1))
      .mockResolvedValueOnce(makeResult([makeReservationRow({ statut: 'annulee', motif_annulation: 'motif' })]));

    await service.annuler(actor, 'res-1', 'motif');

    expect((ecrituresComptablesService.createContrepassations as jest.Mock)).toHaveBeenCalledWith(
      actor,
      expect.arrayContaining([expect.objectContaining({ id: 'ecr-1', source_id: 'res-1' })]),
      expect.objectContaining({
        motif: 'motif',
        expectedExerciceId: 'ex-1',
        expectedSourceId: 'res-1'
      })
    );
  });

  it("applique le verrou d'exercice avant de consommer une réservation", async () => {
    query.mockResolvedValueOnce(makeResult([makeReservationRow()]));
    (exerciceClotureService.assertExerciceMutable as jest.Mock).mockRejectedValueOnce(new BadRequestException('verrou'));

    await expect(service.utiliser(actor, 'res-1')).rejects.toThrow('verrou');
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('preserve les rattachements analytiques projet et engagements dans la vue', async () => {
    query.mockResolvedValueOnce(
      makeResult([
        makeReservationRow({
          projet_id: 'prj-1',
          projet_code: 'CC01-PROJ-A',
          projet_nom: 'Projet A',
          projet_statut: 'en_cours',
          engagements_json: [{ id: 'eng-1', numero: 'ENG-1', montant: 250, statut: 'valide' }],
        }),
      ])
    );

    const result = await service.getById(actor, 'res-1');

    expect(result.projetId).toBe('prj-1');
    expect(result.projet).toEqual(
      expect.objectContaining({
        id: 'prj-1',
        code: 'CC01-PROJ-A',
        nom: 'Projet A',
      })
    );
    expect(result.engagements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'eng-1',
          numero: 'ENG-1',
          montant: 250,
        }),
      ])
    );
  });
});
