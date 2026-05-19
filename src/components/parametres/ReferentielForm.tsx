import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import type { ParametreReferentiel } from '@/types/referentiel.types';
import { SinglePageFormFooter } from '@/components/shared/SinglePageFormFooter';

export const referentielSchema = z.object({
  code: z.string().min(1, 'Le code est requis').max(50, 'Maximum 50 caracteres'),
  libelle: z.string().min(1, 'Le libelle est requis').max(200, 'Maximum 200 caracteres'),
  description: z.string().max(500, 'Maximum 500 caracteres').optional(),
  ordre: z.number().int().min(0, 'Doit etre positif'),
  actif: z.boolean(),
});

export type ReferentielFormData = z.infer<typeof referentielSchema>;

interface ReferentielFormProps {
  referentiel?: ParametreReferentiel;
  categorieLabel: string;
  onSubmit: (data: ReferentielFormData) => Promise<void>;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export function ReferentielForm({
  referentiel,
  categorieLabel,
  onSubmit,
  onCancel,
  onDirtyChange,
}: ReferentielFormProps) {
  const isSystemValue = !!referentiel && !referentiel.modifiable;

  const form = useForm<ReferentielFormData>({
    resolver: zodResolver(referentielSchema),
    defaultValues: {
      code: referentiel?.code || '',
      libelle: referentiel?.libelle || '',
      description: referentiel?.description || '',
      ordre: referentiel?.ordre || 0,
      actif: referentiel?.actif ?? true,
    },
  });

  useEffect(() => {
    form.reset({
      code: referentiel?.code || '',
      libelle: referentiel?.libelle || '',
      description: referentiel?.description || '',
      ordre: referentiel?.ordre || 0,
      actif: referentiel?.actif ?? true,
    });
  }, [referentiel, form]);

  useEffect(() => {
    onDirtyChange?.(form.formState.isDirty);
  }, [form.formState.isDirty, onDirtyChange]);

  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  const handleSubmit = async (data: ReferentielFormData) => {
    await onSubmit(data);
    form.reset(data);
  };

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="flex items-center gap-2 text-sm font-medium">
          {referentiel ? 'Modifier' : 'Nouveau'} - {categorieLabel}
          {isSystemValue ? <Badge variant="secondary">Systeme</Badge> : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Code *</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: TYPE_01" {...field} disabled={!!referentiel || isSystemValue} />
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
                <FormLabel>Ordre d'affichage</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(event) => field.onChange(parseInt(event.target.value, 10) || 0)}
                    disabled={isSystemValue}
                  />
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
                <Input placeholder="Ex: Type de compte" {...field} disabled={isSystemValue} />
              </FormControl>
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
                <Textarea placeholder="Description optionnelle..." rows={3} className="resize-none" {...field} disabled={isSystemValue} />
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
                <FormDescription>Les elements inactifs n'apparaissent pas dans les listes de selection.</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isSystemValue} />
              </FormControl>
            </FormItem>
          )}
        />

        {isSystemValue ? (
          <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            Cette valeur systeme ne peut pas etre modifiee.
          </div>
        ) : null}

        <SinglePageFormFooter
          mode={referentiel ? 'edit' : 'create'}
          onCancel={onCancel}
          isSubmitting={form.formState.isSubmitting || isSystemValue}
          className="gap-2 pt-4"
        />
      </form>
    </Form>
  );
}
