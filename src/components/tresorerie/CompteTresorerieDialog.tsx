import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CompteTresorerieFormData } from '@/types/compte-tresorerie.types';
import { Loader2 } from 'lucide-react';

const compteSchema = z.object({
  code: z.string().min(1, 'Code requis'),
  libelle: z.string().min(1, 'Libellé requis'),
  type: z.enum(['banque', 'caisse'] as const, { required_error: 'Type requis' }),
  banque: z.string().optional(),
  numeroCompte: z.string().optional(),
  devise: z.string().optional(),
  soldeInitial: z.coerce.number(),
  dateOuverture: z.string().min(1, 'Date requise'),
  observations: z.string().optional(),
});

interface CompteTresorerieDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CompteTresorerieFormData) => Promise<void>;
  initialData?: Partial<CompteTresorerieFormData>;
  title?: string;
}

export const CompteTresorerieDialog = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  title = 'Nouveau Compte de Trésorerie',
}: CompteTresorerieDialogProps) => {
  const form = useForm<CompteTresorerieFormData>({
    resolver: zodResolver(compteSchema),
    defaultValues: {
      code: initialData?.code || '',
      libelle: initialData?.libelle || '',
      type: initialData?.type || 'banque',
      banque: initialData?.banque || '',
      numeroCompte: initialData?.numeroCompte || '',
      devise: initialData?.devise || 'XOF',
      soldeInitial: initialData?.soldeInitial || 0,
      dateOuverture: initialData?.dateOuverture || new Date().toISOString().split('T')[0],
      observations: initialData?.observations || '',
    },
  });

  const typeCompte = form.watch('type');

  const handleSubmit = async (data: CompteTresorerieFormData) => {
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
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: BQ001, CA001" {...field} />
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
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="banque">Banque</SelectItem>
                        <SelectItem value="caisse">Caisse</SelectItem>
                      </SelectContent>
                    </Select>
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
                    <Input placeholder="Nom du compte" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {typeCompte === 'banque' && (
              <>
                <FormField
                  control={form.control}
                  name="banque"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Banque</FormLabel>
                      <FormControl>
                        <Input placeholder="Nom de la banque" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="numeroCompte"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numéro de compte</FormLabel>
                      <FormControl>
                        <Input placeholder="Numéro de compte bancaire" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="devise"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Devise</FormLabel>
                    <FormControl>
                      <Input placeholder="XOF, EUR, USD..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="soldeInitial"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Solde initial</FormLabel>
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
              name="dateOuverture"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date d'ouverture</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
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
