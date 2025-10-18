import { useState, useEffect } from 'react';
import { Section } from '@/types/budget.types';
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

interface SectionDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Section, 'id' | 'created_at' | 'updated_at'>) => void;
  section?: Section | null;
  clientId: string;
  exerciceId: string;
}

export const SectionDialog = ({
  open,
  onClose,
  onSubmit,
  section,
  clientId,
  exerciceId,
}: SectionDialogProps) => {
  const [formData, setFormData] = useState({
    code: '',
    libelle: '',
    ordre: 0,
  });

  useEffect(() => {
    if (section) {
      setFormData({
        code: section.code,
        libelle: section.libelle,
        ordre: section.ordre,
      });
    } else {
      setFormData({
        code: '',
        libelle: '',
        ordre: 0,
      });
    }
  }, [section, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      client_id: clientId,
      exercice_id: exerciceId,
      statut: 'actif',
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {section ? 'Modifier la section' : 'Nouvelle section'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Ex: S01"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="libelle">Libellé</Label>
              <Input
                id="libelle"
                value={formData.libelle}
                onChange={(e) => setFormData({ ...formData, libelle: e.target.value })}
                placeholder="Ex: Fonctionnement"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ordre">Ordre d'affichage</Label>
              <Input
                id="ordre"
                type="number"
                value={formData.ordre}
                onChange={(e) => setFormData({ ...formData, ordre: parseInt(e.target.value) })}
                min={0}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">
              {section ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
