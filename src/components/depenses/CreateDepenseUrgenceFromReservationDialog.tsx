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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="h-5 w-5" />
            Dépense urgente - {reservation.numero}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Alert variant="destructive" className="py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>⚠️ Procédure d'exception</strong>
              <div className="mt-1 space-y-0.5 text-xs">
                <div>• Court-circuite le workflow normal</div>
                <div>• Limite : {LIMITE_URGENCE.toLocaleString()} € • Justification obligatoire</div>
              </div>
            </AlertDescription>
          </Alert>

          <Alert className="py-2">
            <AlertDescription className="text-xs space-y-0.5">
              <div><strong>Objet :</strong> {reservation.objet}</div>
              <div><strong>Réservé :</strong> {reservation.montant.toFixed(2)} € • <strong>Disponible :</strong> {soldeDisponible.toFixed(2)} €</div>
            </AlertDescription>
          </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="objet"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Objet de la dépense *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: Achat urgent fournitures" className="h-9" />
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
                  <FormLabel className="text-sm text-orange-600">Justification d'urgence *</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      rows={2}
                      placeholder="Pourquoi ne peut-on pas suivre le workflow normal..."
                      className="text-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="montant"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Montant *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        {...field} 
                        max={Math.min(soldeDisponible, LIMITE_URGENCE)}
                        className="h-9"
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
                    <FormLabel className="text-sm">Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="h-9" />
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
                  <FormLabel className="text-sm">Bénéficiaire</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nom du bénéficiaire" className="h-9" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="modePaiement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Mode de paiement</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Espèces, Carte..." className="h-9" />
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
                    <FormLabel className="text-sm">Référence</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="N° de référence" className="h-9" />
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
                  <FormLabel className="text-sm">Observations</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} className="text-sm" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="h-9"
              >
                Annuler
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-orange-600 hover:bg-orange-700 h-9"
              >
                {isSubmitting ? 'Création...' : 'Créer la dépense'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
