import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { getPaiementsValidesMultipleDepenses } from '@/services/api/depenses.service';
import { formatCurrency } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { Depense } from '@/types/depense.types';

interface PaiementValide {
  id: string;
  numero: string;
  montant: number;
  datePaiement: string;
  modePaiement: string;
  depenseId: string;
  depenses: {
    numero: string;
    objet: string;
  };
}

interface DepensePaiements {
  depense: Depense;
  paiements: PaiementValide[];
  totalPaiements: number;
}

interface AnnulerMultipleDepensesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  depenses: Depense[];
  onConfirm: (motif: string) => Promise<void>;
  isSubmitting: boolean;
}

export const AnnulerMultipleDepensesDialog = ({
  open,
  onOpenChange,
  depenses,
  onConfirm,
  isSubmitting,
}: AnnulerMultipleDepensesDialogProps) => {
  const [motif, setMotif] = useState('');
  const [depensesPaiements, setDepensesPaiements] = useState<DepensePaiements[]>([]);
  const [isLoadingPaiements, setIsLoadingPaiements] = useState(false);
  const [errorLoadingPaiements, setErrorLoadingPaiements] = useState<string | null>(null);
  const [expandedDepenses, setExpandedDepenses] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open && depenses.length > 0) {
      setIsLoadingPaiements(true);
      setErrorLoadingPaiements(null);
      
      const depenseIds = depenses.map(d => d.id);
      
      getPaiementsValidesMultipleDepenses(depenseIds)
        .then((paiements) => {
          // Grouper les paiements par dépense
          const groupedData: DepensePaiements[] = depenses.map(depense => {
            const depensePaiements = paiements.filter(p => p.depenseId === depense.id);
            const totalPaiements = depensePaiements.reduce((sum, p) => sum + p.montant, 0);
            
            return {
              depense,
              paiements: depensePaiements,
              totalPaiements,
            };
          });
          
          setDepensesPaiements(groupedData);
          
          // Auto-expand dépenses avec paiements
          const withPaiements = new Set(
            groupedData.filter(d => d.paiements.length > 0).map(d => d.depense.id)
          );
          setExpandedDepenses(withPaiements);
        })
        .catch((error) => {
          console.error('Erreur lors du chargement des paiements:', error);
          setErrorLoadingPaiements('Impossible de charger les paiements');
        })
        .finally(() => {
          setIsLoadingPaiements(false);
        });
    } else {
      setDepensesPaiements([]);
      setMotif('');
      setErrorLoadingPaiements(null);
      setExpandedDepenses(new Set());
    }
  }, [open, depenses]);

  const handleConfirm = async () => {
    if (motif.trim().length < 3) return;
    await onConfirm(motif);
    setMotif('');
  };

  const toggleExpanded = (depenseId: string) => {
    setExpandedDepenses(prev => {
      const next = new Set(prev);
      if (next.has(depenseId)) {
        next.delete(depenseId);
      } else {
        next.add(depenseId);
      }
      return next;
    });
  };

  const totalDepenses = depenses.length;
  const depensesAvecPaiements = depensesPaiements.filter(d => d.paiements.length > 0);
  const totalPaiementsCount = depensesPaiements.reduce((sum, d) => sum + d.paiements.length, 0);
  const totalMontantPaiements = depensesPaiements.reduce((sum, d) => sum + d.totalPaiements, 0);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {depensesAvecPaiements.length > 0 && <AlertCircle className="h-5 w-5 text-destructive" />}
            Annuler {totalDepenses} dépense{totalDepenses > 1 ? 's' : ''}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isLoadingPaiements ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Vérification des paiements associés...
              </span>
            ) : errorLoadingPaiements ? (
              <span className="text-destructive">{errorLoadingPaiements}</span>
            ) : depensesAvecPaiements.length > 0 ? (
              <>
                <strong className="text-foreground">Attention :</strong> {depensesAvecPaiements.length} dépense
                {depensesAvecPaiements.length > 1 ? 's ont' : ' a'}{' '}
                <strong className="text-foreground">{totalPaiementsCount} paiement(s) valide(s)</strong> pour un
                montant total de <strong className="text-foreground">{formatCurrency(totalMontantPaiements)}</strong>.
                <br />
                <br />
                En confirmant l'annulation, tous ces paiements seront <strong>automatiquement annulés</strong>.
              </>
            ) : (
              `Vous êtes sur le point d'annuler ${totalDepenses} dépense${totalDepenses > 1 ? 's' : ''}. Indiquez le motif d'annulation pour tracer cette action.`
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {depensesAvecPaiements.length > 0 && !isLoadingPaiements && (
          <div className="flex-1 overflow-y-auto border rounded-lg p-4 space-y-3 bg-muted/30 max-h-[300px]">
            <div className="text-sm font-medium mb-2 sticky top-0 bg-muted/30 pb-2">
              Détail des dépenses et paiements associés :
            </div>
            {depensesPaiements.map(({ depense, paiements, totalPaiements }) => {
              const hasPaiements = paiements.length > 0;
              const isExpanded = expandedDepenses.has(depense.id);
              
              return (
                <div key={depense.id} className="bg-background rounded border">
                  <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(depense.id)}>
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3 flex-1 text-left">
                          {hasPaiements && (
                            isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            )
                          )}
                          <div className="flex flex-col gap-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono">
                                {depense.numero}
                              </Badge>
                              {hasPaiements && (
                                <Badge variant="destructive" className="text-xs">
                                  {paiements.length} paiement{paiements.length > 1 ? 's' : ''}
                                </Badge>
                              )}
                            </div>
                            <span className="text-sm text-muted-foreground truncate">{depense.objet}</span>
                          </div>
                        </div>
                        {hasPaiements && (
                          <div className="text-right ml-4">
                            <div className="font-medium tabular-nums">{formatCurrency(totalPaiements)}</div>
                            <div className="text-xs text-muted-foreground">à annuler</div>
                          </div>
                        )}
                      </div>
                    </CollapsibleTrigger>
                    
                    {hasPaiements && (
                      <CollapsibleContent>
                        <div className="border-t px-3 pb-3 pt-2 space-y-2 bg-muted/20">
                          {paiements.map((paiement) => (
                            <div
                              key={paiement.id}
                              className="flex items-center justify-between p-2 bg-background rounded text-sm"
                            >
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="font-mono text-xs">
                                  {paiement.numero}
                                </Badge>
                                <span className="text-muted-foreground">
                                  {new Date(paiement.datePaiement).toLocaleDateString('fr-FR')}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {paiement.modePaiement}
                                </Badge>
                              </div>
                              <span className="font-medium tabular-nums">{formatCurrency(paiement.montant)}</span>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    )}
                  </Collapsible>
                </div>
              );
            })}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="motif" className="text-sm font-medium">
            Motif d'annulation <span className="text-destructive">*</span>
          </Label>
          <Input
            id="motif"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Motif d'annulation (minimum 3 caractères)"
            disabled={isSubmitting || isLoadingPaiements}
            className="w-full"
          />
          {motif.trim().length > 0 && motif.trim().length < 3 && (
            <p className="text-xs text-muted-foreground">Minimum 3 caractères requis</p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isSubmitting || isLoadingPaiements || motif.trim().length < 3}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Annulation en cours...
              </>
            ) : (
              `Confirmer l'annulation de ${totalDepenses} dépense${totalDepenses > 1 ? 's' : ''}`
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
