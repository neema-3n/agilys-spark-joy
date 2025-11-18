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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

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

  const isFormValid = () => {
    return (
      formData.ligneDestinationId !== '' &&
      formData.montant !== '' &&
      parseFloat(formData.montant) > 0 &&
      formData.motif.trim() !== '' &&
      (formData.type !== 'virement' || formData.ligneSourceId !== '')
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation de la ligne budgétaire
    if (!formData.ligneDestinationId) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner une ligne budgétaire',
        variant: 'destructive',
      });
      return;
    }
    
    // Validation de la ligne source pour les virements
    if (formData.type === 'virement' && !formData.ligneSourceId) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner une ligne source pour le virement',
        variant: 'destructive',
      });
      return;
    }
    
    // Validation du montant
    const montant = parseFloat(formData.montant);
    if (isNaN(montant) || montant <= 0) {
      toast({
        title: 'Erreur',
        description: 'Le montant doit être supérieur à 0',
        variant: 'destructive',
      });
      return;
    }
    
    onSubmit({
      type: formData.type,
      ligneSourceId: formData.type === 'virement' ? formData.ligneSourceId : undefined,
      ligneDestinationId: formData.ligneDestinationId,
      montant: montant,
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
    return `${ligne.libelle} (Dispo: ${new Intl.NumberFormat('fr-FR').format(ligne.disponible)})`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Nouvelle modification budgétaire</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-1 min-h-0">
          <form className="space-y-4 py-4">
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
              <Label htmlFor="montant">Montant</Label>
              <Input
                id="montant"
                type="number"
                value={formData.montant}
                onChange={(e) => setFormData({ ...formData, montant: e.target.value })}
                placeholder="0"
                min="0.01"
                step="any"
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
          </form>
        </ScrollArea>
        
        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button 
            type="button"
            disabled={!isFormValid()}
            onClick={(e) => { e.preventDefault(); handleSubmit(e); }}
          >
            Créer la modification
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
