import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTaxesFiscales } from '@/hooks/useTaxesFiscales';
import { useModelesFiscaux } from '@/hooks/useModelesFiscaux';
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
  const { taxesFiscales } = useTaxesFiscales();
  const { modelesFiscaux } = useModelesFiscaux();
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

  const applyModeleFiscal = (modeleId: string) => {
    if (modeleId === 'none') {
      onChange([]);
      return;
    }

    const modele = modelesFiscaux.find((item) => item.id === modeleId);
    if (!modele) return;

    onChange(
      modele.lignes.map((ligne) => {
        const taxe = taxesFiscales.find((item) => item.id === ligne.taxeFiscaleId) || ligne.taxeFiscale;

        return {
          id: globalThis.crypto?.randomUUID?.() ?? `vent-${Date.now()}-${Math.random()}`,
          taxeFiscaleId: ligne.taxeFiscaleId,
          libelle: taxe?.libelle || '',
          nature: taxe?.nature || 'taxe',
          sens: taxe?.sensDefaut || DEFAULT_SENS_BY_NATURE[(taxe?.nature || 'taxe') as VentilationNature],
          montant: ligne.montantDefautOverride ?? taxe?.montantFixeDefaut ?? 0,
          impacteNetPaye: true,
          taux: ligne.tauxDefautOverride ?? taxe?.tauxDefaut,
        };
      })
    );
  };

  return (
    <div className="space-y-3 rounded-md border p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label>Répartition des montants</Label>
          <p className="text-xs text-muted-foreground">
            Décomposez la facture entre taxes, retenues et autres ajustements pour justifier l'écart entre HT, TTC et net payé.
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" size="sm" variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Ajouter à la répartition</DropdownMenuLabel>
            <DropdownMenuItem onClick={addLine}>Ajouter une ligne libre</DropdownMenuItem>
            {modelesFiscaux.length > 0 ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Modèles de taxation</DropdownMenuLabel>
                {modelesFiscaux.map((modele) => (
                  <DropdownMenuItem key={modele.id} onClick={() => applyModeleFiscal(modele.id)}>
                    {modele.libelle}
                  </DropdownMenuItem>
                ))}
              </>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={ventilations.length === 0}
              onClick={() => applyModeleFiscal('none')}
              className="text-muted-foreground"
            >
              Réinitialiser la ventilation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-3">
        {ventilations.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Aucune ligne de ventilation.
          </div>
        ) : null}

        {ventilations.map((item) => {
          const taxeSelectionnee = taxesFiscales.find((taxe) => taxe.id === item.taxeFiscaleId);

          return (
            <div
              key={item.id}
              className="grid gap-3 rounded-md border p-3 md:grid-cols-[1.6fr_1.8fr_1.2fr_1fr_1.1fr_0.55fr_auto]"
            >
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Référentiel fiscal</Label>
                <Select
                  value={item.taxeFiscaleId || 'none'}
                  onValueChange={(value) => {
                    if (value === 'none') {
                      updateLine(item.id, { taxeFiscaleId: undefined });
                      return;
                    }

                    const taxe = taxesFiscales.find((entry) => entry.id === value);
                    if (!taxe) return;

                    updateLine(item.id, {
                      taxeFiscaleId: taxe.id,
                      libelle: taxe.libelle,
                      nature: taxe.nature,
                      sens: taxe.sensDefaut,
                      montant: item.montant > 0 ? item.montant : taxe.montantFixeDefaut || 0,
                      taux: taxe.tauxDefaut,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Aucune référence" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune référence</SelectItem>
                    {taxesFiscales.map((taxe) => (
                      <SelectItem key={taxe.id} value={taxe.id}>
                        {taxe.libelle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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

              <div className="space-y-2">
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Label className="cursor-help text-[11px] font-normal text-muted-foreground">Net</Label>
                    </TooltipTrigger>
                    <TooltipContent>
                      Pris en compte dans le net payé
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <div className="flex h-10 items-center justify-center">
                  <Checkbox
                    checked={item.impacteNetPaye ?? true}
                    onCheckedChange={(checked) => updateLine(item.id, { impacteNetPaye: checked === true })}
                    className="h-3.5 w-3.5 border-muted-foreground/40"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(item.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {taxeSelectionnee ? (
                <div className="text-xs text-muted-foreground md:col-span-7">
                  {taxeSelectionnee.tauxDefaut !== undefined ? `Taux suggéré : ${taxeSelectionnee.tauxDefaut}%` : null}
                  {taxeSelectionnee.tauxDefaut !== undefined && taxeSelectionnee.montantFixeDefaut !== undefined ? ' · ' : null}
                  {taxeSelectionnee.montantFixeDefaut !== undefined ? `Montant suggéré : ${taxeSelectionnee.montantFixeDefaut}` : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};
