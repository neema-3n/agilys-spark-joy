import { ConflictException } from '@nestjs/common';
import type { QueryResult, QueryResultRow } from 'pg';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import type { PostgresService } from '../common/postgres.service';
import { ComptesService } from './comptes.service';

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

describe('ComptesService', () => {
  const query = jest.fn();
  const postgresService = { query } as unknown as PostgresService;
  const service = new ComptesService(postgresService);

  beforeEach(() => {
    query.mockReset();
  });

  it('cree un compte versionne avec metadonnees explicites', async () => {
    query
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(
        makeResult([
          {
            id: 'compte-1',
            client_id: actor.tenantId,
            numero: '601',
            libelle: 'Achats',
            type: 'charge',
            categorie: 'exploitation',
            parent_id: null,
            niveau: 1,
            statut: 'actif',
            version_group_id: 'group-1',
            version_number: 1,
            version_status: 'published',
            effective_start_date: '2026-01-01',
            effective_end_date: '2026-12-31',
            change_reason: 'Publication initiale',
            published_at: '2026-03-09T10:00:00.000Z',
            archived_at: null,
            superseded_by_id: null,
            created_at: '2026-03-09T10:00:00.000Z',
            updated_at: '2026-03-09T10:00:00.000Z',
            created_by: actor.sub
          }
        ])
      );

    const result = await service.create(actor, {
      numero: '601',
      libelle: 'Achats',
      type: 'charge',
      categorie: 'exploitation',
      niveau: 1,
      statut: 'actif',
      versionStatus: 'published',
      effectiveStartDate: '2026-01-01',
      effectiveEndDate: '2026-12-31',
      changeReason: 'Publication initiale'
    });

    expect(result.versionStatus).toBe('published');
    expect(result.versionNumber).toBe(1);
    expect(result.versionGroupId).toBe('group-1');
    expect(result.changeReason).toBe('Publication initiale');
  });

  it('cree une nouvelle version append-only lors de la mise a jour d un compte publie', async () => {
    query
      .mockResolvedValueOnce(
        makeResult([
          {
            id: 'compte-1',
            client_id: actor.tenantId,
            numero: '601',
            libelle: 'Achats',
            type: 'charge',
            categorie: 'exploitation',
            parent_id: null,
            niveau: 1,
            statut: 'actif',
            version_group_id: 'group-1',
            version_number: 1,
            version_status: 'published',
            effective_start_date: '2026-01-01',
            effective_end_date: null,
            change_reason: 'Publication initiale',
            published_at: '2026-03-09T10:00:00.000Z',
            archived_at: null,
            superseded_by_id: null,
            created_at: '2026-03-09T10:00:00.000Z',
            updated_at: '2026-03-09T10:00:00.000Z',
            created_by: actor.sub
          }
        ])
      )
      .mockResolvedValueOnce(makeResult([]))
      .mockResolvedValueOnce(
        makeResult([
          {
            id: 'compte-2',
            client_id: actor.tenantId,
            numero: '601',
            libelle: 'Achats et services',
            type: 'charge',
            categorie: 'exploitation',
            parent_id: null,
            niveau: 1,
            statut: 'actif',
            version_group_id: 'group-1',
            version_number: 2,
            version_status: 'draft',
            effective_start_date: '2026-04-01',
            effective_end_date: null,
            change_reason: 'Ajustement de libelle',
            published_at: null,
            archived_at: null,
            superseded_by_id: null,
            created_at: '2026-03-09T11:00:00.000Z',
            updated_at: '2026-03-09T11:00:00.000Z',
            created_by: actor.sub
          }
        ])
      );

    const result = await service.update(actor, 'compte-1', {
      libelle: 'Achats et services',
      versionStatus: 'draft',
      effectiveStartDate: '2026-04-01',
      changeReason: 'Ajustement de libelle'
    });

    expect(result.id).toBe('compte-2');
    expect(result.versionNumber).toBe(2);
    expect(result.versionGroupId).toBe('group-1');
    expect(query).toHaveBeenCalledTimes(3);
  });

  it('interdit la suppression destructive d une version publiee', async () => {
    query.mockResolvedValueOnce(
      makeResult([
        {
          id: 'compte-1',
          client_id: actor.tenantId,
          numero: '601',
          libelle: 'Achats',
          type: 'charge',
          categorie: 'exploitation',
          parent_id: null,
          niveau: 1,
          statut: 'actif',
          version_group_id: 'group-1',
          version_number: 1,
          version_status: 'published',
          effective_start_date: '2026-01-01',
          effective_end_date: null,
          change_reason: 'Publication initiale',
          published_at: '2026-03-09T10:00:00.000Z',
          archived_at: null,
          superseded_by_id: null,
          created_at: '2026-03-09T10:00:00.000Z',
          updated_at: '2026-03-09T10:00:00.000Z',
          created_by: actor.sub
        }
      ])
    );

    await expect(service.delete(actor, 'compte-1')).rejects.toBeInstanceOf(ConflictException);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('rejette la creation d une version publiee sans motif de changement', async () => {
    await expect(
      service.create(actor, {
        numero: '601',
        libelle: 'Achats',
        type: 'charge',
        categorie: 'exploitation',
        niveau: 1,
        statut: 'actif',
        versionStatus: 'published'
      })
    ).rejects.toThrow('motif de changement');

    expect(query).not.toHaveBeenCalled();
  });

  it('rejette la creation d un numero deja utilise par une version courante', async () => {
    query.mockResolvedValueOnce(makeResult([{ id: 'compte-existing' }]));

    await expect(
      service.create(actor, {
        numero: '601',
        libelle: 'Achats bis',
        type: 'charge',
        categorie: 'exploitation'
      })
    ).rejects.toBeInstanceOf(ConflictException);

    expect(query).toHaveBeenCalledTimes(1);
  });

  it('bloque le vidage global si une version publiee existe encore dans l historique', async () => {
    query.mockResolvedValueOnce(makeResult([{ count: '1' }]));

    await expect(service.deleteAll(actor)).rejects.toBeInstanceOf(ConflictException);
    expect(query).toHaveBeenCalledTimes(1);
  });
});
