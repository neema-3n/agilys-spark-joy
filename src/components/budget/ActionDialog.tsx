import { useState, useEffect } from 'react';
import { Action, Programme } from '@/types/budget.types';
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

interface ActionDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Action, 'id' | 'created_at' | 'updated_at'>) => void;
  action?: Action | null;
  programmes: Programme[];
  clientId: string;
  exerciceId: string;
}

export const ActionDialog = ({
  open,
  onClose,
  onSubmit,
  action,
  programmes,
  clientId,
  exerciceId,
}: ActionDialogProps) => {
  const [formData, setFormData] = useState({
    programme_id: '',
    code: '',
    libelle: '',
    ordre: 0,
  });

  useEffect(() => {
    if (action) {
      setFormData({
        programme_id: action.programme_id,
        code: action.code,
        libelle: action.libelle,
        ordre: action.ordre,
      });
    } else {
      setFormData({
        programme_id: '',
        code: '',
        libelle: '',
        ordre: 0,
      });
    }
  }, [action, open]);

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
            {action ? 'Modifier l\'action' : 'Nouvelle action'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="programme_id">Programme</Label>
              <Select
                value={formData.programme_id}
                onValueChange={(value) => setFormData({ ...formData, programme_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un programme" />
                </SelectTrigger>
                <SelectContent>
                  {programmes.map((programme) => (
                    <SelectItem key={programme.id} value={programme.id}>
                      {programme.code} - {programme.libelle}
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
                placeholder="Ex: A01"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="libelle">Libellé</Label>
              <Input
                id="libelle"
                value={formData.libelle}
                onChange={(e) => setFormData({ ...formData, libelle: e.target.value })}
                placeholder="Ex: Personnel"
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
              {action ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
