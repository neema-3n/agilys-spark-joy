import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Scenario, GenerationParams } from '@/types/prevision.types';
import { useExercice } from '@/contexts/ExerciceContext';
import { Loader2, Wand2 } from 'lucide-react';

interface GenerateurPrevisionsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenario: Scenario | null;
  onGenerate: (params: GenerationParams) => void;
  isGenerating?: boolean;
}

export function GenerateurPrevisions({
  open,
  onOpenChange,
  scenario,
  onGenerate,
  isGenerating,
}: GenerateurPrevisionsProps) {
  const { exercices } = useExercice();

  const [formData, setFormData] = useState({
    exerciceReferenceId: scenario?.exerciceReferenceId || '',
    nombreAnnees: 3,
    tauxCroissanceGlobal: 5,
    inclureInflation: false,
    tauxInflation: 2,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scenario) return;

    const params: GenerationParams = {
      scenarioId: scenario.id,
      exerciceReferenceId: formData.exerciceReferenceId,
      nombreAnnees: formData.nombreAnnees,
      tauxCroissanceGlobal: formData.tauxCroissanceGlobal,
      inclureInflation: formData.inclureInflation,
      tauxInflation: formData.inclureInflation ? formData.tauxInflation : undefined,
    };

    onGenerate(params);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Générateur de prévisions
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-1">
          <form className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="exerciceReference">Exercice de référence *</Label>
            <Select
              value={formData.exerciceReferenceId}
              onValueChange={(value) => setFormData({ ...formData, exerciceReferenceId: value })}
              required
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
            <p className="text-xs text-muted-foreground">
              Les prévisions seront générées à partir du budget de cet exercice
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nombreAnnees">Nombre d'années à projeter *</Label>
            <Input
              id="nombreAnnees"
              type="number"
              value={formData.nombreAnnees}
              onChange={(e) => setFormData({ ...formData, nombreAnnees: parseInt(e.target.value) })}
              required
              min={1}
              max={5}
            />
            <p className="text-xs text-muted-foreground">
              Entre 1 et 5 années futures
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tauxCroissance">Taux de croissance global (%)</Label>
            <Input
              id="tauxCroissance"
              type="number"
              value={formData.tauxCroissanceGlobal}
              onChange={(e) => setFormData({ ...formData, tauxCroissanceGlobal: parseFloat(e.target.value) })}
              step="0.1"
              placeholder="Ex: 5"
            />
            <p className="text-xs text-muted-foreground">
              Taux de croissance annuel appliqué à tous les postes
            </p>
          </div>

          <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="inclureInflation">Inclure l'inflation</Label>
              <p className="text-xs text-muted-foreground">
                Ajouter un taux d'inflation aux prévisions
              </p>
            </div>
            <Switch
              id="inclureInflation"
              checked={formData.inclureInflation}
              onCheckedChange={(checked) => setFormData({ ...formData, inclureInflation: checked })}
            />
          </div>

          {formData.inclureInflation && (
            <div className="space-y-2">
              <Label htmlFor="tauxInflation">Taux d'inflation (%)</Label>
              <Input
                id="tauxInflation"
                type="number"
                value={formData.tauxInflation}
                onChange={(e) => setFormData({ ...formData, tauxInflation: parseFloat(e.target.value) })}
                step="0.1"
                placeholder="Ex: 2"
              />
            </div>
          )}

          <div className="rounded-lg bg-muted p-4 space-y-2">
            <p className="text-sm font-medium">Résumé</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Projection sur {formData.nombreAnnees} année(s)</li>
              <li>• Taux de croissance: {formData.tauxCroissanceGlobal}%</li>
              {formData.inclureInflation && (
                <li>• Inflation: +{formData.tauxInflation}%</li>
              )}
              <li>
                • Taux effectif: {formData.tauxCroissanceGlobal + (formData.inclureInflation ? formData.tauxInflation : 0)}%
              </li>
            </ul>
          </div>
          </form>
        </ScrollArea>

        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Annuler
          </Button>
          <Button 
            type="button" 
            onClick={handleSubmit} 
            disabled={isGenerating || !formData.exerciceReferenceId}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                Générer les prévisions
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
