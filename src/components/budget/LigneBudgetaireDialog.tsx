import { useState, useEffect } from 'react';
import { LigneBudgetaire } from '@/types/budget.types';
import { useComptes } from '@/hooks/useComptes';
import { useSections } from '@/hooks/useSections';
import { useProgrammes } from '@/hooks/useProgrammes';
import { useActions } from '@/hooks/useActions';
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
import { useToast } from '@/hooks/use-toast';

interface LigneBudgetaireDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<LigneBudgetaire>) => void;
  ligne?: LigneBudgetaire | null;
  exerciceId: string;
}

export const LigneBudgetaireDialog = ({
  open,
  onClose,
  onSubmit,
  ligne,
  exerciceId,
}: LigneBudgetaireDialogProps) => {
  const { toast } = useToast();
  const { comptes, isLoading: isLoadingComptes } = useComptes();
  const { sections } = useSections();
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const { programmes } = useProgrammes(selectedSectionId);
  const [selectedProgrammeId, setSelectedProgrammeId] = useState('');
  const { actions } = useActions(selectedProgrammeId);
  
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
    
    // Validation des champs obligatoires
    if (!selectedSectionId) {
      toast({
        title: 'Erreur de validation',
        description: 'Veuillez sélectionner une section',
        variant: 'destructive',
      });
      return;
    }
    
    if (!selectedProgrammeId) {
      toast({
        title: 'Erreur de validation',
        description: 'Veuillez sélectionner un programme',
        variant: 'destructive',
      });
      return;
    }
    
    if (!formData.actionId) {
      toast({
        title: 'Erreur de validation',
        description: 'Veuillez sélectionner une action budgétaire',
        variant: 'destructive',
      });
      return;
    }
    
    if (!formData.compteId) {
      toast({
        title: 'Erreur de validation',
        description: 'Veuillez sélectionner un compte comptable',
        variant: 'destructive',
      });
      return;
    }
    
    if (!formData.libelle.trim()) {
      toast({
        title: 'Erreur de validation',
        description: 'Veuillez saisir un libellé',
        variant: 'destructive',
      });
      return;
    }
    
    if (!formData.montantInitial || parseFloat(formData.montantInitial) <= 0) {
      toast({
        title: 'Erreur de validation',
        description: 'Le montant doit être supérieur à zéro',
        variant: 'destructive',
      });
      return;
    }
    
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
              <Label htmlFor="sectionId">
                Section <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedSectionId}
                onValueChange={(value) => {
                  setSelectedSectionId(value);
                  setSelectedProgrammeId('');
                  setFormData({ ...formData, actionId: '' });
                }}
              >
                <SelectTrigger className={!selectedSectionId ? 'border-muted-foreground/20' : ''}>
                  <SelectValue placeholder="Sélectionner une section" />
                </SelectTrigger>
                <SelectContent>
                  {sections.length === 0 ? (
                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                      Aucune section disponible
                    </div>
                  ) : (
                    sections.map((section) => (
                      <SelectItem key={section.id} value={section.id}>
                        {section.code} - {section.libelle}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="programmeId">
                Programme <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedProgrammeId}
                onValueChange={(value) => {
                  setSelectedProgrammeId(value);
                  setFormData({ ...formData, actionId: '' });
                }}
                disabled={!selectedSectionId}
              >
                <SelectTrigger className={!selectedProgrammeId && selectedSectionId ? 'border-muted-foreground/20' : ''}>
                  <SelectValue placeholder="Sélectionner un programme" />
                </SelectTrigger>
                <SelectContent>
                  {programmes.length === 0 ? (
                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                      {selectedSectionId ? 'Aucun programme disponible' : 'Sélectionnez d\'abord une section'}
                    </div>
                  ) : (
                    programmes.map((programme) => (
                      <SelectItem key={programme.id} value={programme.id}>
                        {programme.code} - {programme.libelle}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="actionId">
                Action budgétaire <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.actionId}
                onValueChange={(value) => setFormData({ ...formData, actionId: value })}
                disabled={!selectedProgrammeId}
              >
                <SelectTrigger className={!formData.actionId && selectedProgrammeId ? 'border-muted-foreground/20' : ''}>
                  <SelectValue placeholder="Sélectionner une action" />
                </SelectTrigger>
                <SelectContent>
                  {actions.length === 0 ? (
                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                      {selectedProgrammeId ? 'Aucune action disponible' : 'Sélectionnez d\'abord un programme'}
                    </div>
                  ) : (
                    actions.map((action) => (
                      <SelectItem key={action.id} value={action.id}>
                        {action.code} - {action.libelle}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="compteId">
                Compte comptable <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.compteId}
                onValueChange={(value) => setFormData({ ...formData, compteId: value })}
              >
                <SelectTrigger className={!formData.compteId ? 'border-muted-foreground/20' : ''}>
                  <SelectValue placeholder="Sélectionner un compte" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingComptes ? (
                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                      Chargement...
                    </div>
                  ) : comptes.length === 0 ? (
                    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                      Aucun compte disponible
                    </div>
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
              <Label htmlFor="libelle">
                Libellé <span className="text-destructive">*</span>
              </Label>
              <Input
                id="libelle"
                value={formData.libelle}
                onChange={(e) => setFormData({ ...formData, libelle: e.target.value })}
                placeholder="Libellé de la ligne budgétaire"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="montantInitial">
                Montant initial (FCFA) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="montantInitial"
                type="number"
                value={formData.montantInitial}
                onChange={(e) => setFormData({ ...formData, montantInitial: e.target.value })}
                placeholder="0"
                min="0.01"
                step="any"
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
