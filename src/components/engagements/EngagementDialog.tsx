import { useState, useEffect } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useLignesBudgetaires } from '@/hooks/useLignesBudgetaires';
import { useFournisseurs } from '@/hooks/useFournisseurs';
import { useProjets } from '@/hooks/useProjets';
import type { Engagement, EngagementFormData } from '@/types/engagement.types';
import type { ReservationCredit } from '@/types/reservation.types';

interface EngagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: EngagementFormData) => Promise<void>;
  engagement?: Engagement;
  reservation?: ReservationCredit;
}

export const EngagementDialog = ({
  open,
  onOpenChange,
  onSave,
  engagement,
  reservation,
}: EngagementDialogProps) => {
  const { lignes: lignesBudgetaires } = useLignesBudgetaires();
  const { fournisseurs } = useFournisseurs();
  const { projets } = useProjets();

  const lignesActives = lignesBudgetaires.filter(l => l.statut === 'actif');
  const fournisseursActifs = fournisseurs.filter(f => f.statut === 'actif');
  const projetsActifs = projets.filter(p => p.statut !== 'termine' && p.statut !== 'annule');

  const [typeBeneficiaire, setTypeBeneficiaire] = useState<'fournisseur' | 'direct'>('fournisseur');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<EngagementFormData>({
    ligneBudgetaireId: '',
    objet: '',
    montant: 0,
    fournisseurId: undefined,
    beneficiaire: undefined,
    projetId: undefined,
    observations: '',
  });

  useEffect(() => {
    if (reservation) {
      // Pré-remplir depuis une réservation
      setFormData({
        reservationCreditId: reservation.id,
        ligneBudgetaireId: reservation.ligneBudgetaireId,
        objet: reservation.objet,
        montant: reservation.montant,
        beneficiaire: reservation.beneficiaire,
        projetId: reservation.projetId,
        observations: '',
      });
      setTypeBeneficiaire(reservation.beneficiaire ? 'direct' : 'fournisseur');
    } else if (engagement) {
      // Modifier un engagement existant
      setFormData({
        ligneBudgetaireId: engagement.ligneBudgetaireId,
        objet: engagement.objet,
        montant: engagement.montant,
        fournisseurId: engagement.fournisseurId,
        beneficiaire: engagement.beneficiaire,
        projetId: engagement.projetId,
        observations: engagement.observations,
      });
      setTypeBeneficiaire(engagement.fournisseurId ? 'fournisseur' : 'direct');
    } else {
      // Nouveau engagement vide
      setFormData({
        ligneBudgetaireId: '',
        objet: '',
        montant: 0,
        fournisseurId: undefined,
        beneficiaire: undefined,
        projetId: undefined,
        observations: '',
      });
      setTypeBeneficiaire('fournisseur');
    }
  }, [engagement, reservation, open]);

  const validateForm = (): string | null => {
    if (!formData.ligneBudgetaireId) return 'Veuillez sélectionner une ligne budgétaire';
    if (!formData.objet.trim()) return 'Veuillez saisir l\'objet de l\'engagement';
    if (formData.montant <= 0) return 'Le montant doit être supérieur à 0';
    
    const ligneBudgetaire = lignesActives.find(l => l.id === formData.ligneBudgetaireId);
    if (ligneBudgetaire && formData.montant > ligneBudgetaire.disponible) {
      return `Le montant dépasse le disponible (${ligneBudgetaire.disponible.toLocaleString()} FCFA)`;
    }

    if (typeBeneficiaire === 'fournisseur' && !formData.fournisseurId) {
      return 'Veuillez sélectionner un fournisseur';
    }
    if (typeBeneficiaire === 'direct' && !formData.beneficiaire?.trim()) {
      return 'Veuillez saisir le nom du bénéficiaire';
    }

    return null;
  };

  const handleSubmit = async () => {
    const error = validateForm();
    if (error) {
      alert(error);
      return;
    }

    setIsSubmitting(true);
    try {
      const dataToSave = { ...formData };
      
      // Nettoyer selon le type de bénéficiaire
      if (typeBeneficiaire === 'fournisseur') {
        dataToSave.beneficiaire = undefined;
      } else {
        dataToSave.fournisseurId = undefined;
      }

      await onSave(dataToSave);
      onOpenChange(false);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedLigne = lignesActives.find(l => l.id === formData.ligneBudgetaireId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {engagement ? 'Modifier l\'engagement' : 'Nouvel engagement'}
            {reservation && ' (depuis réservation)'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {reservation && (
            <div className="bg-muted p-3 rounded-md text-sm">
              <strong>Réservation :</strong> {reservation.numero} - {reservation.objet}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="ligne">Ligne budgétaire *</Label>
            <Select
              value={formData.ligneBudgetaireId}
              onValueChange={(value) =>
                setFormData({ ...formData, ligneBudgetaireId: value })
              }
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
            {selectedLigne && (
              <p className="text-xs text-muted-foreground">
                Disponible : {selectedLigne.disponible.toLocaleString()} FCFA
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="objet">Objet *</Label>
            <Input
              id="objet"
              value={formData.objet}
              onChange={(e) => setFormData({ ...formData, objet: e.target.value })}
              placeholder="Description de l'engagement"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="montant">Montant (FCFA) *</Label>
            <Input
              id="montant"
              type="number"
              value={formData.montant || ''}
              onChange={(e) =>
                setFormData({ ...formData, montant: Number(e.target.value) })
              }
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label>Type de bénéficiaire *</Label>
            <RadioGroup
              value={typeBeneficiaire}
              onValueChange={(value: 'fournisseur' | 'direct') =>
                setTypeBeneficiaire(value)
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fournisseur" id="fournisseur" />
                <Label htmlFor="fournisseur" className="font-normal">
                  Fournisseur référencé
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="direct" id="direct" />
                <Label htmlFor="direct" className="font-normal">
                  Bénéficiaire direct
                </Label>
              </div>
            </RadioGroup>
          </div>

          {typeBeneficiaire === 'fournisseur' ? (
            <div className="space-y-2">
              <Label htmlFor="fournisseur-select">Fournisseur *</Label>
              <Select
                value={formData.fournisseurId || ''}
                onValueChange={(value) =>
                  setFormData({ ...formData, fournisseurId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un fournisseur" />
                </SelectTrigger>
                <SelectContent>
                  {fournisseursActifs.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="beneficiaire">Nom du bénéficiaire *</Label>
              <Input
                id="beneficiaire"
                value={formData.beneficiaire || ''}
                onChange={(e) =>
                  setFormData({ ...formData, beneficiaire: e.target.value })
                }
                placeholder="Nom complet du bénéficiaire"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="projet">Projet (optionnel)</Label>
            <Select
              value={formData.projetId || ''}
              onValueChange={(value) =>
                setFormData({ ...formData, projetId: value || undefined })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un projet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Aucun projet</SelectItem>
                {projetsActifs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.code} - {p.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observations">Observations</Label>
            <Textarea
              id="observations"
              value={formData.observations || ''}
              onChange={(e) =>
                setFormData({ ...formData, observations: e.target.value })
              }
              placeholder="Observations complémentaires"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
