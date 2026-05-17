import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import { useAuth } from '@/contexts/AuthContext';
import { Scenario, TypeScenario } from '@/types/prevision.types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const scenarioSchema = z.object({
  code: z.string().min(1, 'Code requis'),
  nom: z.string().min(1, 'Nom requis'),
  description: z.string().optional(),
  typeScenario: z.enum(['optimiste', 'pessimiste', 'realiste', 'personnalise']),
  anneeReference: z.coerce.number().min(2020).max(2050),
  exerciceReferenceId: z.string().optional(),
});

export type ScenarioFormValues = z.infer<typeof scenarioSchema>;

interface ScenarioFormProps {
  scenario?: Scenario | null;
  onSubmit: (data: Omit<Scenario, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void> | void;
  onCancel: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
  submitLabel?: string;
}

export function ScenarioForm({
  scenario,
  onSubmit,
  onCancel,
  onDirtyChange,
  submitLabel = 'Créer le scénario',
}: ScenarioFormProps) {
  const { currentClient } = useClient();
  const { exercices } = useExercice();
  const { user } = useAuth();

  const defaultValues = useMemo<ScenarioFormValues>(
    () => ({
      code: scenario?.code || '',
      nom: scenario?.nom || '',
      description: scenario?.description || '',
      typeScenario: scenario?.typeScenario || 'realiste',
      anneeReference: scenario?.anneeReference || new Date().getFullYear(),
      exerciceReferenceId: scenario?.exerciceReferenceId || '',
    }),
    [scenario]
  );

  const form = useForm<ScenarioFormValues>({
    resolver: zodResolver(scenarioSchema),
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  useEffect(() => {
    onDirtyChange?.(form.formState.isDirty);
  }, [form.formState.isDirty, onDirtyChange]);

  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  const handleSubmit = async (values: ScenarioFormValues) => {
    if (!currentClient) return;

    await onSubmit({
      code: values.code,
      nom: values.nom,
      description: values.description || undefined,
      typeScenario: values.typeScenario as TypeScenario,
      anneeReference: values.anneeReference,
      exerciceReferenceId: values.exerciceReferenceId || undefined,
      clientId: currentClient.id,
      statut: scenario?.statut || 'brouillon',
      createdBy: user?.id,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: SCEN-2025-OPT" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="typeScenario"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de scénario *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="optimiste">Optimiste</SelectItem>
                      <SelectItem value="realiste">Réaliste</SelectItem>
                      <SelectItem value="pessimiste">Pessimiste</SelectItem>
                      <SelectItem value="personnalise">Personnalisé</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="nom"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom du scénario *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ex: Projection pluriannuelle 2025-2027" />
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
                  <Textarea {...field} value={field.value || ''} rows={3} placeholder="Décrivez les hypothèses du scénario..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="anneeReference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Année de référence *</FormLabel>
                  <FormControl>
                    <Input type="number" min={2020} max={2050} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="exerciceReferenceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Exercice de référence</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un exercice" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {exercices.map((exercice) => (
                        <SelectItem key={exercice.id} value={exercice.id}>
                          {exercice.code} - {exercice.libelle}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
