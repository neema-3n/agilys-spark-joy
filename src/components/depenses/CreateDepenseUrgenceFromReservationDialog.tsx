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
import { AlertTriangle } from 'lucide-react';
import type { ReservationCredit } from '@/types/reservation.types';
import { format } from 'date-fns';

const LIMITE_URGENCE = 5000;

const schema = z.object({
  montant: z.coerce.number().positive('Le montant doit être positif').max(LIMITE_URGENCE, `Montant limité à ${LIMITE_URGENCE}€`),
  objet: z.string().min(5, 'L\'objet doit faire au moins 5 caractères'),
  justificationUrgence: z.string().min(10, 'Justification obligatoire (min 10 caractères)'),
  dateDepense: z.string().min(1, 'La date est requise'),
  beneficiaire: z.string().optional(),
  modePaiement: z.string().optional(),
  referencePaiement: z.string().optional(),
  observations: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: ReservationCredit | null;
  onSave: (data: any) => Promise<void>;
}

export const CreateDepenseUrgenceFromReservationDialog = ({
  open,
  onOpenChange,
  reservation,
  onSave,
}: Props) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const soldeDisponible = reservation 
    ? Number(reservation.montant) - 
      (reservation.engagements || [])
        .filter(e => e.statut !== 'annule')
        .reduce((sum, e) => sum + Number(e.montant), 0)
    : 0;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      montant: Math.min(soldeDisponible, LIMITE_URGENCE),
      objet: '',
      justificationUrgence: '',
      dateDepense: format(new Date(), 'yyyy-MM-dd'),
      beneficiaire: '',
      modePaiement: '',
      referencePaiement: '',
      observations: '',
    },
  });

  useEffect(() => {
    if (reservation && open) {
      const solde = Number(reservation.montant) - 
        (reservation.engagements || [])
          .filter(e => e.statut !== 'annule')
          .reduce((sum, e) => sum + Number(e.montant), 0);
      
      form.reset({
        montant: Math.min(solde, LIMITE_URGENCE),
        objet: '',
        justificationUrgence: '',
        dateDepense: format(new Date(), 'yyyy-MM-dd'),
        beneficiaire: '',
        modePaiement: '',
        referencePaiement: '',
        observations: '',
      });
    }
  }, [reservation, open, form]);

  const handleSubmit = async (data: FormData) => {
    if (!reservation) return;
    
    setIsSubmitting(true);
    try {
      await onSave({
        ...data,
        reservationCreditId: reservation.id,
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Erreur création dépense urgente:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!reservation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="h-5 w-5" />
            Dépense urgente depuis la réservation {reservation.numero}
          </DialogTitle>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>⚠️ Procédure d'exception</strong>
            <div className="mt-2 space-y-1 text-sm">
              <div>• Cette procédure court-circuite le workflow normal (Engagement → Facture)</div>
              <div>• À utiliser uniquement pour les urgences (frais de mission, achats urgents...)</div>
              <div>• Limite : {LIMITE_URGENCE.toLocaleString()}€</div>
              <div>• Justification obligatoire</div>
            </div>
          </AlertDescription>
        </Alert>

        <Alert>
          <AlertDescription>
            <div className="space-y-1 text-sm">
              <div><strong>Objet réservation :</strong> {reservation.objet}</div>
              <div><strong>Montant réservé :</strong> {reservation.montant.toFixed(2)} €</div>
              <div><strong>Solde disponible :</strong> {soldeDisponible.toFixed(2)} €</div>
            </div>
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="objet"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Objet de la dépense * <span className="text-xs text-muted-foreground">(min 5 caractères)</span></FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: Achat urgent de fournitures de bureau" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="justificationUrgence"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-orange-600">Justification d'urgence * <span className="text-xs">(min 10 caractères)</span></FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      rows={3}
                      placeholder="Expliquez pourquoi cette dépense ne peut pas suivre le workflow normal (engagement → facture)..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="montant"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant * <span className="text-xs text-muted-foreground">(max {LIMITE_URGENCE}€)</span></FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        {...field} 
                        max={Math.min(soldeDisponible, LIMITE_URGENCE)}
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
                    <FormLabel>Date *</FormLabel>
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
              name="beneficiaire"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bénéficiaire</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nom du bénéficiaire" />
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
                      <Input {...field} placeholder="Ex: Espèces, Carte..." />
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
                    <FormLabel>Référence</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Référence paiement" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="observations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observations complémentaires</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
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
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {isSubmitting ? 'Création...' : 'Créer la dépense urgente'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
