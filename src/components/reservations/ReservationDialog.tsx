import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLignesBudgetaires } from '@/hooks/useLignesBudgetaires';
import { useProjets } from '@/hooks/useProjets';
import { useExercice } from '@/contexts/ExerciceContext';
import { useToast } from '@/hooks/use-toast';
import type { ReservationCredit, ReservationCreditFormData } from '@/types/reservation.types';

interface ReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: ReservationCreditFormData) => Promise<void>;
  reservation?: ReservationCredit;
}

export const ReservationDialog = ({ open, onOpenChange, onSave, reservation }: ReservationDialogProps) => {
  const { lignes: lignesBudgetaires = [] } = useLignesBudgetaires();
  const { projets = [] } = useProjets();
  const { currentExercice } = useExercice();
  const { toast } = useToast();
  const [typeBeneficiaire, setTypeBeneficiaire] = useState<'projet' | 'autre'>('projet');
  const [formData, setFormData] = useState<ReservationCreditFormData>({
    ligneBudgetaireId: '',
    montant: 0,
    objet: '',
    beneficiaire: '',
    projetId: '',
    dateExpiration: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (reservation) {
      const hasProjet = !!reservation.projetId;
      setTypeBeneficiaire(hasProjet ? 'projet' : 'autre');
      setFormData({
        ligneBudgetaireId: reservation.ligneBudgetaireId,
        montant: reservation.montant,
        objet: reservation.objet,
        beneficiaire: reservation.beneficiaire || '',
        projetId: reservation.projetId || '',
        dateExpiration: reservation.dateExpiration || '',
      });
    } else {
      setTypeBeneficiaire('projet');
      setFormData({
        ligneBudgetaireId: '',
        montant: 0,
        objet: '',
        beneficiaire: '',
        projetId: '',
        dateExpiration: currentExercice?.dateFin || '',
      });
    }
  }, [reservation, open, currentExercice]);

  const validateForm = (): string | null => {
    if (!formData.ligneBudgetaireId) {
      return 'Veuillez sélectionner une ligne budgétaire';
    }

    if (!formData.montant || formData.montant <= 0) {
      return 'Le montant doit être supérieur à 0';
    }

    if (!formData.objet.trim()) {
      return 'Veuillez saisir l\'objet de la réservation';
    }

    if (!formData.dateExpiration) {
      return 'Veuillez saisir la date d\'expiration';
    }

    if (typeBeneficiaire === 'projet' && !formData.projetId) {
      return 'Veuillez sélectionner un projet';
    }

    if (typeBeneficiaire === 'autre' && !formData.beneficiaire?.trim()) {
      return 'Veuillez saisir le nom du bénéficiaire';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      toast({
        title: 'Formulaire incomplet',
        description: validationError,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(formData);
      onOpenChange(false);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const lignesActives = lignesBudgetaires.filter(l => l.statut === 'actif' && l.disponible > 0);
  const projetsActifs = projets.filter(p => 
    p.statut === 'planifie' || p.statut === 'en_cours'
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {reservation ? 'Modifier la réservation' : 'Nouvelle réservation de crédit'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ligneBudgetaire">Ligne budgétaire *</Label>
            <Select
              value={formData.ligneBudgetaireId}
              onValueChange={(value) => setFormData({ ...formData, ligneBudgetaireId: value })}
              disabled={!!reservation}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une ligne" />
              </SelectTrigger>
              <SelectContent>
                {lignesActives.map((ligne) => (
                  <SelectItem key={ligne.id} value={ligne.id}>
                    {ligne.libelle} - Disponible: {ligne.disponible.toLocaleString()} FCFA
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="montant">Montant (FCFA) *</Label>
              <Input
                id="montant"
                type="number"
                min="0.01"
                step="0.01"
                value={formData.montant || ''}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  setFormData({ 
                    ...formData, 
                    montant: !isNaN(value) && value > 0 ? value : 0 
                  });
                }}
                required
                placeholder="Saisir le montant"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateExpiration">Date d'expiration *</Label>
              <Input
                id="dateExpiration"
                type="date"
                value={formData.dateExpiration}
                onChange={(e) => setFormData({ ...formData, dateExpiration: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Type de bénéficiaire</Label>
            <div className="flex gap-4">
              <Button
                type="button"
                variant={typeBeneficiaire === 'projet' ? 'default' : 'outline'}
                onClick={() => {
                  setTypeBeneficiaire('projet');
                  setFormData({ ...formData, beneficiaire: '' });
                }}
              >
                Projet
              </Button>
              <Button
                type="button"
                variant={typeBeneficiaire === 'autre' ? 'default' : 'outline'}
                onClick={() => {
                  setTypeBeneficiaire('autre');
                  setFormData({ ...formData, projetId: '' });
                }}
              >
                Autre bénéficiaire
              </Button>
            </div>
          </div>

          {typeBeneficiaire === 'projet' && (
            <div className="space-y-2">
              <Label htmlFor="projet">Projet *</Label>
              <Select
                value={formData.projetId}
                onValueChange={(value) => setFormData({ ...formData, projetId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un projet" />
                </SelectTrigger>
                <SelectContent>
                  {projetsActifs.map((projet) => (
                    <SelectItem key={projet.id} value={projet.id}>
                      {projet.code} - {projet.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {typeBeneficiaire === 'autre' && (
            <div className="space-y-2">
              <Label htmlFor="beneficiaire">Bénéficiaire *</Label>
              <Input
                id="beneficiaire"
                value={formData.beneficiaire}
                onChange={(e) => setFormData({ ...formData, beneficiaire: e.target.value })}
                placeholder="Nom du bénéficiaire"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="objet">Objet *</Label>
            <Textarea
              id="objet"
              value={formData.objet}
              onChange={(e) => setFormData({ ...formData, objet: e.target.value })}
              placeholder="Description de la réservation"
              required
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
