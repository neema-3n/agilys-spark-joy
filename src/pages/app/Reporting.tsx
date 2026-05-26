import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  reportCategories,
  reportsByCategory,
} from '@/lib/reporting-definitions';
import type { ReportDefinition, ReportingDataContext, ReportingFilters } from '@/types/reporting';
import {
  BookOpen,
  CalendarRange,
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
  const navigate = useNavigate();
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

  const statusOptions = useMemo(() => {
    const statuses = new Set<string>();
    builtReport.rows.forEach((row) => {
      if (row.meta?.status) statuses.add(row.meta.status);
    });
    return Array.from(statuses);
  }, [builtReport.rows]);

  const reportLabel = selectedReport ? `Rapport ${category?.label.toLowerCase()}` : 'Rapport';
  const stamp = getReportMetadataStamp(reportingContext);
  const ActiveIcon = CATEGORY_ICONS[activeTab as keyof typeof CATEGORY_ICONS] || FileText;

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
        title="Reporting"
        description={category?.objective || 'Pilotage des états et rapports AGILYS.'}
        sticky={false}
      />

      <Tabs
        value={activeTab}
        onValueChange={(value) => navigate(`/app/reporting/${value}`)}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-2 gap-2 md:grid-cols-5">
          {reportCategories.map((reportCategory) => {
            const Icon = CATEGORY_ICONS[reportCategory.id];
            return (
              <TabsTrigger key={reportCategory.id} value={reportCategory.id} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span>{reportCategory.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {reportCategories.map((reportCategory) => (
          <TabsContent key={reportCategory.id} value={reportCategory.id} className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <ActiveIcon className="h-4 w-4" />
                  <span>{reportCategory.label}</span>
                </div>
                <p className="max-w-3xl text-sm text-muted-foreground">
                  {selectedReport?.description || reportCategory.objective}
                </p>
              </div>

              <div className="w-full lg:max-w-md">
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
            </div>

            <Card>
              <CardContent className="space-y-6 pt-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
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
                    <Label>Projet</Label>
                    <Select
                      value={draftFilters.projectId}
                      onValueChange={(value) =>
                        setDraftFilters((previous) => ({
                          ...previous,
                          projectId: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les projets</SelectItem>
                        {projets.map((projet) => (
                          <SelectItem key={projet.id} value={projet.id}>
                            {projet.code} - {projet.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Statut</Label>
                    <Select
                      value={draftFilters.status}
                      onValueChange={(value) =>
                        setDraftFilters((previous) => ({
                          ...previous,
                          status: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous</SelectItem>
                        {statusOptions.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Devise</Label>
                    <Select
                      value={draftFilters.devise}
                      onValueChange={(value) =>
                        setDraftFilters((previous) => ({
                          ...previous,
                          devise: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes</SelectItem>
                        <SelectItem value={currentClient?.devise || 'XOF'}>
                          {currentClient?.devise || 'XOF'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div className="flex-1 space-y-2">
                    <Label>Recherche</Label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={draftFilters.search}
                        onChange={(event) =>
                          setDraftFilters((previous) => ({
                            ...previous,
                            search: event.target.value,
                          }))
                        }
                        placeholder="Rechercher dans le rapport"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 xl:min-w-[620px]">
                    <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
                      <div className="space-y-1">
                        <Label>Modèle de sortie</Label>
                        <p className="text-xs text-muted-foreground">
                          Définition d’output appliquée à l’écran et aux exports.
                        </p>
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
                  </div>
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
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default Reporting;
