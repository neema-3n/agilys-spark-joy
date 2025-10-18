import { useState, useEffect } from 'react';
import { LigneBudgetaire, Action } from '@/types/budget.types';
import { useComptes } from '@/hooks/useComptes';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface LigneBudgetaireDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<LigneBudgetaire>) => void;
  ligne?: LigneBudgetaire | null;
  actions: Action[];
  exerciceId: string;
}

export const LigneBudgetaireDialog = ({
  open,
  onClose,
  onSubmit,
  ligne,
  actions,
  exerciceId,
}: LigneBudgetaireDialogProps) => {
  const { comptes, isLoading: isLoadingComptes } = useComptes();
  
  const [formData, setFormData] = useState({
    actionId: '',
    compteId: '',
    libelle: '',
    montantInitial: '',
  });

  useEffect(() => {
    if (ligne) {
      setFormData({
        actionId: ligne.actionId,
        compteId: ligne.compteId,
        libelle: ligne.libelle,
        montantInitial: ligne.montantInitial.toString(),
      });
    } else {
      setFormData({
        actionId: '',
        compteId: '',
        libelle: '',
        montantInitial: '',
      });
    }
  }, [ligne, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSubmit({
      ...(ligne ? { id: ligne.id } : {}),
      exerciceId,
      actionId: formData.actionId,
      compteId: formData.compteId,
      libelle: formData.libelle,
      montantInitial: parseFloat(formData.montantInitial),
    });
    
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {ligne ? 'Modifier la ligne budgétaire' : 'Nouvelle ligne budgétaire'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="actionId">Action</Label>
              <Select
                value={formData.actionId}
                onValueChange={(value) => setFormData({ ...formData, actionId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une action" />
                </SelectTrigger>
                <SelectContent>
                  {actions.map((action) => (
                    <SelectItem key={action.id} value={action.id}>
                      {action.code} - {action.libelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="compteId">Compte comptable</Label>
              <Select
                value={formData.compteId}
                onValueChange={(value) => setFormData({ ...formData, compteId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un compte" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingComptes ? (
                    <SelectItem value="" disabled>
                      Chargement...
                    </SelectItem>
                  ) : comptes.length === 0 ? (
                    <SelectItem value="" disabled>
                      Aucun compte disponible
                    </SelectItem>
                  ) : (
                    comptes.map((compte) => (
                      <SelectItem key={compte.id} value={compte.id}>
                        {compte.numero} - {compte.libelle}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="libelle">Libellé</Label>
              <Input
                id="libelle"
                value={formData.libelle}
                onChange={(e) => setFormData({ ...formData, libelle: e.target.value })}
                placeholder="Libellé de la ligne budgétaire"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="montantInitial">Montant initial (FCFA)</Label>
              <Input
                id="montantInitial"
                type="number"
                value={formData.montantInitial}
                onChange={(e) => setFormData({ ...formData, montantInitial: e.target.value })}
                placeholder="0"
                min="0"
                step="1000"
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">
              {ligne ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
