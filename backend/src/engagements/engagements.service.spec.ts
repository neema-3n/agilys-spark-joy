import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { QueryResult, QueryResultRow } from 'pg';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import type { PostgresService } from '../common/postgres.service';
import { EngagementsService } from './engagements.service';

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

const makeReservation = (overrides: Record<string, unknown> = {}) => ({
  id: 'res-1',
  client_id: 'tenant-1',
  exercice_id: 'ex-1',
  ligne_budgetaire_id: 'lb-1',
  montant: 1000,
  objet: 'Objet reservation',
  beneficiaire: null,
  projet_id: null,
  statut: 'active',
  ...overrides
});

const makeEngagementRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'eng-1',
  numero: 'ENG/EX-2026/001',
  exercice_id: 'ex-1',
  client_id: 'tenant-1',
  reservation_credit_id: null,
  ligne_budgetaire_id: 'lb-1',
  objet: 'Objet',
  montant: 500,
  fournisseur_id: null,
  beneficiaire: null,
  projet_id: null,
  statut: 'valide',
  date_creation: '2026-01-01',
  date_validation: null,
  created_by: 'user-1',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  motif_annulation: null,
  observations: null,
  ligne_budgetaire_libelle: 'LB',
  ligne_budgetaire_disponible: 1000,
  fournisseur_nom: null,
  fournisseur_code: null,
  projet_code: null,
  projet_nom: null,
  reservation_numero: null,
  reservation_statut: null,
  montant_bons_commande: 0,
  ecritures_count: 0,
  ...overrides
});

describe('EngagementsService', () => {
  const query = jest.fn();
  const postgresService = { query } as unknown as PostgresService;
  const service = new EngagementsService(postgresService);

  beforeEach(() => {
    query.mockReset();
  });

  it("refuse la conversion si l'exercice de la réservation ne correspond pas", async () => {
    query.mockResolvedValueOnce(makeResult([makeReservation({ exercice_id: 'ex-autre' })]));

    await expect(
      service.createFromReservation(actor, {
        reservationId: 'res-1',
        exerciceId: 'ex-1'
      })
    ).rejects.toThrow('ne correspond pas à l’exercice demandé');
  });

  it('refuse la conversion quand le statut de réservation est inéligible', async () => {
    query.mockResolvedValueOnce(makeResult([makeReservation({ statut: 'utilisee' })]));

    await expect(
      service.createFromReservation(actor, {
        reservationId: 'res-1',
        exerciceId: 'ex-1'
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuse la conversion en dépassement du montant disponible', async () => {
    query
      .mockResolvedValueOnce(makeResult([makeReservation()]))
      .mockResolvedValueOnce(makeResult([{ montant: 1000 }]))
      .mockResolvedValueOnce(makeResult([{ montant: 900 }]));

    await expect(
      service.createFromReservation(actor, {
        reservationId: 'res-1',
        exerciceId: 'ex-1',
        montant: 200
      })
    ).rejects.toThrow('dépasse le montant disponible');
  });

  it("refuse la validation d'un engagement déjà validé", async () => {
    query.mockResolvedValueOnce(makeResult([makeEngagementRow({ statut: 'valide' })]));

    await expect(service.valider(actor, 'eng-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('isole strictement le tenant lors de la conversion', async () => {
    query.mockResolvedValueOnce(makeResult([]));

    await expect(
      service.createFromReservation(actor, {
        reservationId: 'res-tenant-2',
        exerciceId: 'ex-1'
      })
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('utilise le montant disponible comme fallback si aucun montant explicite nest fourni', async () => {
    query.mockResolvedValueOnce(makeResult([makeReservation()]));

    const getMontantDisponibleSpy = jest.spyOn(service, 'getMontantDisponibleReservation').mockResolvedValue(125);
    const originalCreateInternal = (service as unknown as { createInternal: unknown }).createInternal;
    const originalSync = (service as unknown as { syncReservationStatusFromEngagement: unknown })
      .syncReservationStatusFromEngagement;
    const createInternalSpy = jest.fn().mockResolvedValue({
      id: 'eng-1',
      numero: 'ENG/EX-2026/001',
      exerciceId: 'ex-1',
      clientId: 'tenant-1',
      reservationCreditId: 'res-1',
      ligneBudgetaireId: 'lb-1',
      objet: 'Objet reservation',
      montant: 125,
      statut: 'brouillon',
      dateCreation: '2026-01-01',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    });
    const syncSpy = jest.fn().mockResolvedValue(undefined);
    (service as unknown as { createInternal: unknown }).createInternal = createInternalSpy;
    (service as unknown as { syncReservationStatusFromEngagement: unknown }).syncReservationStatusFromEngagement = syncSpy;

    await service.createFromReservation(actor, {
      reservationId: 'res-1',
      exerciceId: 'ex-1'
    });

    expect(createInternalSpy).toHaveBeenCalledWith(
      actor,
      expect.objectContaining({
        montant: 125
      })
    );

    getMontantDisponibleSpy.mockRestore();
    (service as unknown as { createInternal: unknown }).createInternal = originalCreateInternal;
    (service as unknown as { syncReservationStatusFromEngagement: unknown }).syncReservationStatusFromEngagement =
      originalSync;
  });

  it('filtre les engagements par tenant pour calculer le montant disponible de reservation', async () => {
    query
      .mockResolvedValueOnce(makeResult([{ montant: 1000 }]))
      .mockResolvedValueOnce(makeResult([{ montant: 400 }]));

    const montantDisponible = await service.getMontantDisponibleReservation(actor, 'res-1');

    expect(montantDisponible).toBe(600);
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('AND client_id = $2'),
      ['res-1', actor.tenantId]
    );
  });

  it("resynchronise la reservation source apres annulation d'un engagement", async () => {
    query
      .mockResolvedValueOnce(makeResult([makeEngagementRow({ statut: 'brouillon', reservation_credit_id: 'res-1' })]))
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([], 1))
      .mockResolvedValueOnce(makeResult([makeEngagementRow({ statut: 'annule', reservation_credit_id: 'res-1' })]));

    const originalSync = (service as unknown as { syncReservationStatusFromEngagement: unknown })
      .syncReservationStatusFromEngagement;
    const syncSpy = jest.fn().mockResolvedValue(undefined);
    (service as unknown as { syncReservationStatusFromEngagement: unknown }).syncReservationStatusFromEngagement = syncSpy;

    await service.annuler(actor, 'eng-1', 'motif');

    expect(syncSpy).toHaveBeenCalledWith(actor, 'res-1');
    (service as unknown as { syncReservationStatusFromEngagement: unknown }).syncReservationStatusFromEngagement =
      originalSync;
  });
});
