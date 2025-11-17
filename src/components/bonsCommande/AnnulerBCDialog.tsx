import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface AnnulerBCDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bonCommandeNumero: string;
  onConfirm: (motif: string) => Promise<void>;
}

export const AnnulerBCDialog = ({
  open,
  onOpenChange,
  bonCommandeNumero,
  onConfirm,
}: AnnulerBCDialogProps) => {
  const [motif, setMotif] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!motif.trim()) {
      return;
    }

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Annuler le bon de commande</DialogTitle>
          <DialogDescription>
            Vous êtes sur le point d'annuler le bon de commande <strong>{bonCommandeNumero}</strong>.
            Cette action est irréversible.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="motif">Motif d'annulation *</Label>
            <Textarea
              id="motif"
              placeholder="Expliquez la raison de l'annulation..."
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!motif.trim() || isSubmitting}
          >
            {isSubmitting ? 'Annulation...' : 'Confirmer l\'annulation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
