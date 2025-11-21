import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Facture } from '@/types/facture.types';
import { ModePaiement, PaiementInput } from '@/types/paiement.types';

interface PaiementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  factures: Facture[];
  onSave: (data: PaiementInput) => void;
}

const modeOptions: { value: ModePaiement; label: string }[] = [
  { value: 'virement', label: 'Virement' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'carte', label: 'Carte' },
  { value: 'espece', label: 'Espèces' },
  { value: 'autre', label: 'Autre' },
];

export const PaiementDialog = ({
  open,
  onOpenChange,
  factures,
  onSave,
}: PaiementDialogProps) => {
  const defaultFactureId = factures[0]?.id || '';
  const [formData, setFormData] = useState<PaiementInput>({
    factureId: defaultFactureId,
    montant: 0,
    date: new Date().toISOString().slice(0, 10),
    mode: 'virement',
    reference: '',
    note: '',
  });

  const selectedFacture = useMemo(
    () => factures.find((f) => f.id === formData.factureId),
    [factures, formData.factureId]
  );

  useEffect(() => {
    if (open) {
      setFormData((prev) => ({
        ...prev,
        factureId: prev.factureId || defaultFactureId,
      }));
    }
  }, [open, defaultFactureId]);

  const handleSave = () => {
    if (!formData.factureId || formData.montant <= 0) return;
    onSave(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enregistrer un paiement</DialogTitle>
          <DialogDescription>
            Associez un paiement à une facture et suivez son exécution.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="facture">Facture</Label>
              <Select
                value={formData.factureId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, factureId: value }))
                }
              >
                <SelectTrigger id="facture">
                  <SelectValue placeholder="Sélectionner une facture" />
                </SelectTrigger>
                <SelectContent>
                  {factures.map((facture) => (
                    <SelectItem key={facture.id} value={facture.id}>
                      {facture.numero} — {facture.fournisseur?.nom || 'Fournisseur'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedFacture && (
                <p className="text-xs text-muted-foreground">
                  Montant TTC: {selectedFacture.montantTTC.toLocaleString('fr-FR')} — Payé:{' '}
                  {(selectedFacture.montantPaye || 0).toLocaleString('fr-FR')}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, date: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="montant">Montant</Label>
              <Input
                id="montant"
                type="number"
                min="0"
                step="0.01"
                value={formData.montant}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, montant: parseFloat(e.target.value) || 0 }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mode">Mode</Label>
              <Select
                value={formData.mode}
                onValueChange={(value: ModePaiement) =>
                  setFormData((prev) => ({ ...prev, mode: value }))
                }
              >
                <SelectTrigger id="mode">
                  <SelectValue placeholder="Choisir un mode" />
                </SelectTrigger>
                <SelectContent>
                  {modeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reference">Référence</Label>
              <Input
                id="reference"
                placeholder="Réf. bancaire ou interne"
                value={formData.reference}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, reference: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Note</Label>
              <Textarea
                id="note"
                placeholder="Note interne ou commentaire"
                value={formData.note}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, note: e.target.value }))
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={!formData.factureId || formData.montant <= 0}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
