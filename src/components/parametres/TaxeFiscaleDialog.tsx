import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Compte } from '@/types/compte.types';
import type { CreateTaxeFiscaleInput, TaxeFiscale, UpdateTaxeFiscaleInput } from '@/types/fiscalite.types';
import type { VentilationNature, VentilationSens } from '@/types/financial.types';
import { VENTILATION_NATURE_LABELS, VENTILATION_SENS_LABELS } from '@/lib/financial-utils';

const taxeFiscaleSchema = z.object({
  code: z.string().min(1, 'Le code est requis').max(50, 'Maximum 50 caractères'),
  libelle: z.string().min(1, 'Le libellé est requis').max(200, 'Maximum 200 caractères'),
  description: z.string().max(500, 'Maximum 500 caractères').optional(),
  nature: z.enum(['taxe', 'retenue', 'redevance', 'frais', 'autre']),
  sensDefaut: z.enum(['ajout', 'retrait']),
  tauxDefaut: z.number().min(0, 'Doit être positif').optional(),
  montantFixeDefaut: z.number().min(0, 'Doit être positif').optional(),
  compteComptableId: z.string().optional(),
  ordre: z.number().int().min(0, 'Doit être positif'),
  actif: z.boolean(),
  dateDebutValidite: z.string().optional(),
  dateFinValidite: z.string().optional(),
});

type TaxeFiscaleFormData = z.infer<typeof taxeFiscaleSchema>;

interface TaxeFiscaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateTaxeFiscaleInput | UpdateTaxeFiscaleInput) => Promise<void>;
  taxeFiscale?: TaxeFiscale;
  comptes: Compte[];
}

export const TaxeFiscaleDialog = ({
  open,
  onOpenChange,
  onSubmit,
  taxeFiscale,
  comptes,
}: TaxeFiscaleDialogProps) => {
  const comptesOrdonnes = useMemo(
    () => [...comptes].sort((a, b) => `${a.numero} ${a.libelle}`.localeCompare(`${b.numero} ${b.libelle}`, 'fr')),
    [comptes]
  );

  const form = useForm<TaxeFiscaleFormData>({
    resolver: zodResolver(taxeFiscaleSchema),
    defaultValues: {
      code: taxeFiscale?.code || '',
      libelle: taxeFiscale?.libelle || '',
      description: taxeFiscale?.description || '',
      nature: taxeFiscale?.nature || 'taxe',
      sensDefaut: taxeFiscale?.sensDefaut || 'ajout',
      tauxDefaut: taxeFiscale?.tauxDefaut,
      montantFixeDefaut: taxeFiscale?.montantFixeDefaut,
      compteComptableId: taxeFiscale?.compteComptableId || 'none',
      ordre: taxeFiscale?.ordre || 0,
      actif: taxeFiscale?.actif ?? true,
      dateDebutValidite: taxeFiscale?.dateDebutValidite || '',
      dateFinValidite: taxeFiscale?.dateFinValidite || '',
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      code: taxeFiscale?.code || '',
      libelle: taxeFiscale?.libelle || '',
      description: taxeFiscale?.description || '',
      nature: taxeFiscale?.nature || 'taxe',
      sensDefaut: taxeFiscale?.sensDefaut || 'ajout',
      tauxDefaut: taxeFiscale?.tauxDefaut,
      montantFixeDefaut: taxeFiscale?.montantFixeDefaut,
      compteComptableId: taxeFiscale?.compteComptableId || 'none',
      ordre: taxeFiscale?.ordre || 0,
      actif: taxeFiscale?.actif ?? true,
      dateDebutValidite: taxeFiscale?.dateDebutValidite || '',
      dateFinValidite: taxeFiscale?.dateFinValidite || '',
    });
  }, [open, taxeFiscale, form]);

  const handleSubmit = async (data: TaxeFiscaleFormData) => {
    await onSubmit({
      code: data.code,
      libelle: data.libelle,
      description: data.description || undefined,
      nature: data.nature as VentilationNature,
      sensDefaut: data.sensDefaut as VentilationSens,
      tauxDefaut: data.tauxDefaut,
      montantFixeDefaut: data.montantFixeDefaut,
      compteComptableId: data.compteComptableId && data.compteComptableId !== 'none' ? data.compteComptableId : undefined,
      ordre: data.ordre,
      actif: data.actif,
      dateDebutValidite: data.dateDebutValidite || undefined,
      dateFinValidite: data.dateFinValidite || undefined,
    });
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{taxeFiscale ? 'Modifier' : 'Nouvelle'} taxe fiscale</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem>
                  <FormLabel>Code *</FormLabel>
                  <FormControl><Input {...field} placeholder="Ex: TVA_1925" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="ordre" render={({ field }) => (
                <FormItem>
                  <FormLabel>Ordre</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} onChange={(event) => field.onChange(parseInt(event.target.value, 10) || 0)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="libelle" render={({ field }) => (
              <FormItem>
                <FormLabel>Libellé *</FormLabel>
                <FormControl><Input {...field} placeholder="Ex: TVA 19,25%" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="nature" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nature *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {Object.entries(VENTILATION_NATURE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="sensDefaut" render={({ field }) => (
                <FormItem>
                  <FormLabel>Sens par défaut *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {Object.entries(VENTILATION_SENS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="tauxDefaut" render={({ field }) => (
                <FormItem>
                  <FormLabel>Taux par défaut (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.0001"
                      value={field.value ?? ''}
                      onChange={(event) => field.onChange(event.target.value === '' ? undefined : Number(event.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Suggestion uniquement. La transaction garde la valeur réelle saisie.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="montantFixeDefaut" render={({ field }) => (
                <FormItem>
                  <FormLabel>Montant fixe par défaut</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      value={field.value ?? ''}
                      onChange={(event) => field.onChange(event.target.value === '' ? undefined : Number(event.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="compteComptableId" render={({ field }) => (
              <FormItem>
                <FormLabel>Compte comptable</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || 'none'}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner un compte" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="none">Aucun compte dédié</SelectItem>
                    {comptesOrdonnes.map((compte) => (
                      <SelectItem key={compte.id} value={compte.id}>
                        {compte.numero} - {compte.libelle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>Permet plus tard de lier directement cette taxe aux écritures comptables.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="dateDebutValidite" render={({ field }) => (
                <FormItem>
                  <FormLabel>Début de validité</FormLabel>
                  <FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="dateFinValidite" render={({ field }) => (
                <FormItem>
                  <FormLabel>Fin de validité</FormLabel>
                  <FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Textarea {...field} value={field.value || ''} rows={3} className="resize-none" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="actif" render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Actif</FormLabel>
                  <FormDescription>Les taxes inactives ne sont plus proposées dans les pièces.</FormDescription>
                </div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              </FormItem>
            )} />

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
              <Button type="submit">{taxeFiscale ? 'Mettre à jour' : 'Créer'}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
