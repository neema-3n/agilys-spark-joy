import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Scenario, TypeScenario } from '@/types/prevision.types';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import { useAuth } from '@/contexts/AuthContext';

interface ScenarioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<Scenario, 'id' | 'createdAt' | 'updatedAt'>) => void;
  scenario?: Scenario;
}

export function ScenarioDialog({ open, onOpenChange, onSubmit, scenario }: ScenarioDialogProps) {
  const { currentClient } = useClient();
  const { exercices } = useExercice();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    code: scenario?.code || '',
    nom: scenario?.nom || '',
    description: scenario?.description || '',
    typeScenario: scenario?.typeScenario || 'realiste' as TypeScenario,
    anneeReference: scenario?.anneeReference || new Date().getFullYear(),
    exerciceReferenceId: scenario?.exerciceReferenceId || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      clientId: currentClient!.id,
      statut: 'brouillon',
      createdBy: user?.id,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{scenario ? 'Modifier le scénario' : 'Nouveau scénario'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
                placeholder="Ex: SCEN-2025-OPT"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="typeScenario">Type de scénario *</Label>
              <Select
                value={formData.typeScenario}
                onValueChange={(value: TypeScenario) => setFormData({ ...formData, typeScenario: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="optimiste">Optimiste</SelectItem>
                  <SelectItem value="realiste">Réaliste</SelectItem>
                  <SelectItem value="pessimiste">Pessimiste</SelectItem>
                  <SelectItem value="personnalise">Personnalisé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nom">Nom du scénario *</Label>
            <Input
              id="nom"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              required
              placeholder="Ex: Projection pluriannuelle 2025-2027"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Décrivez les hypothèses et objectifs du scénario..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="anneeReference">Année de référence *</Label>
              <Input
                id="anneeReference"
                type="number"
                value={formData.anneeReference}
                onChange={(e) => setFormData({ ...formData, anneeReference: parseInt(e.target.value) })}
                required
                min={2020}
                max={2050}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="exerciceReference">Exercice de référence</Label>
              <Select
                value={formData.exerciceReferenceId}
                onValueChange={(value) => setFormData({ ...formData, exerciceReferenceId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un exercice" />
                </SelectTrigger>
                <SelectContent>
                  {exercices.map((ex) => (
                    <SelectItem key={ex.id} value={ex.id}>
                      {ex.code} - {ex.libelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit">
              {scenario ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
