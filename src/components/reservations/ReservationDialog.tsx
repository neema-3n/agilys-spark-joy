import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLignesBudgetaires } from '@/hooks/useLignesBudgetaires';
import type { ReservationCredit, ReservationCreditFormData } from '@/types/reservation.types';

interface ReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: ReservationCreditFormData) => Promise<void>;
  reservation?: ReservationCredit;
}

export const ReservationDialog = ({ open, onOpenChange, onSave, reservation }: ReservationDialogProps) => {
  const { lignes: lignesBudgetaires = [] } = useLignesBudgetaires();
  const [formData, setFormData] = useState<ReservationCreditFormData>({
    ligneBudgetaireId: '',
    montant: 0,
    objet: '',
    beneficiaire: '',
    dateExpiration: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (reservation) {
      setFormData({
        ligneBudgetaireId: reservation.ligneBudgetaireId,
        montant: reservation.montant,
        objet: reservation.objet,
        beneficiaire: reservation.beneficiaire || '',
        dateExpiration: reservation.dateExpiration || '',
      });
    } else {
      setFormData({
        ligneBudgetaireId: '',
        montant: 0,
        objet: '',
        beneficiaire: '',
        dateExpiration: '',
      });
    }
  }, [reservation, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
                min="0"
                step="0.01"
                value={formData.montant}
                onChange={(e) => setFormData({ ...formData, montant: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateExpiration">Date d'expiration</Label>
              <Input
                id="dateExpiration"
                type="date"
                value={formData.dateExpiration}
                onChange={(e) => setFormData({ ...formData, dateExpiration: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="beneficiaire">Bénéficiaire</Label>
            <Input
              id="beneficiaire"
              value={formData.beneficiaire}
              onChange={(e) => setFormData({ ...formData, beneficiaire: e.target.value })}
              placeholder="Nom du bénéficiaire"
            />
          </div>

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
