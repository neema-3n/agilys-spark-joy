import { Search, ChevronDown, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Section, Programme, Action } from '@/types/budget.types';
import { Compte } from '@/types/compte.types';
import { Enveloppe } from '@/types/enveloppe.types';
import { BudgetFilters } from '@/hooks/useBudgetSearch';
import { useState } from 'react';

interface BudgetSearchPanelProps {
  filters: BudgetFilters;
  onFilterChange: (key: keyof BudgetFilters, value: any) => void;
  onResetFilters: () => void;
  activeFiltersCount: number;
  sections: Section[];
  programmes: Programme[];
  actions: Action[];
  comptes: Compte[];
  enveloppes: Enveloppe[];
}

export const BudgetSearchPanel = ({
  filters,
  onFilterChange,
  onResetFilters,
  activeFiltersCount,
  sections,
  programmes,
  actions,
  comptes,
  enveloppes,
}: BudgetSearchPanelProps) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  return (
    <div className="space-y-3">
      {/* Barre de recherche principale */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.searchText}
            onChange={(e) => onFilterChange('searchText', e.target.value)}
            placeholder="Rechercher par libellé, code, compte..."
            className="pl-10 pr-10"
          />
          {filters.searchText && (
            <button
              type="button"
              onClick={() => onFilterChange('searchText', '')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="gap-2">
              Filtres avancés
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
              <ChevronDown className={`h-4 w-4 transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
        </Collapsible>
      </div>

      {/* Panneau de filtres avancés */}
      <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
        <CollapsibleContent className="space-y-4 rounded-lg border bg-muted/30 p-4">
          {/* Structure budgétaire */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Section</label>
              <Select
                value={filters.sectionId || 'all'}
                onValueChange={(value) => onFilterChange('sectionId', value === 'all' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Toutes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les sections</SelectItem>
                  {sections.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.code} - {section.libelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Programme</label>
              <Select
                value={filters.programmeId || 'all'}
                onValueChange={(value) => onFilterChange('programmeId', value === 'all' ? null : value)}
                disabled={!filters.sectionId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les programmes</SelectItem>
                  {programmes
                    .filter(p => !filters.sectionId || p.section_id === filters.sectionId)
                    .map((programme) => (
                      <SelectItem key={programme.id} value={programme.id}>
                        {programme.code} - {programme.libelle}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Action</label>
              <Select
                value={filters.actionId || 'all'}
                onValueChange={(value) => onFilterChange('actionId', value === 'all' ? null : value)}
                disabled={!filters.programmeId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Toutes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les actions</SelectItem>
                  {actions
                    .filter(a => !filters.programmeId || a.programme_id === filters.programmeId)
                    .map((action) => (
                      <SelectItem key={action.id} value={action.id}>
                        {action.code} - {action.libelle}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filtres comptables et financiers */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Compte</label>
              <Select
                value={filters.compteId || 'all'}
                onValueChange={(value) => onFilterChange('compteId', value === 'all' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les comptes</SelectItem>
                  {comptes.map((compte) => (
                    <SelectItem key={compte.id} value={compte.id}>
                      {compte.numero} - {compte.libelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Enveloppe</label>
              <Select
                value={filters.enveloppeId || 'all'}
                onValueChange={(value) => onFilterChange('enveloppeId', value === 'all' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Toutes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les enveloppes</SelectItem>
                  {enveloppes.map((enveloppe) => (
                    <SelectItem key={enveloppe.id} value={enveloppe.id}>
                      {enveloppe.code} - {enveloppe.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Statut</label>
              <Select
                value={filters.statut || 'all'}
                onValueChange={(value) => onFilterChange('statut', value === 'all' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="actif">Actif</SelectItem>
                  <SelectItem value="cloture">Clôturé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Taux exécution (%)</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.tauxExecutionMin ?? ''}
                  onChange={(e) => onFilterChange('tauxExecutionMin', e.target.value ? Number(e.target.value) : null)}
                  min={0}
                  max={100}
                  className="w-20"
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.tauxExecutionMax ?? ''}
                  onChange={(e) => onFilterChange('tauxExecutionMax', e.target.value ? Number(e.target.value) : null)}
                  min={0}
                  max={100}
                  className="w-20"
                />
              </div>
            </div>
          </div>

          {/* Filtres montants */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Montant modifié</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.montantModifieMin ?? ''}
                  onChange={(e) => onFilterChange('montantModifieMin', e.target.value ? Number(e.target.value) : null)}
                  min={0}
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.montantModifieMax ?? ''}
                  onChange={(e) => onFilterChange('montantModifieMax', e.target.value ? Number(e.target.value) : null)}
                  min={0}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Disponible</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.disponibleMin ?? ''}
                  onChange={(e) => onFilterChange('disponibleMin', e.target.value ? Number(e.target.value) : null)}
                  min={0}
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.disponibleMax ?? ''}
                  onChange={(e) => onFilterChange('disponibleMax', e.target.value ? Number(e.target.value) : null)}
                  min={0}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetFilters}
              disabled={activeFiltersCount === 0}
            >
              Réinitialiser tous les filtres
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
