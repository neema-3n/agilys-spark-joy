import { BadRequestException } from '@nestjs/common';
import type { QueryResult, QueryResultRow } from 'pg';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import type { PostgresService } from '../common/postgres.service';
import type { EcrituresComptablesService } from '../ecritures-comptables/ecritures-comptables.service';
import type { ExerciceClotureService } from '../exercice-cloture/exercice-cloture.service';
import { FacturesService } from './factures.service';

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

describe('FacturesService', () => {
  const query = jest.fn();
  const postgresService = { query } as unknown as PostgresService;
  const ecrituresComptablesService = {
    ensureGeneratedForOperation: jest.fn(),
    createContrepassations: jest.fn()
  } as unknown as EcrituresComptablesService;
  const exerciceClotureService = {
    assertExerciceMutable: jest.fn()
  } as unknown as ExerciceClotureService;
  const service = new FacturesService(postgresService, ecrituresComptablesService, exerciceClotureService);

  beforeEach(() => {
    jest.restoreAllMocks();
    query.mockReset();
    (exerciceClotureService.assertExerciceMutable as jest.Mock).mockReset().mockResolvedValue(undefined);
  });

  it('refuse la creation de facture sans numero fournisseur', async () => {
    const payloadWithoutNumero = {
      exerciceId: 'ex-1',
      fournisseurId: 'f-1',
      objet: 'Facture test',
      dateFacture: '2026-01-15',
      montantHT: 100,
      montantTVA: 20,
      montantTTC: 120
    } as unknown as Parameters<FacturesService['create']>[1];

    await expect(
      service.create(actor, payloadWithoutNumero)
    ).rejects.toThrow('numero de facture fournisseur');
    expect(query).toHaveBeenCalledTimes(0);
  });

  it('refuse la creation de facture sans reference de piece', async () => {
    const payloadWithoutPiece = {
      exerciceId: 'ex-1',
      fournisseurId: 'f-1',
      objet: 'Facture test',
      dateFacture: '2026-01-15',
      numeroFactureFournisseur: 'F-2026-001',
      montantHT: 100,
      montantTVA: 20,
      montantTTC: 120
    } as unknown as Parameters<FacturesService['create']>[1];

    await expect(service.create(actor, payloadWithoutPiece)).rejects.toThrow('reference de piece');
    expect(query).toHaveBeenCalledTimes(0);
  });

  it('refuse la creation de facture sur BC non valide', async () => {
    query
      .mockResolvedValueOnce(makeResult([{ code: 'EX2026' }]))
      .mockResolvedValueOnce(makeResult([{ id: 'f-1' }]))
      .mockResolvedValueOnce(
        makeResult([
          {
            id: 'bc-1',
            fournisseur_id: 'f-1',
            engagement_id: null,
            ligne_budgetaire_id: null,
            projet_id: null,
            statut: 'brouillon'
          }
        ])
      );

    await expect(
      service.create(actor, {
        exerciceId: 'ex-1',
        fournisseurId: 'f-1',
        bonCommandeId: 'bc-1',
        objet: 'Facture test',
        dateFacture: '2026-01-15',
        numeroFactureFournisseur: 'F-2026-001',
        referencePiece: 'PJ-2026-001',
        montantHT: 100,
        montantTVA: 20,
        montantTTC: 120
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuse la creation de facture avec BC hors scope tenant/exercice', async () => {
    query
      .mockResolvedValueOnce(makeResult([{ code: 'EX2026' }]))
      .mockResolvedValueOnce(makeResult([{ id: 'f-1' }]))
      .mockResolvedValueOnce(makeResult([]));

    await expect(
      service.create(actor, {
        exerciceId: 'ex-1',
        fournisseurId: 'f-1',
        bonCommandeId: 'bc-other-tenant',
        objet: 'Facture test',
        dateFacture: '2026-01-15',
        numeroFactureFournisseur: 'F-2026-001',
        referencePiece: 'PJ-2026-002',
        montantHT: 100,
        montantTVA: 20,
        montantTTC: 120
      })
    ).rejects.toThrow('tenant/exercice');
  });

  it('bloque une transition statut interdite via update', async () => {
    query
      .mockResolvedValueOnce(
        makeResult([
          {
            id: 'fac-1',
            statut: 'brouillon',
            bon_commande_id: null,
            montant_ttc: 120
          }
        ])
      )
      .mockResolvedValueOnce(makeResult([]));

    await expect(
      service.update(actor, 'fac-1', {
        statut: 'payee'
      })
    ).rejects.toThrow('Transition interdite via mise a jour generique');
  });

  it("délègue l'annulation comptable d'une facture au service partagé", async () => {
    query
      .mockResolvedValueOnce(
        makeResult([
          {
            id: 'fac-1',
            client_id: actor.tenantId,
            exercice_id: 'ex-1',
            numero: 'FAC/EX-2026/0001',
            date_facture: '2026-01-15',
            date_echeance: null,
            fournisseur_id: 'f-1',
            bon_commande_id: null,
            engagement_id: null,
            ligne_budgetaire_id: null,
            projet_id: null,
            objet: 'Facture test',
            numero_facture_fournisseur: 'F-2026-001',
            reference_piece: 'PJ-001',
            montant_ht: 100,
            montant_tva: 20,
            montant_ttc: 120,
            montant_liquide: 120,
            statut: 'validee',
            date_validation: null,
            observations: null,
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
            created_by: actor.sub,
            fournisseur_nom: null,
            fournisseur_code: null,
            bon_commande_numero: null,
            engagement_numero: null,
            ligne_budgetaire_libelle: null,
            projet_nom: null,
            projet_code: null,
            ecritures_count: 1
          }
        ])
      )
      .mockResolvedValueOnce(
        makeResult([
          {
            id: 'ecr-1',
            client_id: actor.tenantId,
            exercice_id: 'ex-1',
            numero_piece: 'FAC/EX-2026/0001',
            numero_ligne: 1,
            compte_debit_id: 'cd',
            compte_credit_id: 'cc',
            montant: 120,
            libelle: 'Facture',
            type_operation: 'facture',
            source_id: 'fac-1',
            regle_comptable_id: 'reg-1',
            engagement_id: null,
            reservation_id: null,
            bon_commande_id: null,
            facture_id: 'fac-1',
            depense_id: null,
            paiement_id: null
          }
        ])
      )
      .mockResolvedValueOnce(makeResult([], 1))
      .mockResolvedValueOnce(
        makeResult([
          {
            id: 'fac-1',
            client_id: actor.tenantId,
            exercice_id: 'ex-1',
            numero: 'FAC/EX-2026/0001',
            date_facture: '2026-01-15',
            date_echeance: null,
            fournisseur_id: 'f-1',
            bon_commande_id: null,
            engagement_id: null,
            ligne_budgetaire_id: null,
            projet_id: null,
            objet: 'Facture test',
            numero_facture_fournisseur: 'F-2026-001',
            reference_piece: 'PJ-001',
            montant_ht: 100,
            montant_tva: 20,
            montant_ttc: 120,
            montant_liquide: 120,
            statut: 'annulee',
            date_validation: null,
            observations: 'motif',
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
            created_by: actor.sub,
            fournisseur_nom: null,
            fournisseur_code: null,
            bon_commande_numero: null,
            engagement_numero: null,
            ligne_budgetaire_libelle: null,
            projet_nom: null,
            projet_code: null,
            ecritures_count: 1
          }
        ])
      );

    await service.annuler(actor, 'fac-1', 'motif');

    expect((ecrituresComptablesService.createContrepassations as jest.Mock)).toHaveBeenCalledWith(
      actor,
      expect.arrayContaining([expect.objectContaining({ id: 'ecr-1', source_id: 'fac-1' })]),
      expect.objectContaining({
        motif: 'motif',
        expectedExerciceId: 'ex-1',
        expectedSourceId: 'fac-1'
      })
    );
  });

  it("applique le verrou d'exercice avant la validation d'une facture", async () => {
    jest.spyOn(service, 'getById').mockResolvedValue({
      id: 'fac-1',
      exerciceId: 'ex-1',
      statut: 'brouillon'
    } as any);
    (exerciceClotureService.assertExerciceMutable as jest.Mock).mockRejectedValueOnce(
      new BadRequestException('verrou')
    );

    await expect(service.valider(actor, 'fac-1')).rejects.toThrow('verrou');
    expect(exerciceClotureService.assertExerciceMutable).toHaveBeenCalledWith(actor, 'ex-1', 'validation de facture');
    expect(query).toHaveBeenCalledTimes(0);
  });

  it('preserve les rattachements analytiques projet/engagement/ligne dans la vue', async () => {
    query.mockResolvedValueOnce(
      makeResult([
        {
          id: 'fac-1',
          client_id: actor.tenantId,
          exercice_id: 'ex-1',
          numero: 'FAC/EX2026/0001',
          date_facture: '2026-01-15',
          date_echeance: null,
          fournisseur_id: 'f-1',
          bon_commande_id: 'bc-1',
          engagement_id: 'eng-1',
          ligne_budgetaire_id: 'lb-1',
          projet_id: 'prj-1',
          objet: 'Facture test',
          numero_facture_fournisseur: 'F-2026-001',
          reference_piece: 'PJ-001',
          montant_ht: 100,
          montant_tva: 20,
          montant_ttc: 120,
          montant_liquide: 120,
          statut: 'validee',
          date_validation: '2026-01-16',
          observations: null,
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
          created_by: actor.sub,
          fournisseur_nom: 'Fournisseur A',
          fournisseur_code: 'FOU-A',
          bon_commande_numero: 'BC-001',
          engagement_numero: 'ENG-001',
          ligne_budgetaire_libelle: 'Ligne A',
          projet_nom: 'Projet A',
          projet_code: 'CC01-PROJ-A',
          ecritures_count: 2,
        },
      ])
    );

    const result = await service.getById(actor, 'fac-1');

    expect(result.projetId).toBe('prj-1');
    expect(result.engagementId).toBe('eng-1');
    expect(result.ligneBudgetaireId).toBe('lb-1');
    expect(result.projet).toEqual(
      expect.objectContaining({
        id: 'prj-1',
        nom: 'Projet A',
        code: 'CC01-PROJ-A',
      })
    );
    expect(result.engagement).toEqual(
      expect.objectContaining({
        id: 'eng-1',
        numero: 'ENG-001',
      })
    );
    expect(result.ligneBudgetaire).toEqual(
      expect.objectContaining({
        id: 'lb-1',
        libelle: 'Ligne A',
      })
    );
  });
});
