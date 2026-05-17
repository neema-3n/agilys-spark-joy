import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useReferentiels } from '@/hooks/useReferentiels';
import type { Enveloppe } from '@/types/enveloppe.types';

export const enveloppeSchema = z.object({
  code: z.string().min(1, 'Le code est requis').max(20, 'Le code est trop long').regex(/^[A-Z0-9-_]+$/, 'Code: lettres majuscules, chiffres, tirets'),
  nom: z.string().min(3, 'Le nom doit contenir au moins 3 caractères').max(200, 'Le nom est trop long'),
  sourceFinancement: z.string().min(1, 'La source de financement est requise').max(200, 'La source de financement est trop longue'),
  montantAlloue: z.coerce.number().min(0, 'Le montant doit être positif'),
  montantConsomme: z.coerce.number().min(0, 'Le montant doit être positif').default(0),
  statut: z.string().min(1, 'Le statut est requis'),
}).refine(data => data.montantConsomme <= data.montantAlloue, {
  message: 'Le montant consommé ne peut pas dépasser le montant alloué',
  path: ['montantConsomme'],
});

export type EnveloppeFormValues = z.infer<typeof enveloppeSchema>;

interface EnveloppeFormProps {
  enveloppe?: Enveloppe;
  onSubmit: (values: EnveloppeFormValues) => Promise<void>;
  onCancel: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

export function EnveloppeForm({ enveloppe, onSubmit, onCancel, onDirtyChange }: EnveloppeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: sourcesFinancement = [], isLoading: loadingSources } = useReferentiels('source_financement');
  const { data: statuts = [], isLoading: loadingStatuts } = useReferentiels('statut_general');

  const form = useForm<EnveloppeFormValues>({
    resolver: zodResolver(enveloppeSchema),
    defaultValues: {
      code: enveloppe?.code || '',
      nom: enveloppe?.nom || '',
      sourceFinancement: enveloppe?.sourceFinancement || '',
      montantAlloue: enveloppe?.montantAlloue || 0,
      montantConsomme: enveloppe?.montantConsomme || 0,
      statut: enveloppe?.statut || 'actif',
    },
  });

  useEffect(() => {
    form.reset({
      code: enveloppe?.code || '',
      nom: enveloppe?.nom || '',
      sourceFinancement: enveloppe?.sourceFinancement || '',
      montantAlloue: enveloppe?.montantAlloue || 0,
      montantConsomme: enveloppe?.montantConsomme || 0,
      statut: enveloppe?.statut || 'actif',
    });
  }, [enveloppe, form]);

  useEffect(() => {
    onDirtyChange?.(form.formState.isDirty);
  }, [form.formState.isDirty, onDirtyChange]);

  useEffect(() => {
    return () => onDirtyChange?.(false);
  }, [onDirtyChange]);

  const handleSubmit = async (values: EnveloppeFormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Code</FormLabel>
                <FormControl>
                  <Input placeholder="ENV-2026-01" {...field} disabled={!!enveloppe} />
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
                      <SelectValue placeholder="Sélectionner" />
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
        </div>

        <FormField
          control={form.control}
          name="nom"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom de l'enveloppe</FormLabel>
              <FormControl>
                <Input placeholder="Financement Banque Mondiale" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sourceFinancement"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Source de financement</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une source" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {loadingSources ? (
                    <SelectItem value="loading" disabled>Chargement...</SelectItem>
                  ) : sourcesFinancement.length === 0 ? (
                    <SelectItem value="empty" disabled>Aucune source disponible</SelectItem>
                  ) : (
                    sourcesFinancement.map((source) => (
                      <SelectItem key={source.id} value={source.code}>
                        {source.libelle}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormDescription>Bailleur ou source du financement.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="montantAlloue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Montant alloué</FormLabel>
                <FormControl>
                  <Input type="number" step="any" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="montantConsomme"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Montant consommé</FormLabel>
                <FormControl>
                  <Input type="number" step="any" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Enregistrement...' : enveloppe ? 'Enregistrer' : 'Créer'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
