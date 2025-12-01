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
import type { OperationTresorerieFormData } from '@/types/operation-tresorerie.types';
import { Loader2 } from 'lucide-react';

const operationSchema = z.object({
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

interface OperationTresorerieDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: OperationTresorerieFormData) => Promise<void>;
  title?: string;
}

export const OperationTresorerieDialog = ({
  open,
  onOpenChange,
  onSubmit,
  title = 'Nouvelle Opération de Trésorerie',
}: OperationTresorerieDialogProps) => {
  const { comptesActifs, isLoading: loadingComptes } = useComptesTresorerie();
  
  const form = useForm<OperationTresorerieFormData>({
    resolver: zodResolver(operationSchema),
    defaultValues: {
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
    },
  });

  const typeOperation = form.watch('typeOperation');

  const handleSubmit = async (data: OperationTresorerieFormData) => {
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
                name="dateOperation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date d'opération</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="typeOperation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type d'opération</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="encaissement">Encaissement</SelectItem>
                        <SelectItem value="decaissement">Décaissement</SelectItem>
                        <SelectItem value="transfert">Transfert</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="compteId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {typeOperation === 'transfert' ? 'Compte source' : 'Compte'}
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={loadingComptes}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un compte" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {comptesActifs.map((compte) => (
                        <SelectItem key={compte.id} value={compte.id}>
                          {compte.code} - {compte.libelle} ({formatCurrency(compte.soldeActuel)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {typeOperation === 'transfert' && (
              <FormField
                control={form.control}
                name="compteContrepartieId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Compte destination</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={loadingComptes}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un compte" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {comptesActifs
                          .filter((c) => c.id !== form.watch('compteId'))
                          .map((compte) => (
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
            )}

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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="modePaiement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mode de paiement</FormLabel>
                    <FormControl>
                      <Input placeholder="Virement, Chèque, Espèces..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="referenceBancaire"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Référence bancaire</FormLabel>
                    <FormControl>
                      <Input placeholder="N° chèque, virement..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="categorie"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catégorie</FormLabel>
                  <FormControl>
                    <Input placeholder="Catégorie..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="libelle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Libellé</FormLabel>
                  <FormControl>
                    <Input placeholder="Description de l'opération..." {...field} />
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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
