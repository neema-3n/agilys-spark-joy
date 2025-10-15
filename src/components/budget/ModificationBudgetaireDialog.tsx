import { useState } from 'react';
import { LigneBudgetaire, TypeModification } from '@/types/budget.types';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ModificationBudgetaireDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    type: TypeModification;
    ligneSourceId?: string;
    ligneDestinationId: string;
    montant: number;
    motif: string;
  }) => void;
  lignes: LigneBudgetaire[];
}

export const ModificationBudgetaireDialog = ({
  open,
  onClose,
  onSubmit,
  lignes,
}: ModificationBudgetaireDialogProps) => {
  const [formData, setFormData] = useState({
    type: 'augmentation' as TypeModification,
    ligneSourceId: '',
    ligneDestinationId: '',
    montant: '',
    motif: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSubmit({
      type: formData.type,
      ligneSourceId: formData.type === 'virement' ? formData.ligneSourceId : undefined,
      ligneDestinationId: formData.ligneDestinationId,
      montant: parseFloat(formData.montant),
      motif: formData.motif,
    });
    
    setFormData({
      type: 'augmentation',
      ligneSourceId: '',
      ligneDestinationId: '',
      montant: '',
      motif: '',
    });
    
    onClose();
  };

  const getLigneLabel = (ligne: LigneBudgetaire) => {
    return `${ligne.libelle} (Dispo: ${new Intl.NumberFormat('fr-FR').format(ligne.disponible)} FCFA)`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nouvelle modification budgétaire</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type de modification</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => 
                  setFormData({ ...formData, type: value as TypeModification })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="augmentation">Augmentation</SelectItem>
                  <SelectItem value="diminution">Diminution</SelectItem>
                  <SelectItem value="virement">Virement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.type === 'virement' && (
              <div className="space-y-2">
                <Label htmlFor="ligneSourceId">Ligne source</Label>
                <Select
                  value={formData.ligneSourceId}
                  onValueChange={(value) => 
                    setFormData({ ...formData, ligneSourceId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une ligne" />
                  </SelectTrigger>
                  <SelectContent>
                    {lignes.map((ligne) => (
                      <SelectItem key={ligne.id} value={ligne.id}>
                        {getLigneLabel(ligne)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="ligneDestinationId">
                {formData.type === 'virement' ? 'Ligne destination' : 'Ligne budgétaire'}
              </Label>
              <Select
                value={formData.ligneDestinationId}
                onValueChange={(value) => 
                  setFormData({ ...formData, ligneDestinationId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une ligne" />
                </SelectTrigger>
                <SelectContent>
                  {lignes
                    .filter(l => l.id !== formData.ligneSourceId)
                    .map((ligne) => (
                      <SelectItem key={ligne.id} value={ligne.id}>
                        {getLigneLabel(ligne)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="montant">Montant (FCFA)</Label>
              <Input
                id="montant"
                type="number"
                value={formData.montant}
                onChange={(e) => setFormData({ ...formData, montant: e.target.value })}
                placeholder="0"
                min="1"
                step="1000"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="motif">Motif</Label>
              <Textarea
                id="motif"
                value={formData.motif}
                onChange={(e) => setFormData({ ...formData, motif: e.target.value })}
                placeholder="Expliquez la raison de cette modification..."
                rows={3}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">Créer la modification</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
