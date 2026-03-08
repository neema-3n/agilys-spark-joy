import { BadRequestException, ConflictException } from '@nestjs/common';
import type { QueryResult, QueryResultRow } from 'pg';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import type { PostgresService } from '../common/postgres.service';
import { ReglesComptablesService } from './regles-comptables.service';

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

describe('ReglesComptablesService', () => {
  const query = jest.fn();
  const postgresService = { query } as unknown as PostgresService;
  const service = new ReglesComptablesService(postgresService);

  beforeEach(() => {
    query.mockReset();
  });

  it('cree une regle versionnee avec metadonnees explicites', async () => {
    query
      .mockResolvedValueOnce(makeResult([{ count: '1' }]))
      .mockResolvedValueOnce(makeResult([{ count: '1' }]))
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(makeResult([{ id: 'reg-1' }]))
      .mockResolvedValueOnce(
        makeResult([
          {
            id: 'reg-1',
            client_id: actor.tenantId,
            code: 'RG-DEP-001',
            nom: 'Depense 2026',
            description: 'Version publiee',
            date_debut: '2026-01-01',
            date_fin: '2026-12-31',
            permanente: false,
            type_operation: 'depense',
            conditions: [],
            compte_debit_id: 'compte-debit',
            compte_credit_id: 'compte-credit',
            actif: true,
            ordre: 1,
            version_group_id: 'group-1',
            version_number: 1,
            version_status: 'published',
            change_reason: 'Publication initiale',
            published_at: '2026-03-07T10:00:00.000Z',
            archived_at: null,
            created_at: '2026-03-07T10:00:00.000Z',
            updated_at: '2026-03-07T10:00:00.000Z',
            created_by: actor.sub,
            compte_debit_numero: '601',
            compte_debit_libelle: 'Achats',
            compte_credit_numero: '401',
            compte_credit_libelle: 'Fournisseurs'
          }
        ])
      );

    const result = await service.create(actor, {
      code: 'RG-DEP-001',
      nom: 'Depense 2026',
      description: 'Version publiee',
      dateDebut: '2026-01-01',
      dateFin: '2026-12-31',
      permanente: false,
      typeOperation: 'depense',
      conditions: [],
      compteDebitId: 'compte-debit',
      compteCreditId: 'compte-credit',
      actif: true,
      ordre: 1,
      versionStatus: 'published',
      changeReason: 'Publication initiale'
    });

    expect(result.versionStatus).toBe('published');
    expect(result.versionNumber).toBe(1);
    expect(result.versionGroupId).toBe('group-1');
    expect(result.changeReason).toBe('Publication initiale');
  });

  it('rejette un compte qui ne depend pas du tenant courant', async () => {
    query.mockResolvedValueOnce(makeResult([{ count: '0' }]));

    await expect(
      service.create(actor, {
        code: 'RG-ERR-001',
        nom: 'Regle invalide',
        permanente: true,
        typeOperation: 'depense',
        conditions: [],
        compteDebitId: 'foreign-compte',
        compteCreditId: 'compte-credit'
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('bloque un conflit de version publiee sur meme priorite et meme periode', async () => {
    query
      .mockResolvedValueOnce(makeResult([{ count: '1' }]))
      .mockResolvedValueOnce(makeResult([{ count: '1' }]))
      .mockResolvedValueOnce(
        makeResult([
          {
            id: 'reg-existing',
            code: 'RG-DEP-LEGACY',
            nom: 'Regle existante',
            ordre: 1,
            date_debut: '2026-01-01',
            date_fin: '2026-12-31',
            permanente: false,
            version_status: 'published',
            conditions: []
          }
        ])
      );

    await expect(
      service.create(actor, {
        code: 'RG-DEP-002',
        nom: 'Regle en conflit',
        dateDebut: '2026-06-01',
        dateFin: '2026-06-30',
        permanente: false,
        typeOperation: 'depense',
        conditions: [],
        compteDebitId: 'compte-debit',
        compteCreditId: 'compte-credit',
        actif: true,
        ordre: 1,
        versionStatus: 'published'
      })
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('interdit la suppression destructive d une version publiee', async () => {
    query.mockResolvedValueOnce(
      makeResult([
        {
          id: 'reg-1',
          client_id: actor.tenantId,
          code: 'RG-DEP-001',
          nom: 'Depense 2026',
          description: null,
          date_debut: '2026-01-01',
          date_fin: '2026-12-31',
          permanente: false,
          type_operation: 'depense',
          conditions: [],
          compte_debit_id: 'compte-debit',
          compte_credit_id: 'compte-credit',
          actif: true,
          ordre: 1,
          version_group_id: 'group-1',
          version_number: 1,
          version_status: 'published',
          change_reason: null,
          published_at: '2026-03-07T10:00:00.000Z',
          archived_at: null,
          created_at: '2026-03-07T10:00:00.000Z',
          updated_at: '2026-03-07T10:00:00.000Z',
          created_by: actor.sub,
          compte_debit_numero: '601',
          compte_debit_libelle: 'Achats',
          compte_credit_numero: '401',
          compte_credit_libelle: 'Fournisseurs'
        }
      ])
    );

    await expect(service.delete(actor, 'reg-1')).rejects.toBeInstanceOf(ConflictException);
    expect(query).toHaveBeenCalledTimes(1);
  });
});
