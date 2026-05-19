import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Structure } from '@/types/structure.types';
import { useReferentiels } from '@/hooks/useReferentiels';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SinglePageFormFooter } from '@/components/shared/SinglePageFormFooter';

export const structureSchema = z.object({
  code: z.string().min(1, 'Le code est requis').max(20, 'Maximum 20 caractères'),
  nom: z.string().min(3, 'Le nom doit contenir au moins 3 caractères').max(100, 'Maximum 100 caractères'),
  type: z.string().min(1, 'Le type est requis'),
  responsable: z.string().max(100).optional(),
  statut: z.string().min(1, 'Le statut est requis'),
});

export type StructureFormData = z.infer<typeof structureSchema>;

interface StructureFormProps {
  structure?: Structure;
  onSubmit: (data: StructureFormData) => Promise<void>;
  onCancel: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

export function StructureForm({ structure, onSubmit, onCancel, onDirtyChange }: StructureFormProps) {
  const { data: structureTypes = [], isLoading: loadingTypes } = useReferentiels('structure_type');
  const { data: statuts = [], isLoading: loadingStatuts } = useReferentiels('statut_general');

  const form = useForm<StructureFormData>({
    resolver: zodResolver(structureSchema),
    defaultValues: {
      code: structure?.code || '',
      nom: structure?.nom || '',
      type: structure?.type || 'service',
      responsable: structure?.responsable || '',
      statut: structure?.statut || 'actif',
    },
  });

  useEffect(() => {
    form.reset({
      code: structure?.code || '',
      nom: structure?.nom || '',
      type: structure?.type || 'service',
      responsable: structure?.responsable || '',
      statut: structure?.statut || 'actif',
    });
  }, [structure, form]);

  useEffect(() => {
    onDirtyChange?.(form.formState.isDirty);
  }, [form.formState.isDirty, onDirtyChange]);

  useEffect(() => {
    return () => onDirtyChange?.(false);
  }, [onDirtyChange]);

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Code *</FormLabel>
                <FormControl>
                  <Input placeholder="DIR-01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {loadingTypes ? (
                      <SelectItem value="loading" disabled>Chargement...</SelectItem>
                    ) : structureTypes.length === 0 ? (
                      <SelectItem value="empty" disabled>Aucun type disponible</SelectItem>
                    ) : (
                      structureTypes.map((type) => (
                        <SelectItem key={type.id} value={type.code}>
                          {type.libelle}
                        </SelectItem>
                      ))
                    )}
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
              <FormLabel>Nom *</FormLabel>
              <FormControl>
                <Input placeholder="Direction des Ressources Humaines" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="responsable"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Responsable</FormLabel>
              <FormControl>
                <Input placeholder="Nom du responsable" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="statut"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Statut</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {loadingStatuts ? (
                    <SelectItem value="loading" disabled>Chargement...</SelectItem>
                  ) : statuts.length === 0 ? (
                    <SelectItem value="empty" disabled>Aucun statut disponible</SelectItem>
                  ) : (
                    statuts.map((statut) => (
                      <SelectItem key={statut.id} value={statut.code}>
                        {statut.libelle}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <SinglePageFormFooter
          mode={structure ? 'edit' : 'create'}
          onCancel={onCancel}
          isSubmitting={form.formState.isSubmitting}
          className="gap-2 pt-4"
        />
      </form>
    </Form>
  );
}
