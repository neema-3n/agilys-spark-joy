import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { Depense, DepenseFormData } from '@/types/depense.types';
import type { Engagement } from '@/types/engagement.types';
import type { ReservationCredit } from '@/types/reservation.types';
import type { Facture } from '@/types/facture.types';
import { DepenseForm } from '@/components/depenses/DepenseForm';

interface DepenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: DepenseFormData) => Promise<void>;
  depense?: Depense;
  preSelectedEngagement?: Engagement;
  preSelectedReservation?: ReservationCredit;
  preSelectedFacture?: Facture;
}

export const DepenseDialog = ({
  open,
  onOpenChange,
  onSave,
  depense,
  preSelectedEngagement,
  preSelectedReservation,
  preSelectedFacture,
}: DepenseDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>{depense ? 'Modifier la dépense' : 'Nouvelle dépense'}</DialogTitle>
        </DialogHeader>
        <DepenseForm
          depense={depense}
          onSubmit={onSave}
          onCancel={() => onOpenChange(false)}
          preSelectedEngagement={preSelectedEngagement}
          preSelectedReservation={preSelectedReservation}
          preSelectedFacture={preSelectedFacture}
          submitLabel={depense ? 'Enregistrer' : 'Créer la dépense'}
          useScrollArea
        />
      </DialogContent>
    </Dialog>
  );
};
