import { useState, useMemo, Fragment } from 'react';
import { LigneBudgetaire, Section, Programme, Action } from '@/types/budget.types';
import { Compte } from '@/types/compte.types';
import { Enveloppe } from '@/types/enveloppe.types';
import { formatMontant } from '@/lib/utils';
import { BudgetStatusBadge } from '@/components/ui/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Edit, Trash2, Layers, GitBranch, Zap, MoreHorizontal, BookmarkPlus, LayoutList, Building2, Wallet, FileEdit, Activity } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface BudgetTableProps {
  clientId: string;
  exerciceId: string;
  sections: Section[];
  programmes: Programme[];
  actions: Action[];
  lignes: LigneBudgetaire[];
  comptes: Compte[];
  enveloppes: Enveloppe[];
  onEdit: (ligne: LigneBudgetaire) => void;
  onDelete: (id: string) => void;
  onReserver: (ligne: LigneBudgetaire) => void;
  onCreateModification: (ligne: LigneBudgetaire) => void;
  onViewDetails?: (ligne: LigneBudgetaire) => void;
}

// Helper functions pour localStorage
const getStorageKey = (clientId: string, exerciceId: string, type: 'sections' | 'programmes') => {
  return `budget_expanded_${type}_${clientId}_${exerciceId}`;
};

const getInitialExpandedState = (
  clientId: string, 
  exerciceId: string, 
  type: 'sections' | 'programmes',
  items: Array<{ id: string }>
) => {
  const key = getStorageKey(clientId, exerciceId, type);
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      return new Set<string>(JSON.parse(stored));
    } catch {
      return new Set<string>();
    }
  }
  // Déplier le premier item par défaut si rien en localStorage
  return items.length > 0 ? new Set([items[0].id]) : new Set<string>();
};

const saveExpandedState = (clientId: string, exerciceId: string, type: 'sections' | 'programmes', state: Set<string>) => {
  const key = getStorageKey(clientId, exerciceId, type);
  localStorage.setItem(key, JSON.stringify([...state]));
};

// View mode localStorage helpers
const getViewModeKey = (clientId: string, exerciceId: string) => {
  return `budget_view_mode_${clientId}_${exerciceId}`;
};

const getInitialViewMode = (clientId: string, exerciceId: string): 'hierarchical' | 'compact' | 'monitoring' => {
  const key = getViewModeKey(clientId, exerciceId);
  const stored = localStorage.getItem(key);
  if (stored === 'compact' || stored === 'monitoring') return stored as 'compact' | 'monitoring';
  return 'hierarchical';
};

const saveViewMode = (clientId: string, exerciceId: string, mode: 'hierarchical' | 'compact' | 'monitoring') => {
  const key = getViewModeKey(clientId, exerciceId);
  localStorage.setItem(key, mode);
};

const TOTAL_COLUMNS = 11;
const EMPTY_AGGREGATE = {
  count: 0,
  montantInitial: 0,
  montantModifie: 0,
  montantReserve: 0,
  montantEngage: 0,
  montantLiquide: 0,
  montantPaye: 0,
  disponible: 0,
  tauxExecution: 0,
};

export const BudgetTable = ({
  clientId,
  exerciceId,
  sections,
  programmes,
  actions,
  lignes,
  comptes,
  enveloppes,
  onEdit,
  onDelete,
  onReserver,
  onCreateModification,
  onViewDetails,
}: BudgetTableProps) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => getInitialExpandedState(clientId, exerciceId, 'sections', sections)
  );
  const [expandedProgrammes, setExpandedProgrammes] = useState<Set<string>>(
    () => getInitialExpandedState(clientId, exerciceId, 'programmes', programmes)
  );
  const [viewMode, setViewMode] = useState<'hierarchical' | 'compact' | 'monitoring'>(
    () => getInitialViewMode(clientId, exerciceId)
  );

  /**
   * Toggles the expansion state of a section in the hierarchical budget table view.
   * If the section is currently expanded, it collapses it; otherwise, it expands it.
   * The new state is updated in the component state and persisted to localStorage.
   * @param sectionId - The unique identifier of the section to toggle.
   */
  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
    saveExpandedState(clientId, exerciceId, 'sections', newExpanded);
  };

  const toggleProgramme = (programmeId: string) => {
    const newExpanded = new Set(expandedProgrammes);
    if (newExpanded.has(programmeId)) {
      newExpanded.delete(programmeId);
    } else {
      newExpanded.add(programmeId);
    }
    setExpandedProgrammes(newExpanded);
    saveExpandedState(clientId, exerciceId, 'programmes', newExpanded);
  };

  const getTauxExecution = (ligne: LigneBudgetaire) => {
    if (ligne.montantModifie === 0) return 0;
    return Math.round((ligne.montantEngage / ligne.montantModifie) * 100);
  };

  const handleViewModeChange = (mode: 'hierarchical' | 'compact' | 'monitoring') => {
    setViewMode(mode);
    saveViewMode(clientId, exerciceId, mode);
  };

  const actionLookup = useMemo(() => new Map(actions.map((action) => [action.id, action])), [actions]);
  const programmeLookup = useMemo(() => new Map(programmes.map((programme) => [programme.id, programme])), [programmes]);
  const sectionLookup = useMemo(() => new Map(sections.map((section) => [section.id, section])), [sections]);

  const aggregateLignes = (items: LigneBudgetaire[]) => {
    if (items.length === 0) return EMPTY_AGGREGATE;

    const totals = items.reduce(
      (acc, ligne) => {
        acc.count += 1;
        acc.montantInitial += ligne.montantInitial;
        acc.montantModifie += ligne.montantModifie;
        acc.montantReserve += ligne.montantReserve || 0;
        acc.montantEngage += ligne.montantEngage;
        acc.montantLiquide += ligne.montantLiquide;
        acc.montantPaye += ligne.montantPaye;
        acc.disponible += ligne.disponible;
        return acc;
      },
      {
        count: 0,
        montantInitial: 0,
        montantModifie: 0,
        montantReserve: 0,
        montantEngage: 0,
        montantLiquide: 0,
        montantPaye: 0,
        disponible: 0,
      }
    );

    return {
      ...totals,
      tauxExecution:
        totals.montantModifie === 0 ? 0 : Math.round((totals.montantEngage / totals.montantModifie) * 100),
    };
  };

  const { lignesByActionId, aggregateByActionId, aggregateByProgrammeId, aggregateBySectionId } = useMemo(() => {
    const byAction = new Map<string, LigneBudgetaire[]>();
    const byProgramme = new Map<string, LigneBudgetaire[]>();
    const bySection = new Map<string, LigneBudgetaire[]>();
    const actionAggregateMap = new Map<string, ReturnType<typeof aggregateLignes>>();
    const programmeAggregateMap = new Map<string, ReturnType<typeof aggregateLignes>>();
    const sectionAggregateMap = new Map<string, ReturnType<typeof aggregateLignes>>();

    const addToMap = (
      map: Map<string, LigneBudgetaire[]>,
      key: string,
      ligne: LigneBudgetaire
    ) => {
      const current = map.get(key);
      if (current) {
        current.push(ligne);
      } else {
        map.set(key, [ligne]);
      }
    };

    lignes.forEach((ligne) => {
      const action = actionLookup.get(ligne.actionId);
      if (!action) return;

      addToMap(byAction, action.id, ligne);
      addToMap(byProgramme, action.programme_id, ligne);

      const programme = programmeLookup.get(action.programme_id);
      if (programme) {
        addToMap(bySection, programme.section_id, ligne);
      }
    });

    byAction.forEach((items, actionId) => {
      actionAggregateMap.set(actionId, aggregateLignes(items));
    });

    byProgramme.forEach((items, programmeId) => {
      programmeAggregateMap.set(programmeId, aggregateLignes(items));
    });

    bySection.forEach((items, sectionId) => {
      sectionAggregateMap.set(sectionId, aggregateLignes(items));
    });

    return {
      lignesByActionId: byAction,
      aggregateByActionId: actionAggregateMap,
      aggregateByProgrammeId: programmeAggregateMap,
      aggregateBySectionId: sectionAggregateMap,
    };
  }, [lignes, actionLookup, programmeLookup]);

  // Grouper les lignes budgétaires par action
  const groupedLignesByAction = useMemo(() => {
    // Créer un tableau avec toutes les lignes et leur hiérarchie
    const allLignesWithHierarchy = lignes.map(ligne => {
      const action = actionLookup.get(ligne.actionId);
      const programme = action ? programmeLookup.get(action.programme_id) : undefined;
      const section = programme ? sectionLookup.get(programme.section_id) : undefined;
      
      return {
        ligne,
        section,
        programme,
        action
      };
    });

    // Grouper par action (le filtrage est fait au niveau parent)
    const grouped = new Map<string, {
      section: Section | undefined;
      programme: Programme | undefined;
      action: Action | undefined;
      lignes: LigneBudgetaire[];
    }>();

    allLignesWithHierarchy.forEach(({ ligne, section, programme, action }) => {
      const actionId = action?.id || 'unknown';
      
      if (!grouped.has(actionId)) {
        grouped.set(actionId, {
          section,
          programme,
          action,
          lignes: []
        });
      }
      
      grouped.get(actionId)!.lignes.push(ligne);
    });

    return Array.from(grouped.values());
  }, [lignes, actionLookup, programmeLookup, sectionLookup]);

  // Composant pour l'en-tête de groupe
  const GroupHeader = ({ 
    section, 
    programme, 
    action 
  }: { 
    section?: Section, 
    programme?: Programme, 
    action?: Action 
  }) => (
    <TableRow className="bg-muted/30 border-b-2 border-muted hover:bg-muted/40">
      <TableCell colSpan={TOTAL_COLUMNS} className="py-1.5">
        <TooltipProvider delayDuration={300}>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 flex-shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="secondary" 
                    className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 text-xs px-1.5 py-0.5 cursor-help"
                  >
                    {section?.code || 'N/A'}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-sm font-medium">{section?.code}</p>
                  <p className="text-xs text-muted-foreground">{section?.libelle}</p>
                </TooltipContent>
              </Tooltip>
              
              <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="secondary" 
                    className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 text-xs px-1.5 py-0.5 cursor-help"
                  >
                    {programme?.code || 'N/A'}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-sm font-medium">{programme?.code}</p>
                  <p className="text-xs text-muted-foreground">{programme?.libelle}</p>
                </TooltipContent>
              </Tooltip>
              
              <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="secondary" 
                    className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 text-xs px-1.5 py-0.5 cursor-help"
                  >
                    {action?.code || 'N/A'}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-sm font-medium">{action?.code}</p>
                  <p className="text-xs text-muted-foreground">{action?.libelle}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-1 min-w-0">
              <span className="truncate">{section?.libelle}</span>
              <span className="text-muted-foreground/50">•</span>
              <span className="truncate">{programme?.libelle}</span>
              <span className="text-muted-foreground/50">•</span>
              <span className="truncate font-medium">{action?.libelle}</span>
            </div>
          </div>
        </TooltipProvider>
      </TableCell>
    </TableRow>
  );

  // Composant pour les lignes budgétaires
  const BudgetLineRow = ({ 
    ligne,
    labelClassName = 'pl-8',
    rowClassName = '',
    mode = 'compact',
  }: { 
    ligne: LigneBudgetaire;
    labelClassName?: string;
    rowClassName?: string;
    mode?: 'compact' | 'hierarchical';
  }) => {
    const tauxExecution = getTauxExecution(ligne);
    const compte = comptes.find(c => c.id === ligne.compteId);
    const enveloppe = enveloppes.find(e => e.id === ligne.enveloppeId);
    const isHierarchical = mode === 'hierarchical';
    
    return (
      <TableRow
        className={`hover:bg-accent/50 ${onViewDetails ? 'cursor-pointer' : ''} ${rowClassName}`.trim()}
        onDoubleClick={onViewDetails ? () => onViewDetails(ligne) : undefined}
      >
        <TableCell className={labelClassName}>
          <TooltipProvider delayDuration={500}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="font-medium text-sm text-foreground leading-tight line-clamp-2 cursor-help"
                  onClick={(e) => {
                    if (!onViewDetails) return;
                    e.preventDefault();
                    onViewDetails(ligne);
                  }}
                >
                  {ligne.libelle}
                </div>
              </TooltipTrigger>
              {ligne.libelle.length > 50 && (
                <TooltipContent side="top" className="max-w-sm">
                  <p className="text-sm">{ligne.libelle}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs font-normal px-1.5 py-0 cursor-help">
                    <Building2 className="h-3 w-3 mr-1" />
                    {compte?.numero || 'N/A'}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-sm font-medium">{compte?.numero}</p>
                  <p className="text-xs text-muted-foreground">{compte?.libelle}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {ligne.enveloppeId && enveloppe && (
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs font-normal px-1.5 py-0 cursor-help">
                      <Wallet className="h-3 w-3 mr-1" />
                      {enveloppe.code}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-sm font-medium">{enveloppe.code}</p>
                    <p className="text-xs text-muted-foreground">{enveloppe.nom}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </TableCell>
        
        {isHierarchical ? (
          <>
            <TableCell className="text-right font-medium">{formatMontant(ligne.montantModifie)}</TableCell>
            <TableCell className="text-right text-red-600 dark:text-red-400">{formatMontant(ligne.montantEngage)}</TableCell>
            <TableCell className="text-right font-bold text-primary">{formatMontant(ligne.disponible)}</TableCell>
          </>
        ) : (
          <>
            <TableCell className="text-right">{formatMontant(ligne.montantInitial)}</TableCell>
            <TableCell className="text-right font-medium">{formatMontant(ligne.montantModifie)}</TableCell>
            <TableCell className="text-right text-orange-600 dark:text-orange-400">{formatMontant(ligne.montantReserve || 0)}</TableCell>
            <TableCell className="text-right text-red-600 dark:text-red-400">{formatMontant(ligne.montantEngage)}</TableCell>
            <TableCell className="text-right text-blue-600 dark:text-blue-400">{formatMontant(ligne.montantLiquide)}</TableCell>
            <TableCell className="text-right text-green-600 dark:text-green-400">{formatMontant(ligne.montantPaye)}</TableCell>
            <TableCell className="text-right font-bold text-primary">{formatMontant(ligne.disponible)}</TableCell>
          </>
        )}
        <TableCell className="text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="text-sm font-medium">{tauxExecution}%</div>
            <div className={`${isHierarchical ? 'w-12' : 'w-16'} bg-muted rounded-full h-2`}>
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${Math.min(tauxExecution, 100)}%` }}
              />
            </div>
          </div>
        </TableCell>
        {!isHierarchical && (
          <>
            <TableCell>
              <BudgetStatusBadge status={ligne.statut} />
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(ligne)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Modifier
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onCreateModification(ligne)}>
                    <FileEdit className="mr-2 h-4 w-4" />
                    Créer modification budgétaire
                  </DropdownMenuItem>
                  {ligne.disponible > 0 && (
                    <DropdownMenuItem onClick={() => onReserver(ligne)}>
                      <BookmarkPlus className="mr-2 h-4 w-4" />
                      Réserver crédit
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(ligne.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </>
        )}
      </TableRow>
    );
  };

  const AggregateCells = ({
    aggregate,
    accentClassName,
    mode = 'compact',
  }: {
    aggregate: typeof EMPTY_AGGREGATE;
    accentClassName: string;
    mode?: 'compact' | 'hierarchical';
  }) => (
    <>
      {mode === 'hierarchical' ? (
        <>
          <TableCell className="text-right text-sm font-semibold">{formatMontant(aggregate.montantModifie)}</TableCell>
          <TableCell className="text-right text-sm text-red-600 dark:text-red-400">{formatMontant(aggregate.montantEngage)}</TableCell>
          <TableCell className={`text-right text-sm font-bold ${accentClassName}`}>{formatMontant(aggregate.disponible)}</TableCell>
        </>
      ) : (
        <>
          <TableCell className="text-right text-sm">{formatMontant(aggregate.montantInitial)}</TableCell>
          <TableCell className="text-right text-sm font-semibold">{formatMontant(aggregate.montantModifie)}</TableCell>
          <TableCell className="text-right text-sm text-orange-600 dark:text-orange-400">{formatMontant(aggregate.montantReserve)}</TableCell>
          <TableCell className="text-right text-sm text-red-600 dark:text-red-400">{formatMontant(aggregate.montantEngage)}</TableCell>
          <TableCell className="text-right text-sm text-blue-600 dark:text-blue-400">{formatMontant(aggregate.montantLiquide)}</TableCell>
          <TableCell className="text-right text-sm text-green-600 dark:text-green-400">{formatMontant(aggregate.montantPaye)}</TableCell>
          <TableCell className={`text-right text-sm font-bold ${accentClassName}`}>{formatMontant(aggregate.disponible)}</TableCell>
        </>
      )}
      <TableCell className="text-center">
        <div className="flex items-center justify-center gap-2">
          <div className="text-sm font-medium">{aggregate.tauxExecution}%</div>
          <div className="w-16 rounded-full bg-background/70 h-2">
            <div
              className="h-2 rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(aggregate.tauxExecution, 100)}%` }}
            />
          </div>
        </div>
      </TableCell>
      {mode === 'hierarchical' ? null : (
        <>
          <TableCell className="text-center">
            <Badge variant="outline" className="font-normal">
              {aggregate.count} {aggregate.count > 1 ? 'lignes' : 'ligne'}
            </Badge>
          </TableCell>
          <TableCell />
        </>
      )}
    </>
  );

  const renderCompactView = () => {
    return (
      <>
        {groupedLignesByAction.length === 0 ? (
          <TableRow>
            <TableCell colSpan={TOTAL_COLUMNS} className="text-center text-muted-foreground py-8">
              Aucune ligne budgétaire trouvée
            </TableCell>
          </TableRow>
        ) : (
          groupedLignesByAction.map((group) => (
            <Fragment key={group.action?.id || 'unknown'}>
              <GroupHeader 
                section={group.section}
                programme={group.programme}
                action={group.action}
              />
              
              {group.lignes.map(ligne => (
                <BudgetLineRow
                  key={ligne.id}
                  ligne={ligne}
                />
              ))}
            </Fragment>
          ))
        )}
      </>
    );
  };

  const renderHierarchicalView = () => {
    return sections.map((section) => {
      const isExpanded = expandedSections.has(section.id);
      const sectionProgrammes = programmes.filter(p => p.section_id === section.id);
      const sectionAggregate = aggregateBySectionId.get(section.id) ?? EMPTY_AGGREGATE;
      
      return (
        <Fragment key={section.id}>
          <TableRow className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-900 dark:hover:to-blue-800 border-l-4 border-l-blue-500">
            <TableCell>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center">
                  <Layers className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSection(section.id)}
                    className="p-0 h-auto hover:bg-transparent font-bold text-base"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 mr-2" />
                    ) : (
                      <ChevronRight className="h-5 w-5 mr-2" />
                    )}
                    {section.code} - {section.libelle}
                  </Button>
                </div>
                <Badge variant="secondary" className="hidden lg:inline-flex">
                  {sectionAggregate.count} {sectionAggregate.count > 1 ? 'lignes' : 'ligne'}
                </Badge>
              </div>
            </TableCell>
            <AggregateCells aggregate={sectionAggregate} accentClassName="text-blue-700 dark:text-blue-300" mode="hierarchical" />
          </TableRow>

          {isExpanded && sectionProgrammes.map((programme) => {
            const isProgrammeExpanded = expandedProgrammes.has(programme.id);
            const programmeActions = actions.filter(a => a.programme_id === programme.id);
            const programmeAggregate = aggregateByProgrammeId.get(programme.id) ?? EMPTY_AGGREGATE;
            
            return (
              <Fragment key={programme.id}>
                <TableRow className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 hover:from-purple-100 hover:to-purple-200 dark:hover:from-purple-900 dark:hover:to-purple-800 border-l-4 border-l-purple-400">
                  <TableCell className="pl-8">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center">
                        <GitBranch className="h-4 w-4 mr-2 text-purple-600 dark:text-purple-400" />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleProgramme(programme.id)}
                          className="p-0 h-auto hover:bg-transparent font-semibold"
                        >
                          {isProgrammeExpanded ? (
                            <ChevronDown className="h-4 w-4 mr-2" />
                          ) : (
                            <ChevronRight className="h-4 w-4 mr-2" />
                          )}
                          {programme.code} - {programme.libelle}
                        </Button>
                      </div>
                      <Badge variant="secondary" className="hidden lg:inline-flex">
                        {programmeAggregate.count} {programmeAggregate.count > 1 ? 'lignes' : 'ligne'}
                      </Badge>
                    </div>
                  </TableCell>
                  <AggregateCells aggregate={programmeAggregate} accentClassName="text-purple-700 dark:text-purple-300" mode="hierarchical" />
                </TableRow>

                {isProgrammeExpanded && programmeActions.map((action) => {
                  const actionLignes = lignesByActionId.get(action.id) ?? [];
                  const actionAggregate = aggregateByActionId.get(action.id) ?? EMPTY_AGGREGATE;
                  
                  return (
                    <Fragment key={action.id}>
                      <TableRow className="bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 hover:from-amber-100 hover:to-amber-200 dark:hover:from-amber-900 dark:hover:to-amber-800 border-l-4 border-l-amber-300">
                        <TableCell className="pl-16">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center font-medium">
                              <Zap className="h-4 w-4 mr-2 text-amber-600 dark:text-amber-400" />
                              {action.code} - {action.libelle}
                            </div>
                            <Badge variant="secondary" className="hidden lg:inline-flex">
                              {actionAggregate.count} {actionAggregate.count > 1 ? 'lignes' : 'ligne'}
                            </Badge>
                          </div>
                        </TableCell>
                        <AggregateCells aggregate={actionAggregate} accentClassName="text-amber-700 dark:text-amber-300" mode="hierarchical" />
                      </TableRow>

                      {actionLignes.map((ligne) => (
                        <BudgetLineRow
                          key={ligne.id}
                          ligne={ligne}
                          labelClassName="pl-24"
                          rowClassName="bg-white dark:bg-gray-950 border-l-2 border-l-gray-300 dark:border-l-gray-700"
                          mode="hierarchical"
                        />
                      ))}
                    </Fragment>
                  );
                })}
              </Fragment>
            );
          })}
        </Fragment>
      );
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-card p-3 shadow-sm">
        <Button
          variant={viewMode === 'hierarchical' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleViewModeChange('hierarchical')}
        >
          <Layers className="h-4 w-4 mr-2" />
          Vue hiérarchique
        </Button>
        <Button
          variant={viewMode === 'compact' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleViewModeChange('compact')}
        >
          <LayoutList className="h-4 w-4 mr-2" />
          Vue compacte
        </Button>
        <Button
          variant={viewMode === 'monitoring' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleViewModeChange('monitoring')}
        >
          <Activity className="h-4 w-4 mr-2" />
          Suivi d'exécution
        </Button>
      </div>

      {/* Conditional Rendering based on viewMode */}
      {viewMode === 'monitoring' ? (
        <div className="space-y-6">
          <p className="text-center text-muted-foreground py-8">Vue de suivi en développement</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="[&>div]:max-h-none [&>div]:overflow-visible">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/30 hover:bg-muted/30">
                  <TableHead className="sticky top-0 z-30 w-[350px] border-b border-border bg-card">Libellé</TableHead>
                  {viewMode === 'hierarchical' ? (
                    <>
                      <TableHead className="sticky top-0 z-30 border-b border-border bg-card text-right">Modifié</TableHead>
                      <TableHead className="sticky top-0 z-30 border-b border-border bg-card text-right">Engagé</TableHead>
                      <TableHead className="sticky top-0 z-30 border-b border-border bg-card text-right">Disponible</TableHead>
                      <TableHead className="sticky top-0 z-30 border-b border-border bg-card text-center">Taux</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead className="sticky top-0 z-30 border-b border-border bg-card text-right">Montant Initial</TableHead>
                      <TableHead className="sticky top-0 z-30 border-b border-border bg-card text-right">Modifié</TableHead>
                      <TableHead className="sticky top-0 z-30 border-b border-border bg-card text-right">Réservé</TableHead>
                      <TableHead className="sticky top-0 z-30 border-b border-border bg-card text-right">Engagé</TableHead>
                      <TableHead className="sticky top-0 z-30 border-b border-border bg-card text-right">Liquidé</TableHead>
                      <TableHead className="sticky top-0 z-30 border-b border-border bg-card text-right">Payé</TableHead>
                      <TableHead className="sticky top-0 z-30 border-b border-border bg-card text-right">Disponible</TableHead>
                      <TableHead className="sticky top-0 z-30 border-b border-border bg-card text-center">Taux Exec.</TableHead>
                      <TableHead className="bg-card text-center">Statut</TableHead>
                      <TableHead className="w-[100px] bg-card text-right">Actions</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewMode === 'hierarchical' ? renderHierarchicalView() : renderCompactView()}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
};
