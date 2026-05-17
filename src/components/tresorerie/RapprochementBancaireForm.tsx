import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useComptesTresorerie } from '@/hooks/useComptesTresorerie';
import type { RapprochementBancaireFormData } from '@/types/rapprochement-bancaire.types';

const rapprochementSchema = z.object({
  compteId: z.string().min(1, 'Compte requis'),
  dateDebut: z.string().min(1, 'Date début requise'),
  dateFin: z.string().min(1, 'Date fin requise'),
  soldeReleve: z.coerce.number(),
  observations: z.string().optional(),
});

interface RapprochementBancaireFormProps {
  onSubmit: (data: RapprochementBancaireFormData) => Promise<void>;
  onCancel: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
  submitLabel?: string;
}

const defaultValues: RapprochementBancaireFormData = {
  compteId: '',
  dateDebut: '',
  dateFin: '',
  soldeReleve: 0,
  observations: '',
};

export function RapprochementBancaireForm({
  onSubmit,
  onCancel,
  onDirtyChange,
  submitLabel = 'Créer le rapprochement',
}: RapprochementBancaireFormProps) {
  const { comptes } = useComptesTresorerie();
  const comptesBancaires = useMemo(() => comptes.filter((compte) => compte.type === 'banque'), [comptes]);

  const form = useForm<RapprochementBancaireFormData>({
    resolver: zodResolver(rapprochementSchema),
    defaultValues,
  });

  useEffect(() => {
    onDirtyChange?.(form.formState.isDirty);
  }, [form.formState.isDirty, onDirtyChange]);

  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <FormField
            control={form.control}
            name="compteId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Compte</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un compte" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {comptesBancaires.map((compte) => (
                      <SelectItem key={compte.id} value={compte.id}>
                        {compte.code} - {compte.libelle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="dateDebut"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date début</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dateFin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date fin</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="soldeReleve"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Solde relevé</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="observations"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Observations</FormLabel>
                <FormControl>
                  <Textarea {...field} value={field.value || ''} className="min-h-[96px]" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
