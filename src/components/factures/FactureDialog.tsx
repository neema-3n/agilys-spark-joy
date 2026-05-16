import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FactureForm } from '@/components/factures/FactureForm';
import { CreateFactureInput, Facture } from '@/types/facture.types';

interface FactureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facture?: Facture;
  onSubmit: (data: CreateFactureInput) => Promise<void>;
  fournisseurs: Array<{ id: string; nom: string; code: string }>;
  bonsCommande: Array<{
    id: string;
    numero: string;
    statut: string;
    fournisseur_id?: string;
    engagement_id?: string;
    ligne_budgetaire_id?: string;
    projet_id?: string;
    objet?: string;
    montant?: number;
  }>;
  engagements: Array<{ id: string; numero: string }>;
  lignesBudgetaires: Array<{ id: string; libelle: string }>;
  projets: Array<{ id: string; nom: string; code: string }>;
  currentClientId: string;
  currentExerciceId: string;
  onGenererNumero: () => Promise<string>;
  initialBonCommandeId?: string;
}

export const FactureDialog = ({
  open,
  onOpenChange,
  facture,
  onSubmit,
  fournisseurs,
  bonsCommande,
  engagements,
  lignesBudgetaires,
  projets,
  currentClientId,
  currentExerciceId,
  onGenererNumero,
  initialBonCommandeId,
}: FactureDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>{facture ? 'Modifier la facture' : 'Nouvelle facture'}</DialogTitle>
        </DialogHeader>

        <FactureForm
          key={`${open ? 'open' : 'closed'}-${facture?.id ?? 'new'}-${initialBonCommandeId ?? 'none'}`}
          facture={facture}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          fournisseurs={fournisseurs}
          bonsCommande={bonsCommande}
          engagements={engagements}
          lignesBudgetaires={lignesBudgetaires}
          projets={projets}
          currentClientId={currentClientId}
          currentExerciceId={currentExerciceId}
          onGenererNumero={onGenererNumero}
          initialBonCommandeId={initialBonCommandeId}
        />
      </DialogContent>
    </Dialog>
  );
};
