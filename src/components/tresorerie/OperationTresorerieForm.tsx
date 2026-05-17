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
import type { OperationTresorerie, OperationTresorerieFormData } from '@/types/operation-tresorerie.types';

export const operationSchema = z.object({
  dateOperation: z.string().min(1, 'Date requise'),
  typeOperation: z.enum(['encaissement', 'decaissement', 'transfert'] as const),
  compteId: z.string().min(1, 'Compte requis'),
  compteContrepartieId: z.string().optional(),
  montant: z.coerce.number().positive('Montant requis'),
  modePaiement: z.string().optional(),
  referenceBancaire: z.string().optional(),
  libelle: z.string().min(1, 'Libellé requis'),
  categorie: z.string().optional(),
  observations: z.string().optional(),
});

const defaultValues: OperationTresorerieFormData = {
  dateOperation: new Date().toISOString().split('T')[0],
  typeOperation: 'encaissement',
  compteId: '',
  compteContrepartieId: '',
  montant: 0,
  modePaiement: '',
  referenceBancaire: '',
  libelle: '',
  categorie: '',
  observations: '',
};

interface OperationTresorerieFormProps {
  operation?: OperationTresorerie | null;
  onSubmit: (data: OperationTresorerieFormData) => Promise<void>;
  onCancel: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
  submitLabel: string;
}

export const OperationTresorerieForm = ({ operation, onSubmit, onCancel, onDirtyChange, submitLabel }: OperationTresorerieFormProps) => {
  const { comptesActifs, isLoading: loadingComptes } = useComptesTresorerie();
  const form = useForm<OperationTresorerieFormData>({
    resolver: zodResolver(operationSchema),
    defaultValues,
  });

  useEffect(() => {
    if (!operation) {
      form.reset(defaultValues);
      return;
    }

    form.reset({
      dateOperation: operation.dateOperation,
      typeOperation: operation.typeOperation,
      compteId: operation.compteId,
      compteContrepartieId: operation.compteContrepartieId || '',
      montant: operation.montant,
      modePaiement: operation.modePaiement || '',
      referenceBancaire: operation.referenceBancaire || '',
      libelle: operation.libelle,
      categorie: operation.categorie || '',
      observations: operation.observations || '',
    });
  }, [operation, form]);

  useEffect(() => {
    onDirtyChange?.(form.formState.isDirty);
  }, [form.formState.isDirty, onDirtyChange]);

  useEffect(() => {
    return () => onDirtyChange?.(false);
  }, [onDirtyChange]);

  const typeOperation = form.watch('typeOperation');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField control={form.control} name="dateOperation" render={({ field }) => (
              <FormItem><FormLabel>Date d'opération</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="typeOperation" render={({ field }) => (
              <FormItem>
                <FormLabel>Type d'opération</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="encaissement">Encaissement</SelectItem>
                    <SelectItem value="decaissement">Décaissement</SelectItem>
                    <SelectItem value="transfert">Transfert</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <FormField control={form.control} name="compteId" render={({ field }) => (
            <FormItem>
              <FormLabel>{typeOperation === 'transfert' ? 'Compte source' : 'Compte'}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={loadingComptes}>
                <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner un compte" /></SelectTrigger></FormControl>
                <SelectContent>
                  {comptesActifs.map((compte) => (
                    <SelectItem key={compte.id} value={compte.id}>
                      {compte.code} - {compte.libelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          {typeOperation === 'transfert' && (
            <FormField control={form.control} name="compteContrepartieId" render={({ field }) => (
              <FormItem>
                <FormLabel>Compte destination</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={loadingComptes}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner un compte" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {comptesActifs.filter((compte) => compte.id !== form.watch('compteId')).map((compte) => (
                      <SelectItem key={compte.id} value={compte.id}>
                        {compte.code} - {compte.libelle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          )}

          <FormField control={form.control} name="montant" render={({ field }) => (
            <FormItem><FormLabel>Montant</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
          )} />

          <div className="grid gap-4 md:grid-cols-2">
            <FormField control={form.control} name="modePaiement" render={({ field }) => (
              <FormItem><FormLabel>Mode de paiement</FormLabel><FormControl><Input placeholder="Virement, Chèque, Espèces..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="referenceBancaire" render={({ field }) => (
              <FormItem><FormLabel>Référence bancaire</FormLabel><FormControl><Input placeholder="N° chèque, virement..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>

          <FormField control={form.control} name="categorie" render={({ field }) => (
            <FormItem><FormLabel>Catégorie</FormLabel><FormControl><Input placeholder="Catégorie..." {...field} /></FormControl><FormMessage /></FormItem>
          )} />

          <FormField control={form.control} name="libelle" render={({ field }) => (
            <FormItem><FormLabel>Libellé</FormLabel><FormControl><Input placeholder="Description de l'opération..." {...field} /></FormControl><FormMessage /></FormItem>
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
