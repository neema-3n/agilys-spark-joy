import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Enveloppe } from '@/types/enveloppe.types';

const enveloppeSchema = z.object({
  code: z.string()
    .min(1, 'Le code est requis')
    .max(20, 'Le code est trop long')
    .regex(/^[A-Z0-9-_]+$/, 'Code: lettres majuscules, chiffres, tirets'),
  nom: z.string()
    .min(3, 'Le nom doit contenir au moins 3 caractères')
    .max(200, 'Le nom est trop long'),
  sourceFinancement: z.string()
    .min(2, 'La source de financement est requise')
    .max(200, 'La source de financement est trop longue'),
  montantAlloue: z.coerce
    .number()
    .min(0, 'Le montant doit être positif'),
  montantConsomme: z.coerce
    .number()
    .min(0, 'Le montant doit être positif')
    .default(0),
  statut: z.enum(['actif', 'cloture']),
}).refine(data => data.montantConsomme <= data.montantAlloue, {
  message: 'Le montant consommé ne peut pas dépasser le montant alloué',
  path: ['montantConsomme'],
});

type EnveloppeFormValues = z.infer<typeof enveloppeSchema>;

interface EnveloppeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: EnveloppeFormValues) => Promise<void>;
  enveloppe?: Enveloppe;
  mode: 'create' | 'edit';
}

export function EnveloppeDialog({
  open,
  onOpenChange,
  onSubmit,
  enveloppe,
  mode,
}: EnveloppeDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async (values: EnveloppeFormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit(values);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting enveloppe:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Nouvelle enveloppe' : 'Modifier l\'enveloppe'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Créer une nouvelle enveloppe de financement'
              : 'Modifier les informations de l\'enveloppe'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ENV-2024-01"
                        {...field}
                        disabled={mode === 'edit'}
                      />
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
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="actif">Actif</SelectItem>
                        <SelectItem value="cloture">Clôturé</SelectItem>
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
                    <Input
                      placeholder="Ex: Financement Banque Mondiale - Projet Éducation"
                      {...field}
                    />
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
                  <FormControl>
                    <Input
                      placeholder="Ex: Banque Mondiale, AFD, Fonds propres..."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Bailleur ou source du financement
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="montantAlloue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant alloué</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
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
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? 'Enregistrement...'
                  : mode === 'create'
                  ? 'Créer'
                  : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
