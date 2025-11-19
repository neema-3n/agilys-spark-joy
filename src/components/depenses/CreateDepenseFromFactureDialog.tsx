import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';
import type { Facture } from '@/types/facture.types';
import { format } from 'date-fns';

const schema = z.object({
  montant: z.coerce.number().positive('Le montant doit être positif'),
  dateDepense: z.string().min(1, 'La date est requise'),
  modePaiement: z.string().optional(),
  referencePaiement: z.string().optional(),
  observations: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facture: Facture | null;
  onSave: (data: any) => Promise<void>;
}

export const CreateDepenseFromFactureDialog = ({
  open,
  onOpenChange,
  facture,
  onSave,
}: Props) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const soldeDisponible = facture 
    ? Number(facture.montantTTC) - Number(facture.montantPaye || 0)
    : 0;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      montant: soldeDisponible,
      dateDepense: format(new Date(), 'yyyy-MM-dd'),
      modePaiement: '',
      referencePaiement: '',
      observations: '',
    },
  });

  useEffect(() => {
    if (facture && open) {
      const solde = Number(facture.montantTTC) - Number(facture.montantPaye || 0);
      form.reset({
        montant: solde,
        dateDepense: format(new Date(), 'yyyy-MM-dd'),
        modePaiement: '',
        referencePaiement: '',
        observations: '',
      });
    }
  }, [facture, open, form]);

  const handleSubmit = async (data: FormData) => {
    if (!facture) return;
    
    setIsSubmitting(true);
    try {
      await onSave({
        ...data,
        factureId: facture.id,
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Erreur création dépense:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!facture) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Créer une dépense depuis la facture {facture.numero}</DialogTitle>
        </DialogHeader>

        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1 text-sm">
              <div><strong>Fournisseur :</strong> {facture.fournisseur?.nom}</div>
              <div><strong>Montant TTC :</strong> {facture.montantTTC.toFixed(2)} €</div>
              <div><strong>Déjà payé :</strong> {(facture.montantPaye || 0).toFixed(2)} €</div>
              <div><strong>Solde disponible :</strong> {soldeDisponible.toFixed(2)} €</div>
            </div>
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="montant"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Montant à liquider *</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      {...field} 
                      max={soldeDisponible}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dateDepense"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date de la dépense *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="modePaiement"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mode de paiement</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: Virement, Chèque..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="referencePaiement"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Référence de paiement</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: CHQ123456, VIR789..." />
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
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                {isSubmitting ? 'Création...' : 'Créer la dépense'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
