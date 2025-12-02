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
import { Loader2, AlertCircle } from 'lucide-react';
import { getPaiementsValidesDepense } from '@/services/api/depenses.service';
import { formatCurrency } from '@/lib/utils';

interface PaiementValide {
  id: string;
  numero: string;
  montant: number;
  datePaiement: string;
  modePaiement: string;
}

interface AnnulerDepenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  depenseId: string | null;
  depenseNumero?: string;
  onConfirm: (motif: string) => Promise<void>;
  isSubmitting: boolean;
}

export const AnnulerDepenseDialog = ({
  open,
  onOpenChange,
  depenseId,
  depenseNumero,
  onConfirm,
  isSubmitting,
}: AnnulerDepenseDialogProps) => {
  const [motif, setMotif] = useState('');
  const [paiementsValides, setPaiementsValides] = useState<PaiementValide[]>([]);
  const [isLoadingPaiements, setIsLoadingPaiements] = useState(false);
  const [errorLoadingPaiements, setErrorLoadingPaiements] = useState<string | null>(null);

  useEffect(() => {
    if (open && depenseId) {
      setIsLoadingPaiements(true);
      setErrorLoadingPaiements(null);
      
      getPaiementsValidesDepense(depenseId)
        .then((paiements) => {
          setPaiementsValides(paiements);
        })
        .catch((error) => {
          console.error('Erreur lors du chargement des paiements:', error);
          setErrorLoadingPaiements('Impossible de charger les paiements');
        })
        .finally(() => {
          setIsLoadingPaiements(false);
        });
    } else {
      setPaiementsValides([]);
      setMotif('');
      setErrorLoadingPaiements(null);
    }
  }, [open, depenseId]);

  const handleConfirm = async () => {
    if (motif.trim().length < 3) return;
    await onConfirm(motif);
    setMotif('');
  };

  const hasPaiements = paiementsValides.length > 0;
  const totalPaiements = paiementsValides.reduce((sum, p) => sum + p.montant, 0);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {hasPaiements && <AlertCircle className="h-5 w-5 text-destructive" />}
            Annuler la dépense {depenseNumero}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isLoadingPaiements ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Vérification des paiements associés...
              </span>
            ) : errorLoadingPaiements ? (
              <span className="text-destructive">{errorLoadingPaiements}</span>
            ) : hasPaiements ? (
              <>
                <strong className="text-foreground">Attention :</strong> Cette dépense a{' '}
                <strong className="text-foreground">{paiementsValides.length} paiement(s) valide(s)</strong> pour un
                montant total de <strong className="text-foreground">{formatCurrency(totalPaiements)}</strong>.
                <br />
                <br />
                En confirmant l'annulation, tous ces paiements seront <strong>automatiquement annulés</strong>.
              </>
            ) : (
              'Indiquez le motif d\'annulation pour tracer cette action.'
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {hasPaiements && !isLoadingPaiements && (
          <div className="border rounded-lg p-4 max-h-[200px] overflow-y-auto space-y-2 bg-muted/30">
            <div className="text-sm font-medium mb-2">Paiements qui seront annulés :</div>
            {paiementsValides.map((paiement) => (
              <div
                key={paiement.id}
                className="flex items-center justify-between p-2 bg-background rounded border text-sm"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-mono">
                    {paiement.numero}
                  </Badge>
                  <span className="text-muted-foreground">
                    {new Date(paiement.datePaiement).toLocaleDateString('fr-FR')}
                  </span>
                  <Badge variant="secondary">{paiement.modePaiement}</Badge>
                </div>
                <span className="font-medium tabular-nums">{formatCurrency(paiement.montant)}</span>
              </div>
            ))}
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
              'Confirmer l\'annulation'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
