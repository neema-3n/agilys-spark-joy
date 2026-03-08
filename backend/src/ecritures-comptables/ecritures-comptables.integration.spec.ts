import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { NotFoundException } from '@nestjs/common';
import { PostgresService } from '../common/postgres.service';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { EcrituresComptablesService } from './ecritures-comptables.service';

const TEST_TENANT = 'tenant-story-6-2';
const OTHER_TENANT = 'tenant-story-6-2-other';

describe('EcrituresComptablesService integration', () => {
  const postgresService = new PostgresService();
  const service = new EcrituresComptablesService(postgresService);

  const actor: AuthenticatedUser = {
    sub: randomUUID(),
    tenantId: TEST_TENANT,
    roles: ['admin_client']
  };

  beforeAll(async () => {
    const migrationPath = resolve(
      __dirname,
      '../../../supabase/migrations/20260308120000_story_6_2_idempotent_ecritures.sql'
    );
    const migrationSql = readFileSync(migrationPath, 'utf8');
    await postgresService.query(migrationSql);
  });

  beforeEach(async () => {
    await cleanupTenant(TEST_TENANT);
    await cleanupTenant(OTHER_TENANT);
  });

  afterAll(async () => {
    await cleanupTenant(TEST_TENANT);
    await cleanupTenant(OTHER_TENANT);
    await postgresService.onModuleDestroy();
  });

  it('cree les ecritures une seule fois puis retourne already_generated sur replay', async () => {
    const scenario = await seedDepenseScenario({
      tenantId: TEST_TENANT,
      typeOperation: 'depense'
    });

    const first = await service.generateForOperation(actor, 'depense', scenario.sourceId, scenario.exerciceId);
    const second = await service.generateForOperation(actor, 'depense', scenario.sourceId, scenario.exerciceId);

    expect(first.success).toBe(true);
    expect(first.status).toBe('created');
    expect(first.ecrituresCount).toBe(1);

    expect(second.success).toBe(true);
    expect(second.status).toBe('already_generated');
    expect(second.code).toBe('ECRITURES_DEJA_PRESENTES');

    const entries = await postgresService.query<{
      regle_comptable_id: string;
      source_id: string;
      statut_ecriture: string;
    }>(
      `
        SELECT regle_comptable_id, source_id, statut_ecriture
        FROM public.ecritures_comptables
        WHERE client_id = $1
          AND exercice_id = $2
          AND type_operation = 'depense'
          AND source_id = $3
      `,
      [TEST_TENANT, scenario.exerciceId, scenario.sourceId]
    );

    expect(entries.rows).toHaveLength(1);
    expect(entries.rows[0]?.regle_comptable_id).toBe(scenario.regleId);
    expect(entries.rows[0]?.source_id).toBe(scenario.sourceId);
    expect(entries.rows[0]?.statut_ecriture).toBe('validee');
  });

  it.each([
    ['engagement', seedEngagementScenario],
    ['paiement', seedPaiementScenario]
  ] as const)('genere nominalement des ecritures pour %s', async (typeOperation, seedScenario) => {
    const scenario = await seedScenario({
      tenantId: TEST_TENANT
    });

    const result = await service.generateForOperation(actor, typeOperation, scenario.sourceId, scenario.exerciceId);

    expect(result.success).toBe(true);
    expect(result.status).toBe('created');
    expect(result.ecrituresCount).toBe(1);

    const entries = await postgresService.query<{ count: string }>(
      `
        SELECT COUNT(*)::text AS count
        FROM public.ecritures_comptables
        WHERE client_id = $1
          AND exercice_id = $2
          AND type_operation = $3
          AND source_id = $4
      `,
      [TEST_TENANT, scenario.exerciceId, typeOperation, scenario.sourceId]
    );

    expect(Number(entries.rows[0]?.count ?? 0)).toBe(1);
  });

  it('retourne une erreur actionnable si la regle reference un compte hors tenant', async () => {
    const scenario = await seedDepenseScenario({
      tenantId: TEST_TENANT,
      typeOperation: 'depense',
      debitAccountTenantId: OTHER_TENANT
    });

    const result = await service.generateForOperation(actor, 'depense', scenario.sourceId, scenario.exerciceId);

    expect(result.success).toBe(false);
    expect(result.status).toBe('error');
    expect(result.code).toBe('COMPTE_COMPTABLE_INVALIDE');

    const entries = await postgresService.query<{ count: string }>(
      `
        SELECT COUNT(*)::text AS count
        FROM public.ecritures_comptables
        WHERE client_id = $1
          AND source_id = $2
      `,
      [TEST_TENANT, scenario.sourceId]
    );

    expect(Number(entries.rows[0]?.count ?? 0)).toBe(0);
  });

  it('evite les doublons logiques sur deux appels concurrents', async () => {
    const scenario = await seedDepenseScenario({
      tenantId: TEST_TENANT,
      typeOperation: 'depense'
    });

    const [left, right] = await Promise.all([
      service.generateForOperation(actor, 'depense', scenario.sourceId, scenario.exerciceId),
      service.generateForOperation(actor, 'depense', scenario.sourceId, scenario.exerciceId)
    ]);

    expect([left.status, right.status].sort()).toEqual(['already_generated', 'created']);

    const entries = await postgresService.query<{ count: string }>(
      `
        SELECT COUNT(*)::text AS count
        FROM public.ecritures_comptables
        WHERE client_id = $1
          AND exercice_id = $2
          AND type_operation = 'depense'
          AND source_id = $3
      `,
      [TEST_TENANT, scenario.exerciceId, scenario.sourceId]
    );

    expect(Number(entries.rows[0]?.count ?? 0)).toBe(1);
  });

  it('refuse une source hors exercice scope au niveau du service', async () => {
    const scenario = await seedDepenseScenario({
      tenantId: TEST_TENANT,
      typeOperation: 'depense'
    });

    await expect(
      service.generateForOperation(actor, 'depense', scenario.sourceId, randomUUID())
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejette un lot candidat desequilibre avant insertion finale', async () => {
    const scenario = await seedDepenseScenario({
      tenantId: TEST_TENANT,
      typeOperation: 'depense'
    });

    const result = await postgresService.query<{ generate_ecritures_comptables: {
      success: boolean;
      status: string;
      code: string;
      message: string;
      ecritures_count: number;
    } }>(
      `
        SELECT public.generate_ecritures_comptables(
          $1,
          $2::uuid,
          'depense',
          $3::uuid,
          'DEP/TEST/001',
          DATE '2026-03-08',
          1250,
          jsonb_build_object(
            'objet', 'Depense integration story 6.2',
            'total_debit', 1250,
            'total_credit', 1000
          ),
          $4::uuid
        ) AS generate_ecritures_comptables
      `,
      [TEST_TENANT, scenario.exerciceId, scenario.sourceId, actor.sub]
    );

    expect(result.rows[0]?.generate_ecritures_comptables).toMatchObject({
      success: false,
      status: 'error',
      code: 'ECRITURES_DESEQUILIBREES',
      ecritures_count: 0
    });

    const entries = await postgresService.query<{ count: string }>(
      `
        SELECT COUNT(*)::text AS count
        FROM public.ecritures_comptables
        WHERE client_id = $1
          AND exercice_id = $2
          AND type_operation = 'depense'
          AND source_id = $3
      `,
      [TEST_TENANT, scenario.exerciceId, scenario.sourceId]
    );

    expect(Number(entries.rows[0]?.count ?? 0)).toBe(0);
  });

  async function cleanupTenant(tenantId: string): Promise<void> {
    await postgresService.query(`DELETE FROM public.ecritures_comptables WHERE client_id = $1`, [tenantId]);
    await postgresService.query(`DELETE FROM public.regles_comptables WHERE client_id = $1`, [tenantId]);
    await postgresService.query(`DELETE FROM public.paiements WHERE client_id = $1`, [tenantId]);
    await postgresService.query(`DELETE FROM public.depenses WHERE client_id = $1`, [tenantId]);
    await postgresService.query(`DELETE FROM public.engagements WHERE client_id = $1`, [tenantId]);
    await postgresService.query(`DELETE FROM public.reservations_credits WHERE client_id = $1`, [tenantId]);
    await postgresService.query(`DELETE FROM public.lignes_budgetaires WHERE client_id = $1`, [tenantId]);
    await postgresService.query(`DELETE FROM public.comptes WHERE client_id = $1`, [tenantId]);
    await postgresService.query(`DELETE FROM public.exercices WHERE client_id = $1`, [tenantId]);
  }

  async function seedDepenseScenario({
    tenantId,
    typeOperation,
    debitAccountTenantId = tenantId
  }: {
    tenantId: string;
    typeOperation: 'depense';
    debitAccountTenantId?: string;
  }) {
    const base = await seedBaseScenario({
      tenantId,
      typeOperation,
      regleCode: 'RG-DEP-INT',
      regleNom: 'Depense integration',
      debitAccountTenantId
    });

    await postgresService.query(
      `
        INSERT INTO public.depenses (
          id,
          client_id,
          exercice_id,
          numero,
          date_depense,
          objet,
          montant,
          montant_paye,
          ligne_budgetaire_id,
          statut
        )
        VALUES (
          $1,
          $2,
          $3,
          'DEP/TEST/001',
          DATE '2026-03-08',
          'Depense integration story 6.2',
          1250,
          0,
          $4,
          'ordonnancee'
        )
      `,
      [base.sourceId, tenantId, base.exerciceId, base.ligneBudgetaireId]
    );

    return {
      exerciceId: base.exerciceId,
      sourceId: base.sourceId,
      regleId: base.regleId
    };
  }

  async function seedEngagementScenario({ tenantId }: { tenantId: string }) {
    const base = await seedBaseScenario({
      tenantId,
      typeOperation: 'engagement',
      regleCode: 'RG-ENG-INT',
      regleNom: 'Engagement integration'
    });

    await postgresService.query(
      `
        INSERT INTO public.engagements (
          id,
          numero,
          exercice_id,
          client_id,
          ligne_budgetaire_id,
          objet,
          montant,
          statut,
          date_creation
        )
        VALUES (
          $1,
          'ENG/TEST/001',
          $2,
          $3,
          $4,
          'Engagement integration story 6.2',
          850,
          'valide',
          DATE '2026-03-08'
        )
      `,
      [base.sourceId, base.exerciceId, tenantId, base.ligneBudgetaireId]
    );

    return {
      exerciceId: base.exerciceId,
      sourceId: base.sourceId,
      regleId: base.regleId
    };
  }

  async function seedPaiementScenario({ tenantId }: { tenantId: string }) {
    const base = await seedBaseScenario({
      tenantId,
      typeOperation: 'paiement',
      regleCode: 'RG-PAY-INT',
      regleNom: 'Paiement integration'
    });

    const depenseId = randomUUID();

    await postgresService.query(
      `
        INSERT INTO public.depenses (
          id,
          client_id,
          exercice_id,
          numero,
          date_depense,
          objet,
          montant,
          montant_paye,
          ligne_budgetaire_id,
          statut
        )
        VALUES (
          $1,
          $2,
          $3,
          'DEP/PAY/001',
          DATE '2026-03-08',
          'Depense support paiement integration',
          600,
          0,
          $4,
          'ordonnancee'
        )
      `,
      [depenseId, tenantId, base.exerciceId, base.ligneBudgetaireId]
    );

    await postgresService.query(
      `
        INSERT INTO public.paiements (
          id,
          client_id,
          exercice_id,
          numero,
          depense_id,
          montant,
          date_paiement,
          mode_paiement,
          statut,
          tentative_numero
        )
        VALUES (
          $1,
          $2,
          $3,
          'PAY/TEST/001',
          $4,
          600,
          DATE '2026-03-08',
          'virement',
          'execute',
          1
        )
      `,
      [base.sourceId, tenantId, base.exerciceId, depenseId]
    );

    return {
      exerciceId: base.exerciceId,
      sourceId: base.sourceId,
      regleId: base.regleId
    };
  }

  async function seedBaseScenario({
    tenantId,
    typeOperation,
    regleCode,
    regleNom,
    debitAccountTenantId = tenantId
  }: {
    tenantId: string;
    typeOperation: 'depense' | 'engagement' | 'paiement';
    regleCode: string;
    regleNom: string;
    debitAccountTenantId?: string;
  }) {
    const exerciceId = randomUUID();
    const ligneBudgetaireId = randomUUID();
    const debitAccountId = randomUUID();
    const creditAccountId = randomUUID();
    const sourceId = randomUUID();
    const regleId = randomUUID();
    const versionGroupId = randomUUID();

    await postgresService.query(
      `
        INSERT INTO public.exercices (id, client_id, libelle, code, date_debut, date_fin, statut)
        VALUES ($1, $2, 'Exercice integration 2026', 'EX-INT-2026', DATE '2026-01-01', DATE '2026-12-31', 'ouvert')
      `,
      [exerciceId, tenantId]
    );

    if (debitAccountTenantId !== tenantId) {
      await postgresService.query(
        `
          INSERT INTO public.exercices (id, client_id, libelle, code, date_debut, date_fin, statut)
          VALUES ($1, $2, 'Exercice integration other', 'EX-INT-2027', DATE '2027-01-01', DATE '2027-12-31', 'ouvert')
          ON CONFLICT DO NOTHING
        `,
        [randomUUID(), debitAccountTenantId]
      );
    }

    await postgresService.query(
      `
        INSERT INTO public.comptes (id, client_id, numero, libelle, type, categorie, statut)
        VALUES
          ($1, $2, '601', 'Achats', 'charge', 'exploitation', 'actif'),
          ($3, $4, '401', 'Fournisseurs', 'passif', 'dette', 'actif')
      `,
      [debitAccountId, debitAccountTenantId, creditAccountId, tenantId]
    );

    await postgresService.query(
      `
        INSERT INTO public.lignes_budgetaires (
          id,
          client_id,
          exercice_id,
          action_id,
          compte_id,
          libelle,
          montant_initial,
          montant_modifie,
          montant_engage,
          montant_paye,
          disponible,
          statut
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          'Ligne story 6.2',
          10000,
          10000,
          0,
          0,
          10000,
          'actif'
        )
      `,
      [ligneBudgetaireId, tenantId, exerciceId, randomUUID(), creditAccountId]
    );

    await postgresService.query(
      `
        INSERT INTO public.regles_comptables (
          id,
          client_id,
          code,
          nom,
          date_debut,
          date_fin,
          permanente,
          type_operation,
          conditions,
          compte_debit_id,
          compte_credit_id,
          actif,
          ordre,
          version_group_id,
          version_number,
          version_status,
          published_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          DATE '2026-01-01',
          DATE '2026-12-31',
          false,
          $5,
          '[]'::jsonb,
          $6,
          $7,
          true,
          1,
          $8,
          1,
          'published',
          now()
        )
      `,
      [regleId, tenantId, regleCode, regleNom, typeOperation, debitAccountId, creditAccountId, versionGroupId]
    );

    return {
      exerciceId,
      ligneBudgetaireId,
      sourceId,
      regleId
    };
  }
});
