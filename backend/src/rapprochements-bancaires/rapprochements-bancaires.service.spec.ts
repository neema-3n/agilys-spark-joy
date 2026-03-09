import { BadRequestException, ConflictException } from '@nestjs/common';
import type { QueryResult, QueryResultRow } from 'pg';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import type { ExerciceClotureService } from '../exercice-cloture/exercice-cloture.service';
import { RapprochementsBancairesService } from './rapprochements-bancaires.service';

const actor: AuthenticatedUser = {
  sub: 'user-1',
  tenantId: 'tenant-1',
  roles: ['directeur_financier'],
};

const makeResult = <T extends QueryResultRow>(rows: T[], rowCount = rows.length): QueryResult<T> => {
  return {
    rows,
    rowCount,
    command: 'SELECT',
    oid: 0,
    fields: [],
  } as QueryResult<T>;
};

describe('RapprochementsBancairesService', () => {
  const query = jest.fn();
  const withTransaction = jest.fn();
  const postgresService = {
    query,
    withTransaction,
  };
  const exerciceClotureService = {
    assertExerciceMutable: jest.fn().mockResolvedValue(undefined),
  } as unknown as ExerciceClotureService;
  const service = new RapprochementsBancairesService(postgresService as never, exerciceClotureService);

  beforeEach(() => {
    query.mockReset();
    withTransaction.mockReset();
    jest.restoreAllMocks();
  });

  it("impose une catégorie quand un écart est qualifié", async () => {
    withTransaction.mockImplementation(async (callback: (executor: { query: (sql: string, params?: unknown[]) => Promise<unknown> }) => Promise<unknown>) =>
      callback({
        query: async (sql: string) => {
          if (sql.includes('SELECT exercice_id, compte_id, client_id')) {
            return makeResult([{ exercice_id: 'ex-1', compte_id: 'comp-1', client_id: actor.tenantId, statut: 'en_cours' }]);
          }

          if (sql.includes('FROM public.rapprochement_bancaire_lignes') && sql.includes('operation_tresorerie_id')) {
            return makeResult([]);
          }

          if (sql.includes('FROM public.rapprochement_bancaire_lignes') && sql.includes('WHERE id = $1')) {
            return makeResult([
              {
                id: 'line-1',
                rapprochement_id: 'rap-1',
                client_id: actor.tenantId,
                exercice_id: 'ex-1',
                compte_id: 'comp-1',
                ordre: 1,
                date_operation: '2026-03-08',
                libelle: 'Versement',
                reference_bancaire: null,
                montant: 500,
                type_flux: 'encaissement',
                statut: 'sans_match',
                score: null,
                regles_appliquees: [],
                operation_tresorerie_id: null,
                categorie_ecart: null,
                motif_qualification: null,
                metadata: {},
              },
            ]);
          }

          return makeResult([]);
        },
      })
    );

    await expect(
      service.applyDecision(actor, 'rap-1', {
        lineId: 'line-1',
        action: 'qualify_discrepancy',
        justification: 'Aucune contrepartie visible',
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuse un double rapprochement sur une opération déjà utilisée ailleurs', async () => {
    jest.spyOn(service, 'getById').mockResolvedValue({ id: 'rap-1' } as never);

    withTransaction.mockImplementation(async (callback: (executor: { query: (sql: string, params?: unknown[]) => Promise<unknown> }) => Promise<unknown>) =>
      callback({
        query: async (sql: string) => {
          if (sql.includes('SELECT exercice_id, compte_id, client_id')) {
            return makeResult([{ exercice_id: 'ex-1', compte_id: 'comp-1', client_id: actor.tenantId, statut: 'en_cours' }]);
          }

          if (sql.includes('FROM public.rapprochement_bancaire_lignes') && sql.includes('operation_tresorerie_id')) {
            return makeResult([]);
          }

          if (sql.includes('FROM public.rapprochement_bancaire_lignes')) {
            return makeResult([
              {
                id: 'line-1',
                rapprochement_id: 'rap-1',
                client_id: actor.tenantId,
                exercice_id: 'ex-1',
                compte_id: 'comp-1',
                ordre: 1,
                date_operation: '2026-03-08',
                libelle: 'Versement',
                reference_bancaire: 'REF-1',
                montant: 500,
                type_flux: 'encaissement',
                statut: 'ambigu',
                score: 80,
                regles_appliquees: [],
                operation_tresorerie_id: null,
                categorie_ecart: null,
                motif_qualification: null,
                metadata: {},
              },
            ]);
          }

          if (sql.includes('FROM public.rapprochement_bancaire_candidats')) {
            return makeResult([
              {
                id: 'cand-1',
                ligne_id: 'line-1',
                operation_tresorerie_id: 'op-1',
                score: 90,
                statut: 'propose',
                raison: ['Montant exact'],
                metadata: {},
              },
            ]);
          }

          if (sql.includes('FROM public.operations_tresorerie')) {
            return makeResult([
              {
                id: 'op-1',
                exercice_id: 'ex-1',
                compte_id: 'comp-1',
                numero: 'OPE000001',
                date_operation: '2026-03-08',
                montant: 500,
                reference_bancaire: 'REF-1',
                libelle: 'Versement',
                type_operation: 'encaissement',
                rapproche: true,
                rapprochement_bancaire_id: 'rap-legacy',
              },
            ]);
          }

          return makeResult([]);
        },
      })
    );

    await expect(
      service.applyDecision(actor, 'rap-1', {
        lineId: 'line-1',
        action: 'select_candidate',
        candidateId: 'cand-1',
        justification: 'Choix manuel',
      })
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuse un candidat rattaché à un autre compte ou exercice', async () => {
    jest.spyOn(service, 'getById').mockResolvedValue({ id: 'rap-1' } as never);

    withTransaction.mockImplementation(async (callback: (executor: { query: (sql: string, params?: unknown[]) => Promise<unknown> }) => Promise<unknown>) =>
      callback({
        query: async (sql: string) => {
          if (sql.includes('SELECT exercice_id, compte_id, client_id')) {
            return makeResult([{ exercice_id: 'ex-1', compte_id: 'comp-1', client_id: actor.tenantId, statut: 'en_cours' }]);
          }

          if (sql.includes('FROM public.rapprochement_bancaire_lignes')) {
            return makeResult([
              {
                id: 'line-1',
                rapprochement_id: 'rap-1',
                client_id: actor.tenantId,
                exercice_id: 'ex-1',
                compte_id: 'comp-1',
                ordre: 1,
                date_operation: '2026-03-08',
                libelle: 'Versement',
                reference_bancaire: 'REF-1',
                montant: 500,
                type_flux: 'encaissement',
                statut: 'ambigu',
                score: 80,
                regles_appliquees: [],
                operation_tresorerie_id: null,
                categorie_ecart: null,
                motif_qualification: null,
                metadata: {},
              },
            ]);
          }

          if (sql.includes('FROM public.rapprochement_bancaire_candidats')) {
            return makeResult([
              {
                id: 'cand-1',
                ligne_id: 'line-1',
                operation_tresorerie_id: 'op-1',
                score: 90,
                statut: 'propose',
                raison: ['Montant exact'],
                metadata: {},
              },
            ]);
          }

          if (sql.includes('FROM public.operations_tresorerie')) {
            return makeResult([
              {
                id: 'op-1',
                exercice_id: 'ex-2',
                compte_id: 'comp-2',
                numero: 'OPE000001',
                date_operation: '2026-03-08',
                montant: 500,
                reference_bancaire: 'REF-1',
                libelle: 'Versement',
                type_operation: 'encaissement',
                rapproche: false,
                rapprochement_bancaire_id: null,
              },
            ]);
          }

          return makeResult([]);
        },
      })
    );

    let thrown: unknown;
    try {
      await service.applyDecision(actor, 'rap-1', {
        lineId: 'line-1',
        action: 'select_candidate',
        candidateId: 'cand-1',
        justification: 'Choix manuel',
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeDefined();
    expect(thrown instanceof BadRequestException || thrown instanceof ConflictException).toBe(true);
  });

  it('journalise une qualification manuelle d écart avec catégorie obligatoire', async () => {
    jest.spyOn(service, 'getById').mockResolvedValue({ id: 'rap-1' } as never);
    const sqlCalls: string[] = [];

    withTransaction.mockImplementation(async (callback: (executor: { query: (sql: string, params?: unknown[]) => Promise<unknown> }) => Promise<unknown>) =>
      callback({
        query: async (sql: string, params?: unknown[]) => {
          sqlCalls.push(sql);

          if (sql.includes('SELECT exercice_id, compte_id, client_id')) {
            return makeResult([{ exercice_id: 'ex-1', compte_id: 'comp-1', client_id: actor.tenantId, statut: 'en_cours' }]);
          }

          if (sql.includes('FROM public.rapprochement_bancaire_lignes') && sql.includes('WHERE id = $1')) {
            return makeResult([
              {
                id: 'line-1',
                rapprochement_id: 'rap-1',
                client_id: actor.tenantId,
                exercice_id: 'ex-1',
                compte_id: 'comp-1',
                ordre: 1,
                date_operation: '2026-03-08',
                libelle: 'Versement',
                reference_bancaire: null,
                montant: 500,
                type_flux: 'encaissement',
                statut: 'sans_match',
                score: null,
                regles_appliquees: [],
                operation_tresorerie_id: null,
                categorie_ecart: null,
                motif_qualification: null,
                metadata: {},
              },
            ]);
          }

          if (sql.includes('COUNT(*) AS total_lignes')) {
            return makeResult([
              {
                total_lignes: 1,
                total_propositions_auto: 0,
                total_ecarts_qualifies: 1,
                total_pending: 0,
                average_score: null,
              },
            ]);
          }

          if (sql.includes('INSERT INTO public.rapprochement_bancaire_decisions')) {
            expect(params).toEqual(
              expect.arrayContaining(['qualify_discrepancy', 'sans_match', 'ecart_qualifie', 'operation_manquante'])
            );
            return makeResult([], 1);
          }

          return makeResult([], 1);
        },
      })
    );

    await service.applyDecision(actor, 'rap-1', {
      lineId: 'line-1',
      action: 'qualify_discrepancy',
      category: 'operation_manquante',
      justification: 'Le relevé contient une ligne sans opération interne correspondante',
    });

    expect(sqlCalls.some((sql) => sql.includes('INSERT INTO public.rapprochement_bancaire_decisions'))).toBe(true);
  });

  it("bloque toute décision manuelle quand le rapprochement est déjà validé", async () => {
    withTransaction.mockImplementation(async (callback: (executor: { query: (sql: string, params?: unknown[]) => Promise<unknown> }) => Promise<unknown>) =>
      callback({
        query: async (sql: string) => {
          if (sql.includes('SELECT exercice_id, compte_id, client_id')) {
            return makeResult([{ exercice_id: 'ex-1', compte_id: 'comp-1', client_id: actor.tenantId, statut: 'valide' }]);
          }

          return makeResult([]);
        },
      })
    );

    await expect(
      service.applyDecision(actor, 'rap-1', {
        lineId: 'line-1',
        action: 'qualify_discrepancy',
        category: 'timing',
        justification: 'Tentative tardive',
      })
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuse de rattacher la même opération à deux lignes du même rapprochement', async () => {
    jest.spyOn(service, 'getById').mockResolvedValue({ id: 'rap-1' } as never);

    withTransaction.mockImplementation(async (callback: (executor: { query: (sql: string, params?: unknown[]) => Promise<unknown> }) => Promise<unknown>) =>
      callback({
        query: async (sql: string) => {
          if (sql.includes('SELECT exercice_id, compte_id, client_id')) {
            return makeResult([{ exercice_id: 'ex-1', compte_id: 'comp-1', client_id: actor.tenantId, statut: 'en_cours' }]);
          }

          if (sql.includes('FROM public.rapprochement_bancaire_lignes') && sql.includes('WHERE id = $1')) {
            return makeResult([
              {
                id: 'line-2',
                rapprochement_id: 'rap-1',
                client_id: actor.tenantId,
                exercice_id: 'ex-1',
                compte_id: 'comp-1',
                ordre: 2,
                date_operation: '2026-03-09',
                libelle: 'Versement',
                reference_bancaire: 'REF-2',
                montant: 500,
                type_flux: 'encaissement',
                statut: 'ambigu',
                score: 80,
                regles_appliquees: [],
                operation_tresorerie_id: null,
                categorie_ecart: null,
                motif_qualification: null,
                metadata: {},
              },
            ]);
          }

          if (sql.includes('FROM public.rapprochement_bancaire_candidats')) {
            return makeResult([
              {
                id: 'cand-1',
                ligne_id: 'line-2',
                operation_tresorerie_id: 'op-1',
                score: 90,
                statut: 'propose',
                raison: ['Montant exact'],
                metadata: {},
              },
            ]);
          }

          if (sql.includes('FROM public.operations_tresorerie')) {
            return makeResult([
              {
                id: 'op-1',
                exercice_id: 'ex-1',
                compte_id: 'comp-1',
                numero: 'OPE000001',
                date_operation: '2026-03-08',
                montant: 500,
                reference_bancaire: 'REF-1',
                libelle: 'Versement',
                type_operation: 'encaissement',
                rapproche: false,
                rapprochement_bancaire_id: null,
              },
            ]);
          }

          if (sql.includes('FROM public.rapprochement_bancaire_lignes') && sql.includes('operation_tresorerie_id = $3')) {
            return makeResult([{ id: 'line-1' }]);
          }

          return makeResult([]);
        },
      })
    );

    await expect(
      service.applyDecision(actor, 'rap-1', {
        lineId: 'line-2',
        action: 'select_candidate',
        candidateId: 'cand-1',
        justification: 'Sélection manuelle',
      })
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
