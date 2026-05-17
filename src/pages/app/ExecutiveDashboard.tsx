import { useEffect, useMemo, useState } from 'react';
import { Download, Landmark, ReceiptText, Wallet, WalletCards, FileChartColumnIncreasing, ShoppingCart, CreditCard, Target } from 'lucide-react';
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';

import { PageHeader } from '@/components/PageHeader';
import { StatsCard } from '@/components/ui/stats-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useActions } from '@/hooks/useActions';
import { useBonsCommande } from '@/hooks/useBonsCommande';
import { useComptesTresorerie } from '@/hooks/useComptesTresorerie';
import { useDepenses } from '@/hooks/useDepenses';
import { useEngagements } from '@/hooks/useEngagements';
import { useEnveloppes } from '@/hooks/useEnveloppes';
import { useFactures } from '@/hooks/useFactures';
import { useLignesBudgetaires } from '@/hooks/useLignesBudgetaires';
import { usePaiements } from '@/hooks/usePaiements';
import { useProgrammes } from '@/hooks/useProgrammes';
import { useReservations } from '@/hooks/useReservations';
import { useSections } from '@/hooks/useSections';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import { cn, formatMontant } from '@/lib/utils';

const SOURCE_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

type RankedItem = {
  key: string;
  label: string;
  amount: number;
  rate: number;
};

type PipelineStage = {
  key: string;
  label: string;
  amount: number;
  rate: number;
  icon: typeof Wallet;
  colorClass: string;
  toneClass: string;
};

const sumBy = <T,>(items: T[], selector: (item: T) => number) =>
  items.reduce((total, item) => total + selector(item), 0);

const clampPercent = (value: number) => Math.max(0, Math.min(100, value));

const formatAmountShort = (value: number) => {
  const absoluteValue = Math.abs(value);

  if (absoluteValue >= 1_000_000_000) {
    return `${formatMontant(value / 1_000_000_000, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} Mds`;
  }

  if (absoluteValue >= 1_000_000) {
    return `${formatMontant(value / 1_000_000, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} M`;
  }

  return formatMontant(value, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

const formatPercent = (value: number) =>
  `${formatMontant(value, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} %`;

const formatDateRange = (start: string, end: string) => {
  const formatter = new Intl.DateTimeFormat('fr-FR');
  return `${formatter.format(new Date(start))} - ${formatter.format(new Date(end))}`;
};

const isDateInRange = (dateValue: string | undefined, startDate: string, endDate: string) => {
  if (!dateValue) return false;
  const current = new Date(dateValue);
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(current.getTime()) || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return false;
  }

  return current >= start && current <= end;
};

const buildMonthRange = (startDate: string, endDate: string) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return [];
  }

  const months: Array<{ label: string; end: Date }> = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const finalMonth = new Date(end.getFullYear(), end.getMonth(), 1);

  while (cursor <= finalMonth) {
    months.push({
      label: cursor.toLocaleDateString('fr-FR', { month: 'short' }),
      end: new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59, 999),
    });

    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
};

const downloadCsv = (filename: string, rows: string[][]) => {
  const csv = rows
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';'))
    .join('\n');

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

const ExecutiveProgressBanner = ({
  rate,
  startDate,
  endDate,
}: {
  rate: number;
  startDate: string;
  endDate: string;
}) => (
  <Card className="overflow-hidden border-border/80 bg-card shadow-sm">
    <CardContent className="space-y-5 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Target className="h-4 w-4 text-primary" />
            Taux d&apos;exécution global
          </div>
          <div className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
            {formatPercent(rate)}
          </div>
        </div>
        <Badge variant="outline" className="w-fit border-primary/20 bg-primary/5 px-3 py-1 text-primary">
          Exécution consolidée sur la période sélectionnée
        </Badge>
      </div>

      <div className="space-y-3">
        <div className="h-4 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 via-sky-500 to-emerald-500 transition-all"
            style={{ width: `${clampPercent(rate)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          <span>0%</span>
          <span>{formatDateRange(startDate, endDate)}</span>
          <span>100%</span>
        </div>
      </div>
    </CardContent>
  </Card>
);

const ExecutiveTableCard = ({
  title,
  subtitle,
  emptyLabel,
  valueHeader,
  deltaHeader,
  rows,
  type,
}: {
  title: string;
  subtitle: string;
  emptyLabel: string;
  valueHeader: string;
  deltaHeader: string;
  rows: RankedItem[];
  type: 'overspend' | 'under';
}) => (
  <Card className="border-border/80 shadow-sm">
    <CardHeader className="pb-4">
      <CardTitle>{title}</CardTitle>
      <CardDescription>{subtitle}</CardDescription>
    </CardHeader>
    <CardContent>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-[minmax(0,1.4fr)_120px_120px] gap-4 border-b border-border pb-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            <span>Structure / Programme</span>
            <span className="text-right">{valueHeader}</span>
            <span className="text-right">{deltaHeader}</span>
          </div>
          {rows.map((row) => (
            <div
              key={row.key}
              className="grid grid-cols-[minmax(0,1.4fr)_120px_120px] items-center gap-4 rounded-xl border border-transparent px-2 py-3 transition-colors hover:border-border hover:bg-muted/20"
            >
              <span className="truncate font-medium text-foreground">{row.label}</span>
              <span className="text-right font-medium text-foreground">{formatAmountShort(row.amount)}</span>
              <span
                className={cn(
                  'text-right font-semibold',
                  type === 'overspend' ? 'text-rose-600' : 'text-amber-700',
                )}
              >
                {type === 'overspend' ? formatPercent(row.rate) : formatPercent(row.rate)}
              </span>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

const ExecutiveDashboard = () => {
  const { currentClient } = useClient();
  const { currentExercice } = useExercice();
  const { lignes, isLoading: lignesLoading } = useLignesBudgetaires();
  const { enveloppes, isLoading: enveloppesLoading } = useEnveloppes();
  const { reservations, isLoading: reservationsLoading } = useReservations();
  const { engagements, isLoading: engagementsLoading } = useEngagements();
  const { bonsCommande, isLoading: bonsCommandeLoading } = useBonsCommande();
  const { factures, isLoading: facturesLoading } = useFactures();
  const { depenses, isLoading: depensesLoading } = useDepenses();
  const { paiements, isLoading: paiementsLoading } = usePaiements();
  const { stats: comptesStats, isLoading: tresorerieLoading } = useComptesTresorerie();
  const { sections } = useSections();
  const { programmes } = useProgrammes();
  const { actions } = useActions();

  const [periodStart, setPeriodStart] = useState(currentExercice?.dateDebut ?? '');
  const [periodEnd, setPeriodEnd] = useState(currentExercice?.dateFin ?? '');

  useEffect(() => {
    setPeriodStart(currentExercice?.dateDebut ?? '');
    setPeriodEnd(currentExercice?.dateFin ?? '');
  }, [currentExercice?.dateDebut, currentExercice?.dateFin]);

  const safePeriodStart = periodStart || currentExercice?.dateDebut || '';
  const safePeriodEnd = periodEnd || currentExercice?.dateFin || '';

  const filteredLignes = useMemo(
    () => lignes.filter((ligne) => isDateInRange(ligne.dateCreation, safePeriodStart, safePeriodEnd)),
    [lignes, safePeriodStart, safePeriodEnd],
  );

  const filteredEnveloppes = useMemo(
    () => enveloppes.filter((enveloppe) => isDateInRange(enveloppe.createdAt, safePeriodStart, safePeriodEnd)),
    [enveloppes, safePeriodStart, safePeriodEnd],
  );

  const filteredReservations = useMemo(
    () => reservations.filter((reservation) => isDateInRange(reservation.dateReservation, safePeriodStart, safePeriodEnd)),
    [reservations, safePeriodStart, safePeriodEnd],
  );

  const filteredEngagements = useMemo(
    () => engagements.filter((engagement) => isDateInRange(engagement.dateCreation, safePeriodStart, safePeriodEnd)),
    [engagements, safePeriodStart, safePeriodEnd],
  );

  const filteredBonsCommande = useMemo(
    () => bonsCommande.filter((bonCommande) => isDateInRange(bonCommande.dateCommande, safePeriodStart, safePeriodEnd)),
    [bonsCommande, safePeriodStart, safePeriodEnd],
  );

  const filteredFactures = useMemo(
    () => factures.filter((facture) => isDateInRange(facture.dateFacture, safePeriodStart, safePeriodEnd)),
    [factures, safePeriodStart, safePeriodEnd],
  );

  const filteredDepenses = useMemo(
    () => depenses.filter((depense) => isDateInRange(depense.dateDepense, safePeriodStart, safePeriodEnd)),
    [depenses, safePeriodStart, safePeriodEnd],
  );

  const filteredPaiements = useMemo(
    () => paiements.filter((paiement) => isDateInRange(paiement.datePaiement, safePeriodStart, safePeriodEnd)),
    [paiements, safePeriodStart, safePeriodEnd],
  );

  const isLoading =
    lignesLoading ||
    enveloppesLoading ||
    reservationsLoading ||
    engagementsLoading ||
    bonsCommandeLoading ||
    facturesLoading ||
    depensesLoading ||
    paiementsLoading ||
    tresorerieLoading;

  const fundingChartData = useMemo(() => {
    const grouped = filteredEnveloppes.reduce<Record<string, number>>((accumulator, enveloppe) => {
      const key = enveloppe.sourceFinancement || 'Non renseigné';
      accumulator[key] = (accumulator[key] || 0) + enveloppe.montantAlloue;
      return accumulator;
    }, {});

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((left, right) => right.value - left.value);
  }, [filteredEnveloppes]);

  const kpis = useMemo(() => {
    const authorizedFromEnveloppes = sumBy(filteredEnveloppes, (item) => item.montantAlloue);
    const consumedFromEnveloppes = sumBy(filteredEnveloppes, (item) => item.montantConsomme);
    const authorizedFromBudget = sumBy(filteredLignes, (item) => item.montantModifie);
    const consumedFromBudget = sumBy(filteredLignes, (item) => item.montantEngage);

    const budgetTotalAutorise = authorizedFromEnveloppes > 0 ? authorizedFromEnveloppes : authorizedFromBudget;
    const budgetConsomme = consumedFromEnveloppes > 0 ? consumedFromEnveloppes : consumedFromBudget;
    const soldeDisponible = budgetTotalAutorise - budgetConsomme;
    const tresorerieDisponible = comptesStats?.soldeTotal ?? 0;
    const tauxExecution = budgetTotalAutorise > 0 ? (budgetConsomme / budgetTotalAutorise) * 100 : 0;

    return {
      budgetTotalAutorise,
      budgetConsomme,
      soldeDisponible,
      tresorerieDisponible,
      tauxExecution,
    };
  }, [filteredEnveloppes, filteredLignes, comptesStats?.soldeTotal]);

  const evolutionData = useMemo(() => {
    if (!safePeriodStart || !safePeriodEnd) return [];

    const months = buildMonthRange(safePeriodStart, safePeriodEnd);

    return months.map((month) => {
      const budgetCumule = sumBy(
        filteredLignes.filter((ligne) => new Date(ligne.dateCreation) <= month.end),
        (ligne) => ligne.montantModifie,
      );

      const realiseCumule = sumBy(
        filteredDepenses.filter((depense) => new Date(depense.dateDepense) <= month.end && depense.statut !== 'annulee'),
        (depense) => depense.montant,
      );

      return {
        mois: month.label,
        budget: budgetCumule,
        realise: realiseCumule,
      };
    });
  }, [filteredDepenses, filteredLignes, safePeriodEnd, safePeriodStart]);

  const rankings = useMemo(() => {
    const actionsById = new Map(actions.map((action) => [action.id, action]));
    const programmesById = new Map(programmes.map((programme) => [programme.id, programme]));
    const sectionsById = new Map(sections.map((section) => [section.id, section]));

    const grouped = filteredLignes.reduce<Record<string, { label: string; budget: number; consumed: number }>>((accumulator, ligne) => {
      const action = actionsById.get(ligne.actionId);
      const programme = action ? programmesById.get(action.programme_id) : undefined;
      const section = programme ? sectionsById.get(programme.section_id) : undefined;
      const key = programme?.id ?? ligne.id;
      const label = programme
        ? `${section?.code ? `${section.code} / ` : ''}${programme.libelle}`
        : ligne.libelle;

      if (!accumulator[key]) {
        accumulator[key] = {
          label,
          budget: 0,
          consumed: 0,
        };
      }

      accumulator[key].budget += ligne.montantModifie;
      accumulator[key].consumed += ligne.montantEngage;

      return accumulator;
    }, {});

    const rankedItems = Object.entries(grouped).map(([key, item]) => {
      const overspendAmount = Math.max(0, item.consumed - item.budget);
      const overspendRate = item.budget > 0 ? (overspendAmount / item.budget) * 100 : 0;
      const underExecutionRate = item.budget > 0 ? (item.consumed / item.budget) * 100 : 0;
      const underExecutionGap = Math.max(0, item.budget - item.consumed);

      return {
        key,
        label: item.label,
        overspendAmount,
        overspendRate,
        underExecutionRate,
        underExecutionGap,
      };
    });

    return {
      topOverspends: rankedItems
        .filter((item) => item.overspendAmount > 0)
        .sort((left, right) => right.overspendAmount - left.overspendAmount)
        .slice(0, 5)
        .map((item) => ({
          key: item.key,
          label: item.label,
          amount: item.overspendAmount,
          rate: item.overspendRate,
        })),
      topUnderExecution: rankedItems
        .filter((item) => item.underExecutionGap > 0 && item.underExecutionRate < 100)
        .sort((left, right) => left.underExecutionRate - right.underExecutionRate)
        .slice(0, 5)
        .map((item) => ({
          key: item.key,
          label: item.label,
          amount: item.underExecutionGap,
          rate: item.underExecutionRate,
        })),
    };
  }, [actions, filteredLignes, programmes, sections]);

  const pipelineStages = useMemo<PipelineStage[]>(() => {
    const budgetBase = kpis.budgetTotalAutorise;
    const toRate = (amount: number) => (budgetBase > 0 ? (amount / budgetBase) * 100 : 0);

    return [
      {
        key: 'reservation',
        label: 'Réservation',
        amount: sumBy(
          filteredReservations.filter((item) => item.statut !== 'annulee' && item.statut !== 'expiree'),
          (item) => item.montant,
        ),
        rate: 0,
        icon: Wallet,
        colorClass: 'text-blue-600',
        toneClass: 'bg-blue-50 border-blue-100',
      },
      {
        key: 'engagement',
        label: 'Engagement',
        amount: sumBy(
          filteredEngagements.filter((item) => item.statut !== 'annule'),
          (item) => item.montant,
        ),
        rate: 0,
        icon: FileChartColumnIncreasing,
        colorClass: 'text-emerald-600',
        toneClass: 'bg-emerald-50 border-emerald-100',
      },
      {
        key: 'bon-commande',
        label: 'Bon de commande',
        amount: sumBy(
          filteredBonsCommande.filter((item) => item.statut !== 'annule'),
          (item) => item.montant,
        ),
        rate: 0,
        icon: ShoppingCart,
        colorClass: 'text-amber-600',
        toneClass: 'bg-amber-50 border-amber-100',
      },
      {
        key: 'facture',
        label: 'Facture',
        amount: sumBy(
          filteredFactures.filter((item) => item.statut !== 'annulee'),
          (item) => item.montantTTC,
        ),
        rate: 0,
        icon: ReceiptText,
        colorClass: 'text-orange-600',
        toneClass: 'bg-orange-50 border-orange-100',
      },
      {
        key: 'depense',
        label: 'Dépense',
        amount: sumBy(
          filteredDepenses.filter((item) => item.statut !== 'annulee'),
          (item) => item.montant,
        ),
        rate: 0,
        icon: Landmark,
        colorClass: 'text-rose-600',
        toneClass: 'bg-rose-50 border-rose-100',
      },
      {
        key: 'paiement',
        label: 'Paiement',
        amount: sumBy(
          filteredPaiements.filter((item) => item.statut === 'valide'),
          (item) => item.montant,
        ),
        rate: 0,
        icon: CreditCard,
        colorClass: 'text-violet-600',
        toneClass: 'bg-violet-50 border-violet-100',
      },
    ].map((stage) => ({
      ...stage,
      rate: toRate(stage.amount),
    }));
  }, [
    filteredBonsCommande,
    filteredDepenses,
    filteredEngagements,
    filteredFactures,
    filteredPaiements,
    filteredReservations,
    kpis.budgetTotalAutorise,
  ]);

  const handleExport = () => {
    try {
      downloadCsv(
        `executive-dashboard-${safePeriodStart}-${safePeriodEnd}.csv`,
        [
          ['Bloc', 'Libellé', 'Valeur'],
          ['KPI', 'Budget total autorisé', formatAmountShort(kpis.budgetTotalAutorise)],
          ['KPI', 'Budget consommé', formatAmountShort(kpis.budgetConsomme)],
          ['KPI', 'Solde disponible', formatAmountShort(kpis.soldeDisponible)],
          ['KPI', 'Trésorerie disponible', formatAmountShort(kpis.tresorerieDisponible)],
          ['Synthèse', 'Taux d’exécution global', formatPercent(kpis.tauxExecution)],
          ...pipelineStages.map((stage) => ['Pipeline', stage.label, formatAmountShort(stage.amount)]),
          ...rankings.topOverspends.map((item) => ['Top dépassements', item.label, `${formatAmountShort(item.amount)} | ${formatPercent(item.rate)}`]),
          ...rankings.topUnderExecution.map((item) => ['Top sous-exécutions', item.label, `${formatAmountShort(item.amount)} | ${formatPercent(item.rate)}`]),
        ],
      );
      toast.success('Export du dashboard généré');
    } catch (error) {
      toast.error('Impossible d’exporter le dashboard');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Executive Dashboard"
        description={`${currentClient?.nom ?? 'Client'} - ${currentExercice?.libelle ?? 'Période active'}`}
        actions={
          <>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-sm">
              <span className="text-sm font-medium text-muted-foreground">Période</span>
              <Input
                type="date"
                value={safePeriodStart}
                onChange={(event) => setPeriodStart(event.target.value)}
                className="h-9 w-[150px] border-0 bg-transparent px-2 shadow-none focus-visible:ring-0"
              />
              <span className="text-sm text-muted-foreground">-</span>
              <Input
                type="date"
                value={safePeriodEnd}
                onChange={(event) => setPeriodEnd(event.target.value)}
                className="h-9 w-[150px] border-0 bg-transparent px-2 shadow-none focus-visible:ring-0"
              />
            </div>
            <Button onClick={handleExport} className="h-11 rounded-xl px-4 shadow-sm">
              <Download className="mr-2 h-4 w-4" />
              Exporter
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="Budget total autorisé"
          value={formatAmountShort(kpis.budgetTotalAutorise)}
          icon={Wallet}
          trend={isLoading ? 'Chargement des agrégats...' : 'Base autorisée sur la période'}
          trendUp
          color="text-blue-600"
        />
        <StatsCard
          title="Budget consommé"
          value={formatAmountShort(kpis.budgetConsomme)}
          icon={FileChartColumnIncreasing}
          trend={formatPercent(kpis.tauxExecution)}
          trendUp
          color="text-emerald-600"
        />
        <StatsCard
          title="Solde disponible"
          value={formatAmountShort(kpis.soldeDisponible)}
          icon={WalletCards}
          trend="Capacité restante avant arbitrage"
          trendUp={kpis.soldeDisponible >= 0}
          color="text-amber-600"
        />
        <StatsCard
          title="Trésorerie disponible"
          value={formatAmountShort(kpis.tresorerieDisponible)}
          icon={Landmark}
          trend="Trésorerie active consolidée"
          trendUp
          color="text-violet-600"
        />
      </div>

      <ExecutiveProgressBanner
        rate={kpis.tauxExecution}
        startDate={safePeriodStart}
        endDate={safePeriodEnd}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>Évolution : Budget vs Réalisé</CardTitle>
            <CardDescription>Cumul mensuel dérivé des lignes budgétaires et des dépenses de la période.</CardDescription>
          </CardHeader>
          <CardContent className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mois" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(value) => formatAmountShort(value)} />
                <Tooltip
                  formatter={(value: number) => formatAmountShort(value)}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid hsl(var(--border))',
                    backgroundColor: 'hsl(var(--background))',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="budget"
                  name="Budget cumulé"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="realise"
                  name="Réalisé cumulé"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>Répartition par source de financement</CardTitle>
            <CardDescription>Consolidation des enveloppes budgétaires par source.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={fundingChartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={2}
                  >
                    {fundingChartData.map((entry, index) => (
                      <Cell key={entry.name} fill={SOURCE_COLORS[index % SOURCE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatAmountShort(value)}
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid hsl(var(--border))',
                      backgroundColor: 'hsl(var(--background))',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-4">
              {fundingChartData.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                  Aucune enveloppe disponible sur la période.
                </div>
              ) : (
                fundingChartData.map((entry, index) => {
                  const share = kpis.budgetTotalAutorise > 0 ? (entry.value / kpis.budgetTotalAutorise) * 100 : 0;

                  return (
                    <div key={entry.name} className="flex items-start gap-3">
                      <span
                        className="mt-1 h-3 w-3 rounded-full"
                        style={{ backgroundColor: SOURCE_COLORS[index % SOURCE_COLORS.length] }}
                      />
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{entry.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatAmountShort(entry.value)} ({formatPercent(share)})
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>État d&apos;avancement des opérations</CardTitle>
          <CardDescription>Lecture séquentielle du pipeline budgétaire sur la période.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-6">
          {pipelineStages.map((stage) => {
            const Icon = stage.icon;

            return (
              <div key={stage.key} className={cn('rounded-2xl border p-4', stage.toneClass)}>
                <div className="mb-4 flex items-center justify-between">
                  <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm', stage.colorClass)}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <Badge variant="outline" className="bg-white/70">
                    {formatPercent(stage.rate)}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{stage.label}</p>
                  <p className="text-2xl font-semibold tracking-tight text-foreground">{formatAmountShort(stage.amount)}</p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ExecutiveTableCard
          title="Top 5 dépassements budgétaires"
          subtitle="Classement des programmes dont les engagements dépassent l’autorisation."
          emptyLabel="Aucun dépassement budgétaire détecté sur la période."
          valueHeader="Dépassement"
          deltaHeader="% dépassement"
          rows={rankings.topOverspends}
          type="overspend"
        />
        <ExecutiveTableCard
          title="Top 5 sous-exécutions"
          subtitle="Programmes les moins exécutés par rapport au budget autorisé."
          emptyLabel="Aucune sous-exécution significative sur la période."
          valueHeader="Écart au plan"
          deltaHeader="Taux d’exécution"
          rows={rankings.topUnderExecution}
          type="under"
        />
      </div>
    </div>
  );
};

export default ExecutiveDashboard;
