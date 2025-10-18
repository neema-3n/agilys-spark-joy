import { useState } from 'react';
import { LigneBudgetaire, Section, Programme, Action } from '@/types/budget.types';
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
import { ChevronDown, ChevronRight, Edit, Trash2, Layers, GitBranch, Zap } from 'lucide-react';

interface BudgetTableProps {
  sections: Section[];
  programmes: Programme[];
  actions: Action[];
  lignes: LigneBudgetaire[];
  onEdit: (ligne: LigneBudgetaire) => void;
  onDelete: (id: string) => void;
}

export const BudgetTable = ({
  sections,
  programmes,
  actions,
  lignes,
  onEdit,
  onDelete,
}: BudgetTableProps) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['sec-1']));
  const [expandedProgrammes, setExpandedProgrammes] = useState<Set<string>>(new Set(['prog-1']));

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
  };

  const toggleProgramme = (programmeId: string) => {
    const newExpanded = new Set(expandedProgrammes);
    if (newExpanded.has(programmeId)) {
      newExpanded.delete(programmeId);
    } else {
      newExpanded.add(programmeId);
    }
    setExpandedProgrammes(newExpanded);
  };

  const getTauxExecution = (ligne: LigneBudgetaire) => {
    if (ligne.montantModifie === 0) return 0;
    return Math.round((ligne.montantEngage / ligne.montantModifie) * 100);
  };

  return (
    <div className="border rounded-lg overflow-hidden shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-gradient-to-r from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/15">
            <TableHead className="w-[350px] font-semibold">Libellé</TableHead>
            <TableHead className="text-right font-semibold">Montant Initial</TableHead>
            <TableHead className="text-right font-semibold">Montant Modifié</TableHead>
            <TableHead className="text-right font-semibold">Engagé</TableHead>
            <TableHead className="text-right font-semibold">Payé</TableHead>
            <TableHead className="text-right font-semibold">Disponible</TableHead>
            <TableHead className="text-center font-semibold">Taux Exec.</TableHead>
            <TableHead className="text-right w-[100px] font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sections.map((section) => {
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
                  <TableCell colSpan={7} />
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
                        <TableCell colSpan={7} />
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
                              <TableCell colSpan={7} />
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
                                          Compte: {ligne.compteId}
                                        </div>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right text-sm">
                                    {formatMontant(ligne.montantInitial)}
                                  </TableCell>
                                  <TableCell className="text-right text-sm font-medium">
                                    {formatMontant(ligne.montantModifie)}
                                  </TableCell>
                                  <TableCell className="text-right text-sm">
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
                                    <div className="flex gap-1 justify-end">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onEdit(ligne)}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onDelete(ligne.id)}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
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
          })}
        </TableBody>
      </Table>
    </div>
  );
};

const React = { Fragment: ({ children }: { children: React.ReactNode }) => <>{children}</> };
