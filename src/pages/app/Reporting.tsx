import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ReportingTable } from '@/components/reporting/ReportingTable';
import { useLignesBudgetaires } from '@/hooks/useLignesBudgetaires';
import { useEngagements } from '@/hooks/useEngagements';
import { useDepenses } from '@/hooks/useDepenses';
import { useFactures } from '@/hooks/useFactures';
import { useRecettes } from '@/hooks/useRecettes';
import { useEcrituresComptables } from '@/hooks/useEcrituresComptables';
import { useTresorerie } from '@/hooks/useTresorerie';
import { useComptesTresorerie } from '@/hooks/useComptesTresorerie';
import { useRapprochementsBancaires } from '@/hooks/useRapprochementsBancaires';
import { useOperationsTresorerie } from '@/hooks/useOperationsTresorerie';
import { useProjets } from '@/hooks/useProjets';
import { useSections } from '@/hooks/useSections';
import { useProgrammes } from '@/hooks/useProgrammes';
import { useActions } from '@/hooks/useActions';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import { useAuth } from '@/contexts/AuthContext';
import { budgetService } from '@/services/api/budget.service';
import { exportReportToPdf, exportReportToXls } from '@/lib/reporting-export';
import {
  getDefaultReportForCategory,
  getReportCategory,
  getReportDefinition,
  getReportMetadataStamp,
  reportsByCategory,
} from '@/lib/reporting-definitions';
import type { ReportDefinition, ReportingDataContext, ReportingFilters } from '@/types/reporting';
import {
  BookOpen,
  FileSpreadsheet,
  FileText,
  Landmark,
  Play,
  Search,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const CATEGORY_ICONS = {
  budgetaire: TrendingUp,
  financier: Landmark,
  comptable: BookOpen,
  tresorerie: WalletCards,
  reglementaire: FileText,
} as const;

const DEFAULT_FILTERS: ReportingFilters = {
  period: 'personnalisee',
  dateDebut: '',
  dateFin: '',
  projectId: 'all',
  status: 'all',
  devise: 'XOF',
  search: '',
};

const applyPeriodPreset = (
  period: ReportingFilters['period'],
  currentExerciceStart?: string,
  currentExerciceEnd?: string,
) => {
  const today = new Date();
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
  const currentQuarterStartMonth = Math.floor(today.getMonth() / 3) * 3;
  const currentQuarterStart = new Date(today.getFullYear(), currentQuarterStartMonth, 1).toISOString().split('T')[0];
  const currentQuarterEnd = new Date(today.getFullYear(), currentQuarterStartMonth + 3, 0).toISOString().split('T')[0];

  if (period === 'mois') {
    return { dateDebut: currentMonthStart, dateFin: currentMonthEnd };
  }
  if (period === 'trimestre') {
    return { dateDebut: currentQuarterStart, dateFin: currentQuarterEnd };
  }
  if (period === 'exercice') {
    return {
      dateDebut: currentExerciceStart || '',
      dateFin: currentExerciceEnd || '',
    };
  }
  return {};
};

const filterRows = (
  rows: ReturnType<ReportDefinition['build']>['rows'],
  filters: ReportingFilters,
) => {
  const searchTerm = filters.search.trim().toLowerCase();

  return rows.filter((row) => {
    if (filters.dateDebut && row.meta?.date && row.meta.date < filters.dateDebut) return false;
    if (filters.dateFin && row.meta?.date && row.meta.date > filters.dateFin) return false;
    if (filters.projectId !== 'all' && row.meta?.projectId !== filters.projectId) return false;
    if (filters.status !== 'all' && row.meta?.status !== filters.status) return false;
    if (filters.devise !== 'all' && row.meta?.devise && row.meta.devise !== filters.devise) return false;
    if (searchTerm.length === 0) return true;

    const haystack = [
      row.meta?.searchText,
      ...Object.values(row.cells).map((value) => (value === null || value === undefined ? '' : String(value))),
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(searchTerm);
  });
};

const Reporting = () => {
  const { reportType } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = reportType || 'budgetaire';
  const reportOptions = reportsByCategory[activeTab] || [];
  const selectedReportId = searchParams.get('report');
  const defaultReport = getDefaultReportForCategory(activeTab);
  const rawSelectedReport = getReportDefinition(selectedReportId);
  const selectedReport =
    rawSelectedReport?.categoryId === activeTab ? rawSelectedReport : defaultReport;
  const category = getReportCategory(activeTab);
  const { currentClient } = useClient();
  const { currentExercice } = useExercice();
  const { user } = useAuth();

  const { lignes: lignesBudgetaires } = useLignesBudgetaires();
  const { engagements } = useEngagements();
  const { depenses } = useDepenses();
  const { factures } = useFactures();
  const { recettes } = useRecettes();
  const { ecritures } = useEcrituresComptables();
  const { comptes: comptesTresorerie } = useComptesTresorerie();
  const { rapprochements: rapprochementsBancaires } = useRapprochementsBancaires();
  const { operations: operationsTresorerie } = useOperationsTresorerie();
  const { projets } = useProjets();
  const { sections } = useSections();
  const { programmes } = useProgrammes();
  const { actions } = useActions();
  const { previsions } = useTresorerie();
  const { data: modificationsBudgetaires = [] } = useQuery({
    queryKey: ['modifications-budgetaires', currentExercice?.id, currentClient?.id],
    queryFn: () => budgetService.getModifications(currentExercice!.id, currentClient!.id),
    enabled: !!currentExercice?.id && !!currentClient?.id,
  });

  const [draftFilters, setDraftFilters] = useState<ReportingFilters>(() => ({
    ...DEFAULT_FILTERS,
    dateDebut: currentExercice?.dateDebut || '',
    dateFin: currentExercice?.dateFin || '',
    devise: currentClient?.devise || 'XOF',
  }));
  const [appliedFilters, setAppliedFilters] = useState<ReportingFilters>(() => ({
    ...DEFAULT_FILTERS,
    dateDebut: currentExercice?.dateDebut || '',
    dateFin: currentExercice?.dateFin || '',
    devise: currentClient?.devise || 'XOF',
  }));
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [showTotals, setShowTotals] = useState(true);

  useEffect(() => {
    if (!defaultReport) return;

    if (!selectedReport || selectedReport.id !== selectedReportId) {
      setSearchParams((previous) => {
        const next = new URLSearchParams(previous);
        next.set('report', defaultReport.id);
        return next;
      });
    }
  }, [defaultReport, selectedReport, selectedReportId, setSearchParams]);

  useEffect(() => {
    setDraftFilters((previous) => ({
      ...previous,
      dateDebut: previous.dateDebut || currentExercice?.dateDebut || '',
      dateFin: previous.dateFin || currentExercice?.dateFin || '',
      devise: currentClient?.devise || previous.devise,
    }));
    setAppliedFilters((previous) => ({
      ...previous,
      dateDebut: previous.dateDebut || currentExercice?.dateDebut || '',
      dateFin: previous.dateFin || currentExercice?.dateFin || '',
      devise: currentClient?.devise || previous.devise,
    }));
  }, [currentClient?.devise, currentExercice?.dateDebut, currentExercice?.dateFin]);

  useEffect(() => {
    if (!selectedReport) return;
    setSelectedTemplateId(selectedReport.outputTemplates[0]?.id || '');
  }, [selectedReport?.id]);

  const reportingContext = useMemo<ReportingDataContext>(
    () => ({
      lignesBudgetaires,
      modificationsBudgetaires,
      engagements,
      factures,
      depenses,
      recettes,
      ecritures,
      operationsTresorerie: previsions.length > 0 ? previsions as any : operationsTresorerie,
      comptesTresorerie,
      rapprochementsBancaires,
      projets,
      sections,
      programmes,
      actions,
      currentClientName: currentClient?.nom,
      currentClientCurrency: currentClient?.devise,
      currentExercice,
      currentUser: user,
    }),
    [
      actions,
      comptesTresorerie,
      currentClient?.devise,
      currentClient?.nom,
      currentExercice,
      depenses,
      ecritures,
      engagements,
      factures,
      lignesBudgetaires,
      modificationsBudgetaires,
      operationsTresorerie,
      previsions,
      programmes,
      projets,
      rapprochementsBancaires,
      recettes,
      sections,
      user,
    ],
  );

  const builtReport = useMemo(() => {
    if (!selectedReport) {
      return {
        availability: 'empty' as const,
        rows: [],
        message: 'Sélectionnez un rapport.',
      };
    }
    return selectedReport.build(reportingContext);
  }, [reportingContext, selectedReport]);

  const selectedTemplate =
    selectedReport?.outputTemplates.find((template) => template.id === selectedTemplateId) ||
    selectedReport?.outputTemplates[0];

  const visibleColumns = useMemo(() => {
    if (!selectedReport) return [];
    if (!selectedTemplate?.columnIds || selectedTemplate.columnIds.length === 0) {
      return selectedReport.columns;
    }
    return selectedReport.columns.filter((column) => selectedTemplate.columnIds?.includes(column.id));
  }, [selectedReport, selectedTemplate]);

  const filteredRows = useMemo(
    () => filterRows(builtReport.rows, appliedFilters),
    [appliedFilters, builtReport.rows],
  );

  const reportLabel = 'Rapport';
  const stamp = getReportMetadataStamp(reportingContext);
  const headerTitle = category ? `Reporting ${category.label.toLowerCase()}` : 'Reporting';
  const headerDescription =
    category?.id === 'budgetaire'
      ? 'Suivi du budget et de sa consommation.'
      : category?.objective || 'Pilotage des états et rapports AGILYS.';

  const handleApplyFilters = () => {
    setAppliedFilters(draftFilters);
  };

  const handleExportXls = () => {
    if (!selectedReport) return;
    exportReportToXls({
      title: `${selectedReport.label} - ${currentClient?.nom || 'AGILYS'}`,
      columns: visibleColumns,
      rows: filteredRows,
      filename: `${selectedReport.id}-${new Date().toISOString().split('T')[0]}.xls`,
    });
    toast.success('Export XLS lancé');
  };

  const handleExportPdf = () => {
    if (!selectedReport) return;
    exportReportToPdf({
      title: selectedReport.label,
      subtitle: `${category?.label || ''} · ${currentClient?.nom || ''} · ${stamp}`,
      columns: visibleColumns,
      rows: filteredRows,
      filename: `${selectedReport.id}-${new Date().toISOString().split('T')[0]}.pdf`,
    });
    toast.success('Export PDF généré');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={headerTitle}
        description={headerDescription || 'Pilotage des états et rapports AGILYS.'}
        actions={
          <div className="w-full rounded-2xl border bg-card px-4 py-3 shadow-sm md:w-[360px]">
            <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">
              {reportLabel}
            </Label>
            <Select
              value={selectedReport?.id}
              onValueChange={(value) => {
                setSearchParams((previous) => {
                  const next = new URLSearchParams(previous);
                  next.set('report', value);
                  return next;
                });
              }}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Sélectionner un rapport" />
              </SelectTrigger>
              <SelectContent>
                {reportOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
        sticky={false}
      />

      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-6 pt-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.1fr_1fr_1fr_1.25fr_auto_auto_auto]">
              <div className="space-y-2">
                <Label>Période</Label>
                <Select
                  value={draftFilters.period}
                  onValueChange={(value: ReportingFilters['period']) => {
                    const nextDates = applyPeriodPreset(
                      value,
                      currentExercice?.dateDebut,
                      currentExercice?.dateFin,
                    );
                    setDraftFilters((previous) => ({
                      ...previous,
                      period: value,
                      ...nextDates,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personnalisee">Personnalisée</SelectItem>
                    <SelectItem value="mois">Mois en cours</SelectItem>
                    <SelectItem value="trimestre">Trimestre</SelectItem>
                    <SelectItem value="exercice">Exercice</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date début</Label>
                <Input
                  type="date"
                  value={draftFilters.dateDebut}
                  onChange={(event) =>
                    setDraftFilters((previous) => ({
                      ...previous,
                      dateDebut: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Date fin</Label>
                <Input
                  type="date"
                  value={draftFilters.dateFin}
                  onChange={(event) =>
                    setDraftFilters((previous) => ({
                      ...previous,
                      dateFin: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Modèle de sortie</Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedReport?.outputTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button className="h-10 self-end" onClick={handleApplyFilters}>
                <Play className="mr-2 h-4 w-4" />
                Afficher le rapport
              </Button>
              <Button variant="outline" className="h-10 self-end px-3" onClick={handleExportXls}>
                <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
                XLS
              </Button>
              <Button variant="outline" className="h-10 self-end px-3" onClick={handleExportPdf}>
                <FileText className="mr-2 h-4 w-4 text-rose-600" />
                PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <CardTitle>{selectedReport?.label || 'Rapport'}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {selectedTemplate?.label ? `${selectedTemplate.label} · ` : ''}
                {currentClient?.nom || 'Entité'} · {currentExercice?.libelle || 'Exercice'} · Généré le {stamp}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span>{filteredRows.length} lignes</span>
              <div className="flex items-center gap-2">
                <Label htmlFor="totals-toggle" className="text-sm text-muted-foreground">
                  Totaux affichés
                </Label>
                <Switch id="totals-toggle" checked={showTotals} onCheckedChange={setShowTotals} />
              </div>
              {builtReport.availability !== 'live' && (
                <span
                  className={cn(
                    'rounded-full px-2.5 py-1 text-xs font-medium',
                    builtReport.availability === 'partial'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-700',
                  )}
                >
                  {builtReport.availability === 'partial' ? 'Données partielles' : 'À compléter'}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {builtReport.message ? (
              <div className="rounded-md border border-dashed bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                {builtReport.message}
              </div>
            ) : null}

            <ReportingTable columns={visibleColumns} rows={filteredRows} totalsEnabled={showTotals} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reporting;
