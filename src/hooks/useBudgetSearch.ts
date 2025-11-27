import { useState, useMemo, useCallback } from 'react';
import { LigneBudgetaire, Section, Programme, Action } from '@/types/budget.types';
import { Compte } from '@/types/compte.types';
import { Enveloppe } from '@/types/enveloppe.types';

export interface BudgetFilters {
  searchText: string;
  sectionId: string | null;
  programmeId: string | null;
  actionId: string | null;
  compteId: string | null;
  enveloppeId: string | null;
  montantModifieMin: number | null;
  montantModifieMax: number | null;
  disponibleMin: number | null;
  disponibleMax: number | null;
  tauxExecutionMin: number | null;
  tauxExecutionMax: number | null;
  statut: 'actif' | 'cloture' | null;
}

interface UseBudgetSearchProps {
  lignes: LigneBudgetaire[];
  sections: Section[];
  programmes: Programme[];
  actions: Action[];
  comptes: Compte[];
  enveloppes: Enveloppe[];
}

const initialFilters: BudgetFilters = {
  searchText: '',
  sectionId: null,
  programmeId: null,
  actionId: null,
  compteId: null,
  enveloppeId: null,
  montantModifieMin: null,
  montantModifieMax: null,
  disponibleMin: null,
  disponibleMax: null,
  tauxExecutionMin: null,
  tauxExecutionMax: null,
  statut: null,
};

export function useBudgetSearch({
  lignes,
  sections,
  programmes,
  actions,
  comptes,
  enveloppes,
}: UseBudgetSearchProps) {
  const [filters, setFilters] = useState<BudgetFilters>(initialFilters);

  const setFilter = useCallback((key: keyof BudgetFilters, value: any) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };
      
      // Réinitialiser les filtres en cascade
      if (key === 'sectionId') {
        newFilters.programmeId = null;
        newFilters.actionId = null;
      } else if (key === 'programmeId') {
        newFilters.actionId = null;
      }
      
      return newFilters;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

  const resetFilter = useCallback((key: keyof BudgetFilters) => {
    setFilters(prev => ({ ...prev, [key]: initialFilters[key] }));
  }, []);

  // Filtrer les programmes disponibles selon la section
  const availableProgrammes = useMemo(() => {
    if (!filters.sectionId) return programmes;
    return programmes.filter(p => p.section_id === filters.sectionId);
  }, [programmes, filters.sectionId]);

  // Filtrer les actions disponibles selon le programme
  const availableActions = useMemo(() => {
    if (!filters.programmeId) return actions;
    return actions.filter(a => a.programme_id === filters.programmeId);
  }, [actions, filters.programmeId]);

  // Appliquer les filtres
  const filteredLignes = useMemo(() => {
    return lignes.filter(ligne => {
      // Récupérer la hiérarchie de la ligne
      const action = actions.find(a => a.id === ligne.actionId);
      const programme = programmes.find(p => p.id === action?.programme_id);
      const section = sections.find(s => s.id === programme?.section_id);
      const compte = comptes.find(c => c.id === ligne.compteId);
      const enveloppe = enveloppes.find(e => e.id === ligne.enveloppeId);

      // Filtre texte
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        const matchText = (
          ligne.libelle.toLowerCase().includes(searchLower) ||
          section?.code.toLowerCase().includes(searchLower) ||
          section?.libelle.toLowerCase().includes(searchLower) ||
          programme?.code.toLowerCase().includes(searchLower) ||
          programme?.libelle.toLowerCase().includes(searchLower) ||
          action?.code.toLowerCase().includes(searchLower) ||
          action?.libelle.toLowerCase().includes(searchLower) ||
          compte?.numero.toLowerCase().includes(searchLower) ||
          compte?.libelle.toLowerCase().includes(searchLower) ||
          enveloppe?.code.toLowerCase().includes(searchLower)
        );
        if (!matchText) return false;
      }

      // Filtres hiérarchiques
      if (filters.sectionId && section?.id !== filters.sectionId) return false;
      if (filters.programmeId && programme?.id !== filters.programmeId) return false;
      if (filters.actionId && action?.id !== filters.actionId) return false;

      // Filtres comptables
      if (filters.compteId && ligne.compteId !== filters.compteId) return false;
      if (filters.enveloppeId && ligne.enveloppeId !== filters.enveloppeId) return false;

      // Filtres montants
      if (filters.montantModifieMin !== null && ligne.montantModifie < filters.montantModifieMin) return false;
      if (filters.montantModifieMax !== null && ligne.montantModifie > filters.montantModifieMax) return false;
      if (filters.disponibleMin !== null && ligne.disponible < filters.disponibleMin) return false;
      if (filters.disponibleMax !== null && ligne.disponible > filters.disponibleMax) return false;

      // Filtre taux d'exécution
      if (filters.tauxExecutionMin !== null || filters.tauxExecutionMax !== null) {
        const tauxExecution = ligne.montantModifie === 0 
          ? 0 
          : Math.round((ligne.montantEngage / ligne.montantModifie) * 100);
        if (filters.tauxExecutionMin !== null && tauxExecution < filters.tauxExecutionMin) return false;
        if (filters.tauxExecutionMax !== null && tauxExecution > filters.tauxExecutionMax) return false;
      }

      // Filtre statut
      if (filters.statut && ligne.statut !== filters.statut) return false;

      return true;
    });
  }, [lignes, filters, sections, programmes, actions, comptes, enveloppes]);

  // Calculer les totaux
  const totals = useMemo(() => {
    return filteredLignes.reduce(
      (acc, ligne) => ({
        montantInitial: acc.montantInitial + ligne.montantInitial,
        montantModifie: acc.montantModifie + ligne.montantModifie,
        montantReserve: acc.montantReserve + (ligne.montantReserve || 0),
        montantEngage: acc.montantEngage + ligne.montantEngage,
        montantPaye: acc.montantPaye + ligne.montantPaye,
        disponible: acc.disponible + ligne.disponible,
      }),
      { 
        montantInitial: 0, 
        montantModifie: 0, 
        montantReserve: 0, 
        montantEngage: 0, 
        montantPaye: 0, 
        disponible: 0 
      }
    );
  }, [filteredLignes]);

  // Compter les filtres actifs
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.searchText) count++;
    if (filters.sectionId) count++;
    if (filters.programmeId) count++;
    if (filters.actionId) count++;
    if (filters.compteId) count++;
    if (filters.enveloppeId) count++;
    if (filters.montantModifieMin !== null || filters.montantModifieMax !== null) count++;
    if (filters.disponibleMin !== null || filters.disponibleMax !== null) count++;
    if (filters.tauxExecutionMin !== null || filters.tauxExecutionMax !== null) count++;
    if (filters.statut) count++;
    return count;
  }, [filters]);

  return {
    filters,
    setFilter,
    resetFilters,
    resetFilter,
    activeFiltersCount,
    filteredLignes,
    totals,
    availableProgrammes,
    availableActions,
  };
}
