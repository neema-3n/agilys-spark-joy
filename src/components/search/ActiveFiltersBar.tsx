import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BudgetFilters } from '@/hooks/useBudgetSearch';
import { Section, Programme, Action } from '@/types/budget.types';
import { Compte } from '@/types/compte.types';
import { Enveloppe } from '@/types/enveloppe.types';

interface ActiveFiltersBarProps {
  filters: BudgetFilters;
  onRemoveFilter: (key: keyof BudgetFilters) => void;
  onClearAll: () => void;
  resultCount: number;
  totalCount: number;
  sections: Section[];
  programmes: Programme[];
  actions: Action[];
  comptes: Compte[];
  enveloppes: Enveloppe[];
}

export const ActiveFiltersBar = ({
  filters,
  onRemoveFilter,
  onClearAll,
  resultCount,
  totalCount,
  sections,
  programmes,
  actions,
  comptes,
  enveloppes,
}: ActiveFiltersBarProps) => {
  const activeFilters: { key: keyof BudgetFilters; label: string }[] = [];

  if (filters.searchText) {
    activeFilters.push({ key: 'searchText', label: `Recherche: "${filters.searchText}"` });
  }

  if (filters.sectionId) {
    const section = sections.find(s => s.id === filters.sectionId);
    activeFilters.push({ key: 'sectionId', label: `Section: ${section?.code}` });
  }

  if (filters.programmeId) {
    const programme = programmes.find(p => p.id === filters.programmeId);
    activeFilters.push({ key: 'programmeId', label: `Programme: ${programme?.code}` });
  }

  if (filters.actionId) {
    const action = actions.find(a => a.id === filters.actionId);
    activeFilters.push({ key: 'actionId', label: `Action: ${action?.code}` });
  }

  if (filters.compteId) {
    const compte = comptes.find(c => c.id === filters.compteId);
    activeFilters.push({ key: 'compteId', label: `Compte: ${compte?.numero}` });
  }

  if (filters.enveloppeId) {
    const enveloppe = enveloppes.find(e => e.id === filters.enveloppeId);
    activeFilters.push({ key: 'enveloppeId', label: `Enveloppe: ${enveloppe?.code}` });
  }

  if (filters.montantModifieMin !== null || filters.montantModifieMax !== null) {
    const min = filters.montantModifieMin ? new Intl.NumberFormat('fr-FR').format(filters.montantModifieMin) : '∞';
    const max = filters.montantModifieMax ? new Intl.NumberFormat('fr-FR').format(filters.montantModifieMax) : '∞';
    activeFilters.push({ key: 'montantModifieMin', label: `Montant: ${min} - ${max}` });
  }

  if (filters.disponibleMin !== null || filters.disponibleMax !== null) {
    const min = filters.disponibleMin ? new Intl.NumberFormat('fr-FR').format(filters.disponibleMin) : '∞';
    const max = filters.disponibleMax ? new Intl.NumberFormat('fr-FR').format(filters.disponibleMax) : '∞';
    activeFilters.push({ key: 'disponibleMin', label: `Disponible: ${min} - ${max}` });
  }

  if (filters.tauxExecutionMin !== null || filters.tauxExecutionMax !== null) {
    const min = filters.tauxExecutionMin ?? '∞';
    const max = filters.tauxExecutionMax ?? '∞';
    activeFilters.push({ key: 'tauxExecutionMin', label: `Taux: ${min}% - ${max}%` });
  }

  if (filters.statut) {
    activeFilters.push({ key: 'statut', label: `Statut: ${filters.statut}` });
  }

  if (activeFilters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3">
      <span className="text-sm font-medium text-muted-foreground">
        {resultCount} résultat{resultCount > 1 ? 's' : ''} sur {totalCount} ligne{totalCount > 1 ? 's' : ''}
      </span>
      <div className="mx-2 h-4 w-px bg-border" />
      {activeFilters.map((filter) => (
        <Badge
          key={filter.key}
          variant="secondary"
          className="gap-1 pr-1 hover:bg-secondary/80"
        >
          {filter.label}
          <button
            type="button"
            onClick={() => onRemoveFilter(filter.key)}
            className="rounded-sm p-0.5 hover:bg-muted"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        className="ml-auto h-7 text-xs"
      >
        Tout effacer
      </Button>
    </div>
  );
};
