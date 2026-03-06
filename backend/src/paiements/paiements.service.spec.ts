import { BadRequestException } from '@nestjs/common';
import type { QueryResult, QueryResultRow } from 'pg';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import type { PostgresService } from '../common/postgres.service';
import { PaiementsService } from './paiements.service';

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

describe('PaiementsService', () => {
  const query = jest.fn();
  const postgresService = { query } as unknown as PostgresService;
  const service = new PaiementsService(postgresService);
  const internals = service as unknown as {
    getDepenseForPaiement: (...args: unknown[]) => Promise<unknown>;
    getResteAPayer: (...args: unknown[]) => Promise<number>;
    generateNextNumero: (...args: unknown[]) => Promise<string>;
    getPaiementRow: (...args: unknown[]) => Promise<unknown>;
    ensureSuccessfulArtifacts: (...args: unknown[]) => Promise<void>;
    revertSuccessfulArtifacts: (...args: unknown[]) => Promise<void>;
    getNextTentativeNumero: (...args: unknown[]) => Promise<number>;
  };

  beforeEach(() => {
    query.mockReset();
    jest.restoreAllMocks();
  });

  it('refuse la création pour une dépense non ordonnancée', async () => {
    jest.spyOn(internals, 'getDepenseForPaiement').mockResolvedValue({
      id: 'dep-1',
      client_id: actor.tenantId,
      exercice_id: 'ex-1',
      numero: 'DEP-001',
      objet: 'Achat',
      montant: 100,
      montant_paye: 0,
      statut: 'validee',
      fournisseur_id: null,
    });

    await expect(
      service.create(actor, {
        depenseId: 'dep-1',
        exerciceId: 'ex-1',
        montant: 40,
        datePaiement: '2026-03-05',
        modePaiement: 'virement',
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('crée un paiement transmis sur une dépense éligible', async () => {
    jest.spyOn(internals, 'getDepenseForPaiement').mockResolvedValue({
      id: 'dep-1',
      client_id: actor.tenantId,
      exercice_id: 'ex-1',
      numero: 'DEP-001',
      objet: 'Achat',
      montant: 100,
      montant_paye: 0,
      statut: 'ordonnancee',
      fournisseur_id: null,
    });
    jest.spyOn(internals, 'getResteAPayer').mockResolvedValue(100);
    jest.spyOn(internals, 'generateNextNumero').mockResolvedValue('PAY000123');
    jest.spyOn(service, 'getById').mockResolvedValue({
      id: 'pay-1',
      clientId: actor.tenantId,
      exerciceId: 'ex-1',
      numero: 'PAY000123',
      depenseId: 'dep-1',
      montant: 40,
      datePaiement: '2026-03-05',
      modePaiement: 'virement',
      statut: 'transmis',
      tentativeNumero: 1,
      createdAt: '2026-03-05T00:00:00.000Z',
      updatedAt: '2026-03-05T00:00:00.000Z',
    });
    query.mockResolvedValueOnce(makeResult([{ id: 'pay-1' }]));

    const result = await service.create(actor, {
      depenseId: 'dep-1',
      exerciceId: 'ex-1',
      montant: 40,
      datePaiement: '2026-03-05',
      modePaiement: 'virement',
    });

    expect(query).toHaveBeenCalledTimes(1);
    expect(result.statut).toBe('transmis');
  });

  it('accepte un paiement transmis sans déclencher les artefacts comptables', async () => {
    jest.spyOn(internals, 'getPaiementRow').mockResolvedValue({
      id: 'pay-1',
      client_id: actor.tenantId,
      exercice_id: 'ex-1',
      numero: 'PAY000001',
      depense_id: 'dep-1',
      montant: 50,
      date_paiement: '2026-03-05',
      mode_paiement: 'virement',
      reference_paiement: null,
      observations: null,
      statut: 'transmis',
      motif_annulation: null,
      date_annulation: null,
      motif_rejet: null,
      date_rejet: null,
      tentative_numero: 1,
      paiement_origine_id: null,
      paiement_repris_de_id: null,
      created_by: actor.sub,
      created_at: '2026-03-05T00:00:00.000Z',
      updated_at: '2026-03-05T00:00:00.000Z',
      depense_numero: 'DEP-001',
      depense_objet: 'Achat',
      depense_montant: 100,
      depense_montant_paye: 0,
      depense_statut: 'ordonnancee',
      fournisseur_id: null,
      fournisseur_nom: null,
      fournisseur_code: null,
      ecritures_count: 0,
    });
    jest.spyOn(internals, 'getDepenseForPaiement').mockResolvedValue({
      id: 'dep-1',
      client_id: actor.tenantId,
      exercice_id: 'ex-1',
      numero: 'DEP-001',
      objet: 'Achat',
      montant: 100,
      montant_paye: 0,
      statut: 'ordonnancee',
      fournisseur_id: null,
    });
    const ensureSuccessfulArtifacts = jest.spyOn(internals, 'ensureSuccessfulArtifacts').mockResolvedValue(undefined);
    jest.spyOn(service, 'getById').mockResolvedValue({
      id: 'pay-1',
      clientId: actor.tenantId,
      exerciceId: 'ex-1',
      numero: 'PAY000001',
      depenseId: 'dep-1',
      montant: 50,
      datePaiement: '2026-03-05',
      modePaiement: 'virement',
      statut: 'accepte',
      tentativeNumero: 1,
      createdAt: '2026-03-05T00:00:00.000Z',
      updatedAt: '2026-03-05T00:00:00.000Z',
    });
    query.mockResolvedValueOnce(makeResult([]));

    const result = await service.accepter(actor, 'pay-1');

    expect(ensureSuccessfulArtifacts).not.toHaveBeenCalled();
    expect(result.statut).toBe('accepte');
  });

  it('rejette un paiement accepté sans inverser d artefacts comptables', async () => {
    jest.spyOn(internals, 'getPaiementRow').mockResolvedValue({
      id: 'pay-1',
      client_id: actor.tenantId,
      exercice_id: 'ex-1',
      numero: 'PAY000001',
      depense_id: 'dep-1',
      montant: 50,
      date_paiement: '2026-03-05',
      mode_paiement: 'virement',
      reference_paiement: null,
      observations: null,
      statut: 'accepte',
      motif_annulation: null,
      date_annulation: null,
      motif_rejet: null,
      date_rejet: null,
      tentative_numero: 1,
      paiement_origine_id: null,
      paiement_repris_de_id: null,
      created_by: actor.sub,
      created_at: '2026-03-05T00:00:00.000Z',
      updated_at: '2026-03-05T00:00:00.000Z',
      depense_numero: 'DEP-001',
      depense_objet: 'Achat',
      depense_montant: 100,
      depense_montant_paye: 0,
      depense_statut: 'ordonnancee',
      fournisseur_id: null,
      fournisseur_nom: null,
      fournisseur_code: null,
      ecritures_count: 2,
    });
    const revertSuccessfulArtifacts = jest.spyOn(internals, 'revertSuccessfulArtifacts').mockResolvedValue(undefined);
    jest.spyOn(service, 'getById').mockResolvedValue({
      id: 'pay-1',
      clientId: actor.tenantId,
      exerciceId: 'ex-1',
      numero: 'PAY000001',
      depenseId: 'dep-1',
      montant: 50,
      datePaiement: '2026-03-05',
      modePaiement: 'virement',
      statut: 'rejete',
      motifRejet: 'Retour banque',
      tentativeNumero: 1,
      createdAt: '2026-03-05T00:00:00.000Z',
      updatedAt: '2026-03-05T00:00:00.000Z',
    });
    query.mockResolvedValueOnce(makeResult([]));

    const result = await service.rejeter(actor, 'pay-1', { motif: 'Retour banque' });

    expect(revertSuccessfulArtifacts).not.toHaveBeenCalled();
    expect(result.statut).toBe('rejete');
  });

  it('rejette un paiement exécuté et inverse les artefacts comptables', async () => {
    jest.spyOn(internals, 'getPaiementRow').mockResolvedValue({
      id: 'pay-1',
      client_id: actor.tenantId,
      exercice_id: 'ex-1',
      numero: 'PAY000001',
      depense_id: 'dep-1',
      montant: 50,
      date_paiement: '2026-03-05',
      mode_paiement: 'virement',
      reference_paiement: null,
      observations: null,
      statut: 'execute',
      motif_annulation: null,
      date_annulation: null,
      motif_rejet: null,
      date_rejet: null,
      date_retour: null,
      reference_retour: null,
      tentative_numero: 1,
      paiement_origine_id: null,
      paiement_repris_de_id: null,
      created_by: actor.sub,
      updated_by: actor.sub,
      created_at: '2026-03-05T00:00:00.000Z',
      updated_at: '2026-03-05T00:00:00.000Z',
      depense_numero: 'DEP-001',
      depense_objet: 'Achat',
      depense_montant: 100,
      depense_montant_paye: 50,
      depense_statut: 'partiellement_payee',
      fournisseur_id: null,
      fournisseur_nom: null,
      fournisseur_code: null,
      ecritures_count: 2,
    });
    const revertSuccessfulArtifacts = jest.spyOn(internals, 'revertSuccessfulArtifacts').mockResolvedValue(undefined);
    jest.spyOn(service, 'getById').mockResolvedValue({
      id: 'pay-1',
      clientId: actor.tenantId,
      exerciceId: 'ex-1',
      numero: 'PAY000001',
      depenseId: 'dep-1',
      montant: 50,
      datePaiement: '2026-03-05',
      modePaiement: 'virement',
      statut: 'rejete',
      motifRejet: 'Retour banque',
      tentativeNumero: 1,
      createdAt: '2026-03-05T00:00:00.000Z',
      updatedAt: '2026-03-05T00:00:00.000Z',
    });
    query.mockResolvedValueOnce(makeResult([]));

    const result = await service.rejeter(actor, 'pay-1', { motif: 'Retour banque' });

    expect(revertSuccessfulArtifacts).toHaveBeenCalledTimes(1);
    expect(result.statut).toBe('rejete');
  });

  it('reprend un paiement rejeté en créant une nouvelle tentative rattachée', async () => {
    jest.spyOn(internals, 'getPaiementRow').mockResolvedValue({
      id: 'pay-1',
      client_id: actor.tenantId,
      exercice_id: 'ex-1',
      numero: 'PAY000001',
      depense_id: 'dep-1',
      montant: 50,
      date_paiement: '2026-03-05',
      mode_paiement: 'virement',
      reference_paiement: 'REF',
      observations: 'Ancienne tentative',
      statut: 'rejete',
      motif_annulation: null,
      date_annulation: null,
      motif_rejet: 'RIB invalide',
      date_rejet: '2026-03-06',
      date_retour: null,
      reference_retour: null,
      tentative_numero: 1,
      paiement_origine_id: null,
      paiement_repris_de_id: null,
      created_by: actor.sub,
      updated_by: actor.sub,
      created_at: '2026-03-05T00:00:00.000Z',
      updated_at: '2026-03-06T00:00:00.000Z',
      depense_numero: 'DEP-001',
      depense_objet: 'Achat',
      depense_montant: 100,
      depense_montant_paye: 0,
      depense_statut: 'ordonnancee',
      fournisseur_id: null,
      fournisseur_nom: null,
      fournisseur_code: null,
      ecritures_count: 0,
    });
    jest.spyOn(internals, 'getDepenseForPaiement').mockResolvedValue({
      id: 'dep-1',
      client_id: actor.tenantId,
      exercice_id: 'ex-1',
      numero: 'DEP-001',
      objet: 'Achat',
      montant: 100,
      montant_paye: 0,
      statut: 'ordonnancee',
      fournisseur_id: null,
    });
    jest.spyOn(internals, 'getResteAPayer').mockResolvedValue(100);
    jest.spyOn(internals, 'generateNextNumero').mockResolvedValue('PAY000002');
    jest.spyOn(internals, 'getNextTentativeNumero').mockResolvedValue(2);
    jest.spyOn(service, 'getById').mockResolvedValue({
      id: 'pay-2',
      clientId: actor.tenantId,
      exerciceId: 'ex-1',
      numero: 'PAY000002',
      depenseId: 'dep-1',
      montant: 50,
      datePaiement: '2026-03-05',
      modePaiement: 'virement',
      statut: 'transmis',
      tentativeNumero: 2,
      paiementOrigineId: 'pay-1',
      paiementReprisDeId: 'pay-1',
      createdAt: '2026-03-06T00:00:00.000Z',
      updatedAt: '2026-03-06T00:00:00.000Z',
    });
    query.mockResolvedValueOnce(makeResult([{ id: 'pay-2' }]));

    const result = await service.reprendre(actor, 'pay-1', {});

    expect(result.tentativeNumero).toBe(2);
    expect(result.paiementReprisDeId).toBe('pay-1');
  });

  it('reprend aussi un paiement annulé en créant une nouvelle tentative rattachée', async () => {
    jest.spyOn(internals, 'getPaiementRow').mockResolvedValue({
      id: 'pay-1',
      client_id: actor.tenantId,
      exercice_id: 'ex-1',
      numero: 'PAY000001',
      depense_id: 'dep-1',
      montant: 50,
      date_paiement: '2026-03-05',
      mode_paiement: 'virement',
      reference_paiement: 'REF',
      observations: 'Tentative annulée',
      statut: 'annule',
      motif_annulation: 'Doublon',
      date_annulation: '2026-03-06',
      motif_rejet: null,
      date_rejet: null,
      date_retour: null,
      reference_retour: null,
      tentative_numero: 1,
      paiement_origine_id: null,
      paiement_repris_de_id: null,
      created_by: actor.sub,
      updated_by: actor.sub,
      created_at: '2026-03-05T00:00:00.000Z',
      updated_at: '2026-03-06T00:00:00.000Z',
      depense_numero: 'DEP-001',
      depense_objet: 'Achat',
      depense_montant: 100,
      depense_montant_paye: 0,
      depense_statut: 'ordonnancee',
      fournisseur_id: null,
      fournisseur_nom: null,
      fournisseur_code: null,
      ecritures_count: 0,
    });
    jest.spyOn(internals, 'getDepenseForPaiement').mockResolvedValue({
      id: 'dep-1',
      client_id: actor.tenantId,
      exercice_id: 'ex-1',
      numero: 'DEP-001',
      objet: 'Achat',
      montant: 100,
      montant_paye: 0,
      statut: 'ordonnancee',
      fournisseur_id: null,
    });
    jest.spyOn(internals, 'getResteAPayer').mockResolvedValue(100);
    jest.spyOn(internals, 'generateNextNumero').mockResolvedValue('PAY000003');
    jest.spyOn(internals, 'getNextTentativeNumero').mockResolvedValue(2);
    jest.spyOn(service, 'getById').mockResolvedValue({
      id: 'pay-3',
      clientId: actor.tenantId,
      exerciceId: 'ex-1',
      numero: 'PAY000003',
      depenseId: 'dep-1',
      montant: 50,
      datePaiement: '2026-03-05',
      modePaiement: 'virement',
      statut: 'transmis',
      tentativeNumero: 2,
      paiementOrigineId: 'pay-1',
      paiementReprisDeId: 'pay-1',
      createdAt: '2026-03-06T00:00:00.000Z',
      updatedAt: '2026-03-06T00:00:00.000Z',
    });
    query.mockResolvedValueOnce(makeResult([{ id: 'pay-3' }]));

    const result = await service.reprendre(actor, 'pay-1', {});

    expect(result.tentativeNumero).toBe(2);
    expect(result.paiementReprisDeId).toBe('pay-1');
  });

  it('scope le calcul du reste a payer par tenant', async () => {
    query.mockResolvedValueOnce(makeResult([{ total: 40 }]));

    const reste = await (
      service as unknown as {
        getResteAPayer: (tenantId: string, depenseId: string, depenseMontant: number) => Promise<number>;
      }
    ).getResteAPayer(actor.tenantId, 'dep-1', 100);

    expect(reste).toBe(60);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('WHERE client_id = $1'), [actor.tenantId, 'dep-1']);
  });

  it('scope le numero de tentative par tenant', async () => {
    query.mockResolvedValueOnce(makeResult([{ max_attempt: 2 }]));

    const nextAttempt = await (
      service as unknown as {
        getNextTentativeNumero: (tenantId: string, depenseId: string, rootPaiementId: string) => Promise<number>;
      }
    ).getNextTentativeNumero(actor.tenantId, 'dep-1', 'root-1');

    expect(nextAttempt).toBe(3);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE client_id = $1'),
      [actor.tenantId, 'dep-1', 'root-1']
    );
  });
});
