import { Plus, Trash2 } from 'lucide-react';
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
import type { FinancialVentilation, VentilationNature } from '@/types/financial.types';
import {
  createEmptyVentilation,
  DEFAULT_SENS_BY_NATURE,
  VENTILATION_NATURE_LABELS,
  VENTILATION_SENS_LABELS,
} from '@/lib/financial-utils';

interface VentilationEditorProps {
  ventilations: FinancialVentilation[];
  onChange: (ventilations: FinancialVentilation[]) => void;
}

export const VentilationEditor = ({ ventilations, onChange }: VentilationEditorProps) => {
  const addLine = () => onChange([...ventilations, createEmptyVentilation()]);

  const updateLine = (id: string, updates: Partial<FinancialVentilation>) => {
    onChange(
      ventilations.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, ...updates };
        if (updates.nature && updates.sens === undefined) {
          next.sens = DEFAULT_SENS_BY_NATURE[updates.nature as VentilationNature];
        }
        return next;
      })
    );
  };

  const removeLine = (id: string) => onChange(ventilations.filter((item) => item.id !== id));

  return (
    <div className="space-y-3 rounded-md border p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label>Ventilation explicative</Label>
          <p className="text-xs text-muted-foreground">
            Explique les ecarts entre HT, TTC et net paye.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={addLine}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter une ligne
        </Button>
      </div>

      <div className="space-y-3">
        {ventilations.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Aucune ligne de ventilation.
          </div>
        ) : null}

        {ventilations.map((item) => (
          <div key={item.id} className="grid gap-3 rounded-md border p-3 md:grid-cols-[2fr_1.4fr_1fr_1.1fr_auto]">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Libelle</Label>
              <Input
                value={item.libelle}
                onChange={(event) => updateLine(item.id, { libelle: event.target.value })}
                placeholder="TVA, retenue, redevance..."
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Nature</Label>
              <Select
                value={item.nature}
                onValueChange={(value) => updateLine(item.id, { nature: value as VentilationNature })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(VENTILATION_NATURE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Montant</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={item.montant || ''}
                onChange={(event) => updateLine(item.id, { montant: Number(event.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Sens</Label>
              <Select
                value={item.sens}
                onValueChange={(value) => updateLine(item.id, { sens: value as FinancialVentilation['sens'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(VENTILATION_SENS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(item.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
