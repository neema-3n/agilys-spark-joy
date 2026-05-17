import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Compte } from '@/types/compte.types';
import type { CreateNatureCompteInput, NatureCompte, UpdateNatureCompteInput } from '@/types/nature-compte.types';

const natureCompteSchema = z.object({
  code: z.string().min(1, 'Le code est requis').max(50, 'Maximum 50 caracteres'),
  libelle: z.string().min(1, 'Le libelle est requis').max(200, 'Maximum 200 caracteres'),
  description: z.string().max(500, 'Maximum 500 caracteres').optional(),
  compteDefautId: z.string().optional(),
  ordre: z.number().int().min(0, 'Doit etre positif'),
  actif: z.boolean(),
});

type NatureCompteFormData = z.infer<typeof natureCompteSchema>;

interface NatureCompteFormProps {
  natureCompte?: NatureCompte;
  comptesCharge: Compte[];
  onSubmit: (data: CreateNatureCompteInput | UpdateNatureCompteInput) => Promise<void>;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export function NatureCompteForm({
  natureCompte,
  comptesCharge,
  onSubmit,
  onCancel,
  onDirtyChange,
}: NatureCompteFormProps) {
  const comptesOrdonnes = useMemo(
    () => [...comptesCharge].sort((a, b) => `${a.numero} ${a.libelle}`.localeCompare(`${b.numero} ${b.libelle}`, 'fr')),
    [comptesCharge],
  );

  const form = useForm<NatureCompteFormData>({
    resolver: zodResolver(natureCompteSchema),
    defaultValues: {
      code: natureCompte?.code || '',
      libelle: natureCompte?.libelle || '',
      description: natureCompte?.description || '',
      compteDefautId: natureCompte?.compteDefautId || 'none',
      ordre: natureCompte?.ordre || 0,
      actif: natureCompte?.actif ?? true,
    },
  });

  useEffect(() => {
    form.reset({
      code: natureCompte?.code || '',
      libelle: natureCompte?.libelle || '',
      description: natureCompte?.description || '',
      compteDefautId: natureCompte?.compteDefautId || 'none',
      ordre: natureCompte?.ordre || 0,
      actif: natureCompte?.actif ?? true,
    });
  }, [natureCompte, form]);

  useEffect(() => {
    onDirtyChange?.(form.formState.isDirty);
  }, [form.formState.isDirty, onDirtyChange]);

  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  const handleSubmit = async (data: NatureCompteFormData) => {
    await onSubmit({
      code: data.code,
      libelle: data.libelle,
      description: data.description || undefined,
      compteDefautId: data.compteDefautId && data.compteDefautId !== 'none' ? data.compteDefautId : undefined,
      ordre: data.ordre,
      actif: data.actif,
    });
    form.reset(data);
  };

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Code *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ex: FORMATION" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="ordre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ordre</FormLabel>
                <FormControl>
                  <Input type="number" {...field} onChange={(event) => field.onChange(parseInt(event.target.value, 10) || 0)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="libelle"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Libelle *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ex: Formation" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="compteDefautId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Compte par defaut</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || 'none'}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selectionner un compte de charge" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">Aucun compte par defaut</SelectItem>
                  {comptesOrdonnes.map((compte) => (
                    <SelectItem key={compte.id} value={compte.id}>
                      {compte.numero} - {compte.libelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>Compte propose automatiquement en mode standard.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value || ''} rows={3} className="resize-none" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="actif"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Actif</FormLabel>
                <FormDescription>Les natures inactives n'apparaissent plus dans les formulaires.</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="submit">
            {natureCompte ? 'Mettre a jour' : 'Creer'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
