import { expect, test } from '@playwright/test';
import {
  buildAxesSousTension,
  buildDashboardSignals,
  buildEcartsByPeriode,
  computeDashboardKpis,
  filterLignesBudgetaires,
  type DashboardFilterMetadata,
} from '../src/lib/dashboard-budgetaire';
import type { LigneBudgetaire } from '../src/types/budget.types';
import type { EcartsPrevisionExecution } from '../src/types/prevision.types';
import type { TresorerieSupervision } from '../src/types/tresorerie.types';

const makeLigne = (overrides: Partial<LigneBudgetaire> = {}): LigneBudgetaire => ({
  id: 'ligne-1',
  exerciceId: 'ex-1',
  actionId: 'act-1',
  compteId: 'cmp-1',
  enveloppeId: 'env-1',
  libelle: 'Ligne test',
  montantInitial: 100,
  montantModifie: 120,
  montantEngage: 80,
  montantLiquide: 50,
  montantPaye: 40,
  disponible: 40,
  dateCreation: '2026-03-09T00:00:00.000Z',
  statut: 'actif',
  ...overrides,
});

const metadata: DashboardFilterMetadata = {
  actionsById: new Map([
    ['act-1', { code: 'ACT-1', programmeId: 'prg-1' }],
    ['act-2', { code: 'ACT-2', programmeId: 'prg-2' }],
  ]),
  programmesById: new Map([
    ['prg-1', { code: 'PRG-1', sectionId: 'sec-1' }],
    ['prg-2', { code: 'PRG-2', sectionId: 'sec-2' }],
  ]),
  sectionsById: new Map([
    ['sec-1', { code: 'SEC-1' }],
    ['sec-2', { code: 'SEC-2' }],
  ]),
  enveloppesById: new Map([
    ['env-1', { code: 'ENV-ALPHA' }],
    ['env-2', { code: 'ENV-BETA' }],
  ]),
};

const ecartsFixture: EcartsPrevisionExecution[] = [
  {
    periode: '2026-01',
    axe: { sectionCode: 'SEC-1', programmeCode: 'PRG-1', actionCode: 'ACT-1', enveloppeId: 'env-1' },
    montantPrevu: 100,
    montantExecute: 130,
    ecartMontant: 30,
    ecartTaux: 30,
  },
  {
    periode: '2026-01',
    axe: { sectionCode: 'SEC-1', programmeCode: 'PRG-1', actionCode: 'ACT-2', enveloppeId: 'env-2' },
    montantPrevu: 200,
    montantExecute: 170,
    ecartMontant: -30,
    ecartTaux: -15,
  },
  {
    periode: '2026-02',
    axe: { sectionCode: 'SEC-2' },
    montantPrevu: 100,
    montantExecute: 80,
    ecartMontant: -20,
    ecartTaux: -20,
  },
];

const supervisionFixture: TresorerieSupervision = {
  exerciceId: 'ex-1',
  generatedAt: '2026-03-09T10:00:00.000Z',
  currentPosition: 1000,
  shortTermProjection: 800,
  pendingDisbursements: 200,
  pendingDisbursementsCount: 2,
  remainingCommitments: 400,
  remainingCommitmentsCount: 5,
  nonReconciledOperations: 12,
  pendingReconciliations: 8,
  qualifiedDiscrepancies: 3,
  projectedExposure: 900,
  projectedGap: -100,
  activeExceptions: 1,
  expiredExceptions: 0,
  consumedExceptions: 1,
  alerts: [
    {
      key: 'cash-gap',
      severity: 'critical',
      code: 'CASH_GAP',
      label: 'Risque de gap cash',
      message: 'Le gap projete depasse le seuil.',
      value: -100,
      threshold: -50,
    },
  ],
};

test.describe('dashboard budgetaire helpers', () => {
  test('filtre les lignes par section, action et enveloppe (code ou id)', async () => {
    const lignes = [
      makeLigne({ id: 'ligne-1', actionId: 'act-1', enveloppeId: 'env-1' }),
      makeLigne({ id: 'ligne-2', actionId: 'act-2', enveloppeId: 'env-2' }),
    ];

    expect(
      filterLignesBudgetaires(lignes, { sectionCode: 'sec-1', actionCode: 'ACT-1', enveloppeId: 'env-alpha' }, metadata).map(
        (item) => item.id
      )
    ).toEqual(['ligne-1']);

    expect(filterLignesBudgetaires(lignes, { enveloppeId: 'env-2' }, metadata).map((item) => item.id)).toEqual(['ligne-2']);
  });

  test('applique la periode aux KPI via la coherence axes ecarts -> lignes', async () => {
    const lignes = [
      makeLigne({ id: 'ligne-1', actionId: 'act-1', enveloppeId: 'env-1' }),
      makeLigne({ id: 'ligne-2', actionId: 'act-2', enveloppeId: 'env-2' }),
    ];

    expect(filterLignesBudgetaires(lignes, { periode: '2026-02' }, metadata, ecartsFixture).map((item) => item.id)).toEqual(['ligne-2']);
    expect(filterLignesBudgetaires(lignes, { periode: '2026-03' }, metadata, ecartsFixture)).toEqual([]);
  });

  test('agrege KPI/periodisation et classe les axes sous tension', async () => {
    const kpis = computeDashboardKpis([
      makeLigne({ montantModifie: 100, montantEngage: 40, montantPaye: 10, disponible: 60 }),
      makeLigne({ id: 'ligne-2', montantModifie: 200, montantEngage: 80, montantPaye: 40, disponible: 120 }),
    ]);

    expect(kpis).toEqual({ budgetModifie: 300, engage: 120, paye: 50, disponible: 180 });

    expect(buildEcartsByPeriode(ecartsFixture)).toEqual([
      { periode: '2026-01', prevu: 300, execute: 300, ecart: 0 },
      { periode: '2026-02', prevu: 100, execute: 80, ecart: -20 },
    ]);

    const axes = buildAxesSousTension(ecartsFixture);
    expect(axes).toHaveLength(3);
    expect(axes[0]?.periode).toBe('2026-01');
    expect(Math.abs(axes[0]?.ecartMontant ?? 0)).toBeGreaterThanOrEqual(Math.abs(axes[1]?.ecartMontant ?? 0));
  });

  test('priorise les signaux critiques sans recoder les seuils metier cote UI', async () => {
    const signals = buildDashboardSignals({
      supervision: supervisionFixture,
      ecarts: ecartsFixture,
    });

    expect(signals[0]?.severity).toBe('critical');
    expect(signals[0]?.sourcePath).toBe('/app/tresorerie?tab=supervision');
    expect(signals.some((signal) => signal.sourcePath === '/app/previsions')).toBeTruthy();
    expect(signals.some((signal) => signal.sourcePath === '/app/controle-interne')).toBeTruthy();
    expect(signals.filter((signal) => signal.sourcePath === '/app/previsions').every((signal) => signal.severity === 'medium')).toBeTruthy();
  });
});
