import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CreateModeleFiscalInput, ModeleFiscal, TaxeFiscale, UpdateModeleFiscalInput } from '@/types/fiscalite.types';
import { SinglePageFormFooter } from '@/components/shared/SinglePageFormFooter';

const modeleFiscalSchema = z.object({
  code: z.string().min(1, 'Le code est requis').max(50, 'Maximum 50 caracteres'),
  libelle: z.string().min(1, 'Le libelle est requis').max(200, 'Maximum 200 caracteres'),
  description: z.string().max(500, 'Maximum 500 caracteres').optional(),
  ordre: z.number().int().min(0, 'Doit etre positif'),
  actif: z.boolean(),
  lignes: z.array(
    z.object({
      taxeFiscaleId: z.string().min(1, 'La taxe est requise'),
      tauxDefautOverride: z.number().min(0, 'Doit etre positif').optional(),
      montantDefautOverride: z.number().min(0, 'Doit etre positif').optional(),
    }),
  ),
});

type ModeleFiscalFormData = z.infer<typeof modeleFiscalSchema>;

interface ModeleFiscalFormProps {
  modeleFiscal?: ModeleFiscal;
  taxesFiscales: TaxeFiscale[];
  onSubmit: (data: CreateModeleFiscalInput | UpdateModeleFiscalInput) => Promise<void>;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export function ModeleFiscalForm({
  modeleFiscal,
  taxesFiscales,
  onSubmit,
  onCancel,
  onDirtyChange,
}: ModeleFiscalFormProps) {
  const form = useForm<ModeleFiscalFormData>({
    resolver: zodResolver(modeleFiscalSchema),
    defaultValues: {
      code: modeleFiscal?.code || '',
      libelle: modeleFiscal?.libelle || '',
      description: modeleFiscal?.description || '',
      ordre: modeleFiscal?.ordre || 0,
      actif: modeleFiscal?.actif ?? true,
      lignes: modeleFiscal?.lignes.map((ligne) => ({
        taxeFiscaleId: ligne.taxeFiscaleId,
        tauxDefautOverride: ligne.tauxDefautOverride,
        montantDefautOverride: ligne.montantDefautOverride,
      })) || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lignes',
  });

  useEffect(() => {
    form.reset({
      code: modeleFiscal?.code || '',
      libelle: modeleFiscal?.libelle || '',
      description: modeleFiscal?.description || '',
      ordre: modeleFiscal?.ordre || 0,
      actif: modeleFiscal?.actif ?? true,
      lignes: modeleFiscal?.lignes.map((ligne) => ({
        taxeFiscaleId: ligne.taxeFiscaleId,
        tauxDefautOverride: ligne.tauxDefautOverride,
        montantDefautOverride: ligne.montantDefautOverride,
      })) || [],
    });
  }, [modeleFiscal, form]);

  useEffect(() => {
    onDirtyChange?.(form.formState.isDirty);
  }, [form.formState.isDirty, onDirtyChange]);

  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  const handleSubmit = async (data: ModeleFiscalFormData) => {
    await onSubmit({
      code: data.code,
      libelle: data.libelle,
      description: data.description || undefined,
      ordre: data.ordre,
      actif: data.actif,
      lignes: data.lignes.map((ligne, index) => ({
        taxeFiscaleId: ligne.taxeFiscaleId,
        ordre: index,
        tauxDefautOverride: ligne.tauxDefautOverride,
        montantDefautOverride: ligne.montantDefautOverride,
      })),
    });
    form.reset(data);
  };

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField control={form.control} name="code" render={({ field }) => (
            <FormItem>
              <FormLabel>Code *</FormLabel>
              <FormControl><Input {...field} placeholder="Ex: TVA_IR" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="ordre" render={({ field }) => (
            <FormItem>
              <FormLabel>Ordre</FormLabel>
              <FormControl><Input type="number" {...field} onChange={(event) => field.onChange(parseInt(event.target.value, 10) || 0)} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="libelle" render={({ field }) => (
          <FormItem>
            <FormLabel>Libelle *</FormLabel>
            <FormControl><Input {...field} placeholder="Ex: TVA + retenue" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl><Textarea {...field} value={field.value || ''} rows={3} className="resize-none" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="space-y-3 rounded-md border p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <FormLabel>Lignes du modele</FormLabel>
              <FormDescription>Selectionnez les taxes/retenues qui doivent preremplir le bloc 2.</FormDescription>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => append({ taxeFiscaleId: '', tauxDefautOverride: undefined, montantDefautOverride: undefined })}
            >
              <Plus className="mr-2 h-4 w-4" />
              Ajouter une ligne
            </Button>
          </div>

          <div className="space-y-3">
            {fields.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                Aucune ligne dans ce modele.
              </div>
            ) : null}

            {fields.map((field, index) => (
              <div key={field.id} className="grid gap-3 rounded-md border p-3 md:grid-cols-[2fr_1fr_1fr_auto]">
                <FormField control={form.control} name={`lignes.${index}.taxeFiscaleId`} render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground">Taxe fiscale</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selectionner une taxe" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {taxesFiscales.map((taxe) => (
                          <SelectItem key={taxe.id} value={taxe.id}>
                            {taxe.libelle}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name={`lignes.${index}.tauxDefautOverride`} render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground">Taux suggere</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.0001"
                        value={field.value ?? ''}
                        onChange={(event) => field.onChange(event.target.value === '' ? undefined : Number(event.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name={`lignes.${index}.montantDefautOverride`} render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground">Montant suggere</FormLabel>
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

                <div className="flex items-end">
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <FormField control={form.control} name="actif" render={({ field }) => (
          <FormItem className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">Actif</FormLabel>
              <FormDescription>Les modeles inactifs ne sont plus proposes dans les pieces.</FormDescription>
            </div>
            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
          </FormItem>
        )} />

        <SinglePageFormFooter
          mode={modeleFiscal ? 'edit' : 'create'}
          onCancel={onCancel}
          isSubmitting={form.formState.isSubmitting}
          className="gap-2 pt-4"
        />
      </form>
    </Form>
  );
}
