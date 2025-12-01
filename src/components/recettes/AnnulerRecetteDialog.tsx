import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface AnnulerRecetteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (motif: string) => Promise<void>;
  recetteNumero?: string;
}

export const AnnulerRecetteDialog = ({
  open,
  onOpenChange,
  onConfirm,
  recetteNumero,
}: AnnulerRecetteDialogProps) => {
  const [motif, setMotif] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!motif.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onConfirm(motif);
      setMotif('');
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Annuler la recette {recetteNumero}</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action est irréversible. L'opération de trésorerie associée sera également annulée.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="motif">Motif d'annulation *</Label>
          <Textarea
            id="motif"
            placeholder="Indiquez le motif de l'annulation..."
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            rows={4}
            required
          />
        </div>

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!motif.trim() || isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmer l'annulation
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
