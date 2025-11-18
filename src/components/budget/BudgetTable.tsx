import { useState } from 'react';
import { LigneBudgetaire, Section, Programme, Action } from '@/types/budget.types';
import { Compte } from '@/types/compte.types';
import { Enveloppe } from '@/types/enveloppe.types';
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
import { ChevronDown, ChevronRight, Edit, Trash2, Layers, GitBranch, Zap, MoreHorizontal, BookmarkPlus, LayoutList, Building2, Wallet } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
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

const getInitialViewMode = (clientId: string, exerciceId: string): 'hierarchical' | 'compact' => {
  const key = getViewModeKey(clientId, exerciceId);
  const stored = localStorage.getItem(key);
  return (stored === 'compact' ? 'compact' : 'hierarchical') as 'hierarchical' | 'compact';
};

const saveViewMode = (clientId: string, exerciceId: string, mode: 'hierarchical' | 'compact') => {
  const key = getViewModeKey(clientId, exerciceId);
  localStorage.setItem(key, mode);
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
}: BudgetTableProps) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => getInitialExpandedState(clientId, exerciceId, 'sections', sections)
  );
  const [expandedProgrammes, setExpandedProgrammes] = useState<Set<string>>(
    () => getInitialExpandedState(clientId, exerciceId, 'programmes', programmes)
  );
  const [viewMode, setViewMode] = useState<'hierarchical' | 'compact'>(
    () => getInitialViewMode(clientId, exerciceId)
  );
  const [searchFilter, setSearchFilter] = useState('');

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(montant);
  };

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

  const getCompteDisplay = (compteId: string) => {
    const compte = comptes.find(c => c.id === compteId);
    if (!compte) return compteId;
    return `${compte.numero} - ${compte.libelle}`;
  };

  const getEnveloppeDisplay = (enveloppeId?: string) => {
    if (!enveloppeId) return null;
    const enveloppe = enveloppes.find(e => e.id === enveloppeId);
    if (!enveloppe) return null;
    return `${enveloppe.code} - ${enveloppe.nom}`;
  };

  const handleViewModeChange = (mode: 'hierarchical' | 'compact') => {
    setViewMode(mode);
    saveViewMode(clientId, exerciceId, mode);
  };

  const renderCompactView = () => {
    const allLignesWithHierarchy = lignes.map(ligne => {
      const action = actions.find(a => a.id === ligne.actionId);
      const programme = action ? programmes.find(p => p.id === action.programme_id) : null;
      const section = programme ? sections.find(s => s.id === programme.section_id) : null;
      
      return {
        ligne,
        section,
        programme,
        action
      };
    });

    const filteredLignes = searchFilter
      ? allLignesWithHierarchy.filter(item => {
          const searchLower = searchFilter.toLowerCase();
          return (
            item.ligne.libelle.toLowerCase().includes(searchLower) ||
            item.section?.code.toLowerCase().includes(searchLower) ||
            item.section?.libelle.toLowerCase().includes(searchLower) ||
            item.programme?.code.toLowerCase().includes(searchLower) ||
            item.programme?.libelle.toLowerCase().includes(searchLower) ||
            item.action?.code.toLowerCase().includes(searchLower) ||
            item.action?.libelle.toLowerCase().includes(searchLower)
          );
        })
      : allLignesWithHierarchy;

    return filteredLignes.map(({ ligne, section, programme, action }) => {
      const tauxExecution = getTauxExecution(ligne);
      const compte = getCompteDisplay(ligne.compteId);
      const enveloppe = getEnveloppeDisplay(ligne.enveloppeId);
      
      return (
        <TableRow key={ligne.id} className="hover:bg-accent/50">
          <TableCell className="min-w-[300px] max-w-[500px]">
            <div className="flex items-start gap-2">
              {/* Badges hiérarchiques compacts avec tooltips */}
              <TooltipProvider delayDuration={300}>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge 
                        variant="secondary" 
                        className="bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900/70 text-xs px-1.5 py-0 cursor-help transition-colors"
                      >
                        {section?.code || 'N/A'}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-sm">
                      <p className="text-sm font-medium">{section?.code}</p>
                      <p className="text-xs text-muted-foreground">{section?.libelle}</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <ChevronRight className="h-3 w-3 text-gray-300 dark:text-gray-600" />
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge 
                        variant="secondary" 
                        className="bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:hover:bg-purple-900/70 text-xs px-1.5 py-0 cursor-help transition-colors"
                      >
                        {programme?.code || 'N/A'}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-sm">
                      <p className="text-sm font-medium">{programme?.code}</p>
                      <p className="text-xs text-muted-foreground">{programme?.libelle}</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <ChevronRight className="h-3 w-3 text-gray-300 dark:text-gray-600" />
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge 
                        variant="secondary" 
                        className="bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:hover:bg-amber-900/70 text-xs px-1.5 py-0 cursor-help transition-colors"
                      >
                        {action?.code || 'N/A'}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-sm">
                      <p className="text-sm font-medium">{action?.code}</p>
                      <p className="text-xs text-muted-foreground">{action?.libelle}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
              
              {/* Libellé de la ligne avec tooltip si texte long */}
              <div className="flex-1 min-w-0">
                <TooltipProvider delayDuration={500}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="font-medium text-sm text-foreground leading-tight line-clamp-2 cursor-help">
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
              </div>
            </div>
            
            {/* Informations secondaires avec badges et icônes */}
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs font-normal px-1.5 py-0.5 cursor-help">
                      <Building2 className="h-3 w-3 mr-1" />
                      <span className="max-w-[150px] truncate">{compte}</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-sm">
                    <p className="text-xs">Compte: {compte}</p>
                  </TooltipContent>
                </Tooltip>
                
                {ligne.enveloppeId && enveloppe && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="text-xs font-normal px-1.5 py-0.5 cursor-help">
                        <Wallet className="h-3 w-3 mr-1" />
                        <span className="max-w-[150px] truncate">{enveloppe}</span>
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-sm">
                      <p className="text-xs">Enveloppe: {enveloppe}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </TooltipProvider>
            </div>
          </TableCell>
          <TableCell className="text-right text-sm">
            {formatMontant(ligne.montantInitial)}
          </TableCell>
          <TableCell className="text-right text-sm font-medium">
            {formatMontant(ligne.montantModifie)}
          </TableCell>
          <TableCell className="text-right text-sm text-purple-600 dark:text-purple-400">
            {formatMontant(ligne.montantReserve || 0)}
          </TableCell>
          <TableCell className="text-right text-sm text-orange-600 dark:text-orange-400">
            {formatMontant(ligne.montantEngage)}
          </TableCell>
          <TableCell className="text-right text-sm">
            {formatMontant(ligne.montantPaye)}
          </TableCell>
          <TableCell className="text-right text-sm font-medium">
            {formatMontant(ligne.disponible)}
          </TableCell>
          <TableCell className="text-center">
            <Badge
              className="font-semibold"
              variant={
                tauxExecution >= 80
                  ? 'destructive'
                  : tauxExecution >= 50
                  ? 'default'
                  : 'outline'
              }
            >
              {tauxExecution}%
            </Badge>
          </TableCell>
          <TableCell>
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(ligne)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Modifier
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
            </div>
          </TableCell>
        </TableRow>
      );
    });
  };

  const renderHierarchicalView = () => {
    return sections.map((section) => {
      const isExpanded = expandedSections.has(section.id);
      const sectionProgrammes = programmes.filter(p => p.section_id === section.id);
      
      return (
        <React.Fragment key={section.id}>
          <TableRow className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-900 dark:hover:to-blue-800 border-l-4 border-l-blue-500">
            <TableCell>
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
            </TableCell>
            <TableCell colSpan={8} />
          </TableRow>

          {isExpanded && sectionProgrammes.map((programme) => {
            const isProgrammeExpanded = expandedProgrammes.has(programme.id);
            const programmeActions = actions.filter(a => a.programme_id === programme.id);
            
            return (
              <React.Fragment key={programme.id}>
                <TableRow className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 hover:from-purple-100 hover:to-purple-200 dark:hover:from-purple-900 dark:hover:to-purple-800 border-l-4 border-l-purple-400">
                  <TableCell className="pl-8">
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
                  </TableCell>
                  <TableCell colSpan={8} />
                </TableRow>

                {isProgrammeExpanded && programmeActions.map((action) => {
                  const actionLignes = lignes.filter(l => l.actionId === action.id);
                  
                  return (
                    <React.Fragment key={action.id}>
                      <TableRow className="bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 hover:from-amber-100 hover:to-amber-200 dark:hover:from-amber-900 dark:hover:to-amber-800 border-l-4 border-l-amber-300">
                        <TableCell className="pl-16">
                          <div className="flex items-center font-medium">
                            <Zap className="h-4 w-4 mr-2 text-amber-600 dark:text-amber-400" />
                            {action.code} - {action.libelle}
                          </div>
                      </TableCell>
                      <TableCell colSpan={8} />
                      </TableRow>

                      {actionLignes.map((ligne) => {
                        const tauxExecution = getTauxExecution(ligne);
                        
                        return (
                          <TableRow key={ligne.id} className="hover:bg-accent/50 bg-white dark:bg-gray-950 border-l-2 border-l-gray-300 dark:border-l-gray-700">
                             <TableCell className="pl-24 text-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                <div>
                                  {ligne.libelle}
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    Compte: {getCompteDisplay(ligne.compteId)}
                                  </div>
                                  {ligne.enveloppeId && (
                                    <div className="text-xs text-primary/80 mt-0.5">
                                      Enveloppe: {getEnveloppeDisplay(ligne.enveloppeId)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {formatMontant(ligne.montantInitial)}
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium">
                              {formatMontant(ligne.montantModifie)}
                            </TableCell>
                            <TableCell className="text-right text-sm text-purple-600 dark:text-purple-400">
                              {formatMontant(ligne.montantReserve || 0)}
                            </TableCell>
                            <TableCell className="text-right text-sm text-orange-600 dark:text-orange-400">
                              {formatMontant(ligne.montantEngage)}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {formatMontant(ligne.montantPaye)}
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium">
                              {formatMontant(ligne.disponible)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                className="font-semibold"
                                variant={
                                  tauxExecution >= 80
                                    ? 'destructive'
                                    : tauxExecution >= 50
                                    ? 'default'
                                    : 'outline'
                                }
                              >
                                {tauxExecution}%
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => onEdit(ligne)}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Modifier
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
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            );
          })}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="space-y-4">
      {/* Toggle and Search Bar */}
      <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg border">
        <div className="flex gap-2">
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
        </div>
        {viewMode === 'compact' && (
          <Input
            placeholder="Rechercher une ligne..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="max-w-xs"
          />
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border max-h-[600px] overflow-auto">
        <div className="[&>div]:max-h-none [&>div]:overflow-visible">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/15">
                <TableHead className="w-[350px] font-semibold">Libellé</TableHead>
                <TableHead className="text-right font-semibold">Montant Initial</TableHead>
                <TableHead className="text-right font-semibold">Modifié</TableHead>
                <TableHead className="text-right font-semibold">Réservé</TableHead>
                <TableHead className="text-right font-semibold">Engagé</TableHead>
                <TableHead className="text-right font-semibold">Payé</TableHead>
                <TableHead className="text-right font-semibold">Disponible</TableHead>
                <TableHead className="text-center font-semibold">Taux Exec.</TableHead>
                <TableHead className="text-right w-[100px] font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {viewMode === 'hierarchical' ? renderHierarchicalView() : renderCompactView()}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

const React = { Fragment: ({ children }: { children: React.ReactNode }) => <>{children}</> };
