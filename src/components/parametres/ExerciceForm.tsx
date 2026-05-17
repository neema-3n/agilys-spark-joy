import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Calendar } from 'lucide-react';
import { Exercice } from '@/types';
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

export const exerciceSchema = z.object({
  libelle: z.string()
    .min(3, 'Le libellé doit contenir au moins 3 caractères')
    .max(100, 'Le libellé ne peut pas dépasser 100 caractères'),
  code: z.string()
    .max(20, 'Le code ne peut pas dépasser 20 caractères')
    .regex(/^[A-Z0-9-_]*$/, 'Code: lettres majuscules, chiffres, tirets et underscores uniquement')
    .optional()
    .or(z.literal('')),
  dateDebut: z.string().min(1, 'La date de début est requise'),
  dateFin: z.string().min(1, 'La date de fin est requise'),
  statut: z.enum(['ouvert', 'cloture']),
}).refine(data => new Date(data.dateFin) > new Date(data.dateDebut), {
  message: 'La date de fin doit être après la date de début',
  path: ['dateFin'],
}).refine(data => {
  const debut = new Date(data.dateDebut);
  const fin = new Date(data.dateFin);
  const diffMonths = (fin.getFullYear() - debut.getFullYear()) * 12 + (fin.getMonth() - debut.getMonth());
  return diffMonths >= 1 && diffMonths <= 36;
}, {
  message: 'La durée doit être entre 1 et 36 mois',
  path: ['dateFin'],
});

export type ExerciceFormValues = z.infer<typeof exerciceSchema>;

interface ExerciceFormProps {
  exercice?: Exercice;
  onSubmit: (data: ExerciceFormValues) => Promise<void>;
  onCancel: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

export function ExerciceForm({ exercice, onSubmit, onCancel, onDirtyChange }: ExerciceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ExerciceFormValues>({
    resolver: zodResolver(exerciceSchema),
    defaultValues: {
      libelle: exercice?.libelle || '',
      code: exercice?.code || '',
      dateDebut: exercice?.dateDebut || '',
      dateFin: exercice?.dateFin || '',
      statut: exercice?.statut || 'ouvert',
    },
  });

  useEffect(() => {
    form.reset({
      libelle: exercice?.libelle || '',
      code: exercice?.code || '',
      dateDebut: exercice?.dateDebut || '',
      dateFin: exercice?.dateFin || '',
      statut: exercice?.statut || 'ouvert',
    });
  }, [exercice, form]);

  useEffect(() => {
    onDirtyChange?.(form.formState.isDirty);
  }, [form.formState.isDirty, onDirtyChange]);

  useEffect(() => {
    return () => onDirtyChange?.(false);
  }, [onDirtyChange]);

  const handleSubmit = async (data: ExerciceFormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyTemplate = (template: 'civil' | 'fiscal' | 'custom') => {
    const currentYear = new Date().getFullYear();

    switch (template) {
      case 'civil':
        form.setValue('dateDebut', `${currentYear}-01-01`, { shouldDirty: true });
        form.setValue('dateFin', `${currentYear}-12-31`, { shouldDirty: true });
        form.setValue('libelle', `Exercice ${currentYear}`, { shouldDirty: true });
        form.setValue('code', `EX${currentYear}`, { shouldDirty: true });
        break;
      case 'fiscal':
        form.setValue('dateDebut', `${currentYear}-07-01`, { shouldDirty: true });
        form.setValue('dateFin', `${currentYear + 1}-06-30`, { shouldDirty: true });
        form.setValue('libelle', `Exercice Fiscal ${currentYear}-${currentYear + 1}`, { shouldDirty: true });
        form.setValue('code', `FY${currentYear}-${String(currentYear + 1).slice(2)}`, { shouldDirty: true });
        break;
      case 'custom':
        form.reset({
          libelle: '',
          code: '',
          dateDebut: '',
          dateFin: '',
          statut: 'ouvert',
        });
        break;
    }
  };

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={form.handleSubmit(handleSubmit)}>
        {!exercice && (
          <div className="space-y-2">
            <FormLabel>Modèles rapides</FormLabel>
            <div className="flex flex-col gap-2 md:flex-row">
              <Button type="button" variant="outline" size="sm" onClick={() => applyTemplate('civil')} className="flex-1">
                <Calendar className="mr-2 h-4 w-4" />
                Année civile
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => applyTemplate('fiscal')} className="flex-1">
                <Calendar className="mr-2 h-4 w-4" />
                Année fiscale (juil.)
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => applyTemplate('custom')} className="flex-1">
                Personnalisé
              </Button>
            </div>
            <FormDescription>Utilisez un modèle ou saisissez manuellement les dates.</FormDescription>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="libelle"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Libellé *</FormLabel>
                <FormControl>
                  <Input placeholder="Exercice 2026" {...field} />
                </FormControl>
                <FormDescription>Nom descriptif de l'exercice budgétaire.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Code (optionnel)</FormLabel>
                <FormControl>
                  <Input placeholder="EX2026" {...field} />
                </FormControl>
                <FormDescription>Identifiant court en majuscules.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dateDebut"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date de début *</FormLabel>
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
                <FormLabel>Date de fin *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="statut"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Statut</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un statut" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ouvert">Ouvert</SelectItem>
                    <SelectItem value="cloture">Clôturé</SelectItem>
                  </SelectContent>
                </Select>
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
            {isSubmitting ? 'Enregistrement...' : exercice ? 'Mettre à jour' : 'Créer'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
