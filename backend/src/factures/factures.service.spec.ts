import { BadRequestException } from '@nestjs/common';
import type { QueryResult, QueryResultRow } from 'pg';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import type { PostgresService } from '../common/postgres.service';
import type { EcrituresComptablesService } from '../ecritures-comptables/ecritures-comptables.service';
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
    ensureGeneratedForOperation: jest.fn()
  } as unknown as EcrituresComptablesService;
  const service = new FacturesService(postgresService, ecrituresComptablesService);

  beforeEach(() => {
    query.mockReset();
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
});
