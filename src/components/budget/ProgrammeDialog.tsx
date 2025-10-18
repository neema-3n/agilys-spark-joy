import { useState, useEffect } from 'react';
import { Programme, Section } from '@/types/budget.types';
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

interface ProgrammeDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Programme, 'id' | 'created_at' | 'updated_at'>) => void;
  programme?: Programme | null;
  sections: Section[];
  clientId: string;
  exerciceId: string;
}

export const ProgrammeDialog = ({
  open,
  onClose,
  onSubmit,
  programme,
  sections,
  clientId,
  exerciceId,
}: ProgrammeDialogProps) => {
  const [formData, setFormData] = useState({
    section_id: '',
    code: '',
    libelle: '',
    ordre: 0,
  });

  useEffect(() => {
    if (programme) {
      setFormData({
        section_id: programme.section_id,
        code: programme.code,
        libelle: programme.libelle,
        ordre: programme.ordre,
      });
    } else {
      setFormData({
        section_id: '',
        code: '',
        libelle: '',
        ordre: 0,
      });
    }
  }, [programme, open]);

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
            {programme ? 'Modifier le programme' : 'Nouveau programme'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="section_id">Section</Label>
              <Select
                value={formData.section_id}
                onValueChange={(value) => setFormData({ ...formData, section_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une section" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.code} - {section.libelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Ex: P01"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="libelle">Libellé</Label>
              <Input
                id="libelle"
                value={formData.libelle}
                onChange={(e) => setFormData({ ...formData, libelle: e.target.value })}
                placeholder="Ex: Administration Générale"
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
              {programme ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
