import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useComptesTresorerie } from '@/hooks/useComptesTresorerie';
import type { RecetteFormData } from '@/types/recette.types';
import { Loader2 } from 'lucide-react';

const recetteSchema = z.object({
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

interface RecetteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: RecetteFormData) => Promise<void>;
  initialData?: Partial<RecetteFormData>;
  title?: string;
}

export const RecetteDialog = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  title = 'Nouvelle Recette',
}: RecetteDialogProps) => {
  const { comptesActifs, isLoading: loadingComptes } = useComptesTresorerie();
  
  const form = useForm<RecetteFormData>({
    resolver: zodResolver(recetteSchema),
    defaultValues: {
      dateRecette: initialData?.dateRecette || new Date().toISOString().split('T')[0],
      montant: initialData?.montant || 0,
      compteDestinationId: initialData?.compteDestinationId || '',
      sourceRecette: initialData?.sourceRecette || '',
      categorie: initialData?.categorie || '',
      beneficiaire: initialData?.beneficiaire || '',
      reference: initialData?.reference || '',
      libelle: initialData?.libelle || '',
      observations: initialData?.observations || '',
    },
  });

  const handleSubmit = async (data: RecetteFormData) => {
    await onSubmit(data);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dateRecette"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de recette</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="montant"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="compteDestinationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Compte de destination</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={loadingComptes}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un compte" />
                      </SelectTrigger>
                    </FormControl>
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
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sourceRecette"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source de recette</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Subvention, Vente..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categorie"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catégorie (optionnel)</FormLabel>
                    <FormControl>
                      <Input placeholder="Catégorie..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="beneficiaire"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bénéficiaire (optionnel)</FormLabel>
                    <FormControl>
                      <Input placeholder="Nom du bénéficiaire..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Référence (optionnel)</FormLabel>
                    <FormControl>
                      <Input placeholder="Référence externe..." {...field} />
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
                  <FormLabel>Libellé</FormLabel>
                  <FormControl>
                    <Input placeholder="Description de la recette..." {...field} />
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
                  <FormLabel>Observations (optionnel)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Observations..." rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
