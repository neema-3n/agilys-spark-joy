import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Calendar } from 'lucide-react';
import { Exercice } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const exerciceSchema = z.object({
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
  statut: z.enum(['ouvert', 'cloture'])
}).refine(data => new Date(data.dateFin) > new Date(data.dateDebut), {
  message: 'La date de fin doit être après la date de début',
  path: ['dateFin']
}).refine(data => {
  const debut = new Date(data.dateDebut);
  const fin = new Date(data.dateFin);
  const diffMonths = (fin.getFullYear() - debut.getFullYear()) * 12 + (fin.getMonth() - debut.getMonth());
  return diffMonths >= 1 && diffMonths <= 36;
}, {
  message: 'La durée doit être entre 1 et 36 mois',
  path: ['dateFin']
});

type ExerciceFormValues = z.infer<typeof exerciceSchema>;

interface ExerciceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ExerciceFormValues) => Promise<void>;
  exercice?: Exercice;
  title: string;
  description: string;
}

export function ExerciceDialog({
  open,
  onOpenChange,
  onSubmit,
  exercice,
  title,
  description
}: ExerciceDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ExerciceFormValues>({
    resolver: zodResolver(exerciceSchema),
    defaultValues: {
      libelle: exercice?.libelle || '',
      code: exercice?.code || '',
      dateDebut: exercice?.dateDebut || '',
      dateFin: exercice?.dateFin || '',
      statut: exercice?.statut || 'ouvert'
    }
  });

  useEffect(() => {
    if (exercice) {
      form.reset({
        libelle: exercice.libelle,
        code: exercice.code || '',
        dateDebut: exercice.dateDebut,
        dateFin: exercice.dateFin,
        statut: exercice.statut
      });
    } else {
      form.reset({
        libelle: '',
        code: '',
        dateDebut: '',
        dateFin: '',
        statut: 'ouvert'
      });
    }
  }, [exercice, form, open]);

  const handleSubmit = async (data: ExerciceFormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      onOpenChange(false);
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Templates de périodes rapides
  const applyTemplate = (template: 'civil' | 'fiscal' | 'custom') => {
    const currentYear = new Date().getFullYear();
    
    switch (template) {
      case 'civil':
        form.setValue('dateDebut', `${currentYear}-01-01`);
        form.setValue('dateFin', `${currentYear}-12-31`);
        form.setValue('libelle', `Exercice ${currentYear}`);
        form.setValue('code', `EX${currentYear}`);
        break;
      case 'fiscal':
        form.setValue('dateDebut', `${currentYear}-07-01`);
        form.setValue('dateFin', `${currentYear + 1}-06-30`);
        form.setValue('libelle', `Exercice Fiscal ${currentYear}-${currentYear + 1}`);
        form.setValue('code', `FY${currentYear}-${String(currentYear + 1).slice(2)}`);
        break;
      case 'custom':
        form.setValue('dateDebut', '');
        form.setValue('dateFin', '');
        form.setValue('libelle', '');
        form.setValue('code', '');
        break;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-1 min-h-0">
          <Form {...form}>
            <form className="space-y-6 py-4">
            {/* Templates rapides - seulement pour création */}
            {!exercice && (
              <div className="space-y-2">
                <FormLabel>Modèles rapides</FormLabel>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyTemplate('civil')}
                    className="flex-1"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Année civile
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyTemplate('fiscal')}
                    className="flex-1"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Année fiscale (juil.)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyTemplate('custom')}
                    className="flex-1"
                  >
                    Personnalisé
                  </Button>
                </div>
                <FormDescription>
                  Utilisez un modèle ou saisissez manuellement les dates
                </FormDescription>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="libelle"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Libellé *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="ex: Exercice 2024, Budget Transition 2024-2025" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Nom descriptif de l'exercice budgétaire
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Code (optionnel)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="ex: EX2024, FY2024-25" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Identifiant court (majuscules, chiffres, tirets)
                    </FormDescription>
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
                  <FormItem className="col-span-2">
                    <FormLabel>Statut</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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

          </form>
        </Form>
        </ScrollArea>
        
        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button type="button" disabled={isSubmitting} onClick={form.handleSubmit(handleSubmit)}>
            {isSubmitting ? 'Enregistrement...' : exercice ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
