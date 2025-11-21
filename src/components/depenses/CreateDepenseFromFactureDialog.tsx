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
import { supabase } from '@/integrations/supabase/client';

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
  const [montantDejaLiquide, setMontantDejaLiquide] = useState<number>(0);
  const [soldeDisponible, setSoldeDisponible] = useState<number>(0);
  const [isLoadingSolde, setIsLoadingSolde] = useState(false);

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
      let isActive = true;

      const fetchSolde = async () => {
        setIsLoadingSolde(true);
        const { data, error } = await supabase
          .from('depenses')
          .select('montant, statut')
          .eq('facture_id', facture.id)
          .neq('statut', 'annulee');

        if (!isActive) return;

        if (error) {
          console.error('Erreur récupération dépenses facture:', error);
          setMontantDejaLiquide(Number(facture.montantLiquide || 0));
          setSoldeDisponible(Number(facture.montantTTC) - Number(facture.montantLiquide || 0));
          setIsLoadingSolde(false);
          return;
        }

        const dejaLiquide = (data || []).reduce((sum, d) => sum + Number(d.montant), 0);
        const solde = Number(facture.montantTTC) - dejaLiquide;

        setMontantDejaLiquide(dejaLiquide);
        setSoldeDisponible(solde);
        form.reset({
          montant: solde,
          dateDepense: format(new Date(), 'yyyy-MM-dd'),
          modePaiement: '',
          referencePaiement: '',
          observations: '',
        });
        setIsLoadingSolde(false);
      };

      fetchSolde();

      return () => {
        isActive = false;
      };
    }
  }, [facture, open, form]);

  const handleSubmit = async (data: FormData) => {
    if (!facture) return;
    if (data.montant > soldeDisponible) {
      form.setError('montant', { message: `Montant supérieur au solde disponible (${soldeDisponible.toFixed(2)} €)` });
      return;
    }
    
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer une dépense depuis la facture {facture.numero}</DialogTitle>
        </DialogHeader>

        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1 text-sm">
              <div><strong>Fournisseur :</strong> {facture.fournisseur?.nom}</div>
              <div><strong>Montant TTC :</strong> {facture.montantTTC.toFixed(2)} €</div>
              <div><strong>Déjà liquidé :</strong> {(montantDejaLiquide || 0).toFixed(2)} €</div>
              <div>
                <strong>Solde disponible :</strong>{' '}
                {isLoadingSolde ? 'Calcul en cours...' : `${soldeDisponible.toFixed(2)} €`}
              </div>
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
