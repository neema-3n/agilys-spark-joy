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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';

interface ReceptionnerBCDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bonCommandeNumero: string;
  onConfirm: (dateLivraisonReelle: string) => Promise<void>;
}

export const ReceptionnerBCDialog = ({
  open,
  onOpenChange,
  bonCommandeNumero,
  onConfirm,
}: ReceptionnerBCDialogProps) => {
  const [dateLivraisonReelle, setDateLivraisonReelle] = useState(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(dateLivraisonReelle);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Réceptionner le bon de commande</DialogTitle>
          <DialogDescription>
            Confirmez la réception du bon de commande <strong>{bonCommandeNumero}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="dateLivraison">Date de livraison réelle *</Label>
            <Input
              id="dateLivraison"
              type="date"
              value={dateLivraisonReelle}
              onChange={(e) => setDateLivraisonReelle(e.target.value)}
              max={format(new Date(), 'yyyy-MM-dd')}
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
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Réception...' : 'Confirmer la réception'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
