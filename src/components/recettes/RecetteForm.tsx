import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useComptesTresorerie } from '@/hooks/useComptesTresorerie';
import type { Recette, RecetteFormData } from '@/types/recette.types';

export const recetteSchema = z.object({
  dateRecette: z.string().min(1, 'Date requise'),
  montant: z.coerce.number().positive('Montant requis'),
  compteDestinationId: z.string().min(1, 'Compte requis'),
  sourceRecette: z.string().min(1, 'Source requise'),
  categorie: z.string().optional(),
  beneficiaire: z.string().optional(),
  reference: z.string().optional(),
  libelle: z.string().min(1, 'Libellé requis'),
  observations: z.string().optional(),
});

const defaultValues: RecetteFormData = {
  dateRecette: new Date().toISOString().split('T')[0],
  montant: 0,
  compteDestinationId: '',
  sourceRecette: '',
  categorie: '',
  beneficiaire: '',
  reference: '',
  libelle: '',
  observations: '',
};

const getInitialValues = (recette?: Recette | null): RecetteFormData =>
  recette
    ? {
        dateRecette: recette.dateRecette,
        montant: recette.montant,
        compteDestinationId: recette.compteDestinationId,
        sourceRecette: recette.sourceRecette,
        categorie: recette.categorie || '',
        beneficiaire: recette.beneficiaire || '',
        reference: recette.reference || '',
        libelle: recette.libelle,
        observations: recette.observations || '',
      }
    : defaultValues;

interface RecetteFormProps {
  recette?: Recette | null;
  onSubmit: (data: RecetteFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
}

export const RecetteForm = ({ recette, onSubmit, onCancel, submitLabel }: RecetteFormProps) => {
  const { comptesActifs, isLoading: loadingComptes } = useComptesTresorerie();
  const form = useForm<RecetteFormData>({
    resolver: zodResolver(recetteSchema),
    defaultValues,
  });

  useEffect(() => {
    form.reset(getInitialValues(recette));
  }, [recette, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField control={form.control} name="dateRecette" render={({ field }) => (
              <FormItem><FormLabel>Date de recette</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="montant" render={({ field }) => (
              <FormItem><FormLabel>Montant</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>

          <FormField control={form.control} name="compteDestinationId" render={({ field }) => (
            <FormItem>
              <FormLabel>Compte de destination</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={loadingComptes}>
                <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner un compte" /></SelectTrigger></FormControl>
                <SelectContent>
                  {comptesActifs.map((compte) => (
                    <SelectItem key={compte.id} value={compte.id}>
                      {compte.code} - {compte.libelle} ({compte.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <div className="grid gap-4 md:grid-cols-2">
            <FormField control={form.control} name="sourceRecette" render={({ field }) => (
              <FormItem><FormLabel>Source de recette</FormLabel><FormControl><Input placeholder="Ex: Subvention, Vente..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="categorie" render={({ field }) => (
              <FormItem><FormLabel>Catégorie</FormLabel><FormControl><Input placeholder="Catégorie..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField control={form.control} name="beneficiaire" render={({ field }) => (
              <FormItem><FormLabel>Bénéficiaire</FormLabel><FormControl><Input placeholder="Nom du bénéficiaire..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="reference" render={({ field }) => (
              <FormItem><FormLabel>Référence</FormLabel><FormControl><Input placeholder="Référence externe..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>

          <FormField control={form.control} name="libelle" render={({ field }) => (
            <FormItem><FormLabel>Libellé</FormLabel><FormControl><Input placeholder="Description de la recette..." {...field} /></FormControl><FormMessage /></FormItem>
          )} />

          <FormField control={form.control} name="observations" render={({ field }) => (
            <FormItem><FormLabel>Observations</FormLabel><FormControl><Textarea placeholder="Observations..." rows={3} {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>{submitLabel}</Button>
        </div>
      </form>
    </Form>
  );
};
