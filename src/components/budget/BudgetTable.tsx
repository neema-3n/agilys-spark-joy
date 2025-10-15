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
import { ChevronDown, ChevronRight, Edit, Trash2 } from 'lucide-react';

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
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[350px]">Libellé</TableHead>
            <TableHead className="text-right">Montant Initial</TableHead>
            <TableHead className="text-right">Montant Modifié</TableHead>
            <TableHead className="text-right">Engagé</TableHead>
            <TableHead className="text-right">Payé</TableHead>
            <TableHead className="text-right">Disponible</TableHead>
            <TableHead className="text-center">Taux Exec.</TableHead>
            <TableHead className="text-right w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sections.map((section) => {
            const isExpanded = expandedSections.has(section.id);
            const sectionProgrammes = programmes.filter(p => p.sectionId === section.id);
            
            return (
              <React.Fragment key={section.id}>
                <TableRow className="bg-muted/50 hover:bg-muted font-semibold">
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSection(section.id)}
                      className="p-0 h-auto hover:bg-transparent"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 mr-2" />
                      ) : (
                        <ChevronRight className="h-4 w-4 mr-2" />
                      )}
                      {section.code} - {section.libelle}
                    </Button>
                  </TableCell>
                  <TableCell colSpan={7} />
                </TableRow>

                {isExpanded && sectionProgrammes.map((programme) => {
                  const isProgrammeExpanded = expandedProgrammes.has(programme.id);
                  const programmeActions = actions.filter(a => a.programmeId === programme.id);
                  
                  return (
                    <React.Fragment key={programme.id}>
                      <TableRow className="bg-muted/30 hover:bg-muted/40 font-medium">
                        <TableCell className="pl-8">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleProgramme(programme.id)}
                            className="p-0 h-auto hover:bg-transparent"
                          >
                            {isProgrammeExpanded ? (
                              <ChevronDown className="h-4 w-4 mr-2" />
                            ) : (
                              <ChevronRight className="h-4 w-4 mr-2" />
                            )}
                            {programme.code} - {programme.libelle}
                          </Button>
                        </TableCell>
                        <TableCell colSpan={7} />
                      </TableRow>

                      {isProgrammeExpanded && programmeActions.map((action) => {
                        const actionLignes = lignes.filter(l => l.actionId === action.id);
                        
                        return (
                          <React.Fragment key={action.id}>
                            <TableRow className="bg-muted/10 hover:bg-muted/20 text-sm">
                              <TableCell className="pl-16 font-medium">
                                {action.code} - {action.libelle}
                              </TableCell>
                              <TableCell colSpan={7} />
                            </TableRow>

                            {actionLignes.map((ligne) => {
                              const tauxExecution = getTauxExecution(ligne);
                              
                              return (
                                <TableRow key={ligne.id} className="hover:bg-accent">
                                  <TableCell className="pl-24 text-sm">
                                    {ligne.libelle}
                                    <div className="text-xs text-muted-foreground">
                                      Compte: {ligne.compteId}
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
                                      variant={
                                        tauxExecution >= 80
                                          ? 'destructive'
                                          : tauxExecution >= 50
                                          ? 'warning'
                                          : 'success'
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
