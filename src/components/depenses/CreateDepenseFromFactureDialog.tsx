import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { InfoIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFactures } from '@/hooks/useFactures';
import type { CreateDepenseFromFactureData } from '@/types/depense.types';
import type { Facture } from '@/types/facture.types';

const MAX_FACTURES = 20;

const schema = z.object({
  factureIds: z.array(z.string()).min(1, 'Sélectionnez au moins une facture').max(MAX_FACTURES, 'Maximum 20 factures'),
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
  onSave: (data: CreateDepenseFromFactureData) => Promise<void>;
}

export const CreateDepenseFromFactureDialog = ({ open, onOpenChange, facture, onSave }: Props) => {
  const { factures } = useFactures();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const facturesEligibles = useMemo(() => {
    if (!facture) {
      return [];
    }

    return factures
      .filter(
        (item) =>
          item.clientId === facture.clientId &&
          item.exerciceId === facture.exerciceId &&
          item.statut === 'validee' &&
          item.montantTTC - item.montantLiquide > 0
      )
      .sort((a, b) => a.numero.localeCompare(b.numero));
  }, [facture, factures]);

  const remainingByFactureId = useMemo(() => {
    const remaining = new Map<string, number>();
    for (const item of facturesEligibles) {
      remaining.set(item.id, Number((item.montantTTC - item.montantLiquide).toFixed(2)));
    }
    return remaining;
  }, [facturesEligibles]);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      factureIds: [],
      dateDepense: format(new Date(), 'yyyy-MM-dd'),
      modePaiement: '',
      referencePaiement: '',
      observations: '',
    },
  });

  useEffect(() => {
    if (!open || !facture) {
      return;
    }

    form.reset({
      factureIds: [facture.id],
      dateDepense: format(new Date(), 'yyyy-MM-dd'),
      modePaiement: '',
      referencePaiement: '',
      observations: '',
    });
  }, [facture, form, open]);

  const selectedFactureIds = form.watch('factureIds');
  const selectedCount = selectedFactureIds.length;
  const montantTotal = selectedFactureIds.reduce((sum, id) => sum + (remainingByFactureId.get(id) ?? 0), 0);

  const handleToggleFacture = (factureId: string, checked: boolean) => {
    const current = form.getValues('factureIds');

    if (checked) {
      if (current.length >= MAX_FACTURES) {
        form.setError('factureIds', { message: `Maximum ${MAX_FACTURES} factures par dépense` });
        return;
      }
      form.setValue('factureIds', [...current, factureId], { shouldValidate: true });
      return;
    }

    form.setValue(
      'factureIds',
      current.filter((id) => id !== factureId),
      { shouldValidate: true }
    );
  };

  const handleSubmit = async (data: FormData) => {
    if (!facture) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        factureIds: data.factureIds,
        montantTotal: Number(montantTotal.toFixed(2)),
        dateDepense: data.dateDepense,
        modePaiement: data.modePaiement as CreateDepenseFromFactureData['modePaiement'],
        referencePaiement: data.referencePaiement,
        observations: data.observations,
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!facture) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Créer une dépense depuis facture(s)</DialogTitle>
        </DialogHeader>

        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1 text-sm">
              <div>
                <strong>Sélection:</strong> {selectedCount} / {MAX_FACTURES} facture(s)
              </div>
              <div>
                <strong>Montant total liquidé:</strong> {montantTotal.toFixed(2)} €
              </div>
              <div className="text-muted-foreground">
                Les factures doivent être cohérentes sur engagement, ligne budgétaire et projet.
              </div>
            </div>
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="factureIds"
              render={() => (
                <FormItem>
                  <FormLabel>Factures validées (1 à 20)</FormLabel>
                  <FormControl>
                    <ScrollArea className="h-56 rounded-md border p-3">
                      <div className="space-y-2">
                        {facturesEligibles.map((item) => {
                          const isChecked = selectedFactureIds.includes(item.id);
                          const remaining = remainingByFactureId.get(item.id) ?? 0;

                          return (
                            <label
                              key={item.id}
                              className="flex items-center justify-between gap-3 rounded-md border p-2 hover:bg-accent/40"
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(event) => handleToggleFacture(item.id, event.target.checked)}
                                  className="h-4 w-4"
                                />
                                <div className="text-sm">
                                  <div className="font-medium">{item.numero}</div>
                                  <div className="text-muted-foreground">{item.objet}</div>
                                </div>
                              </div>
                              <div className="text-sm font-medium">{remaining.toFixed(2)} €</div>
                            </label>
                          );
                        })}
                      </div>
                    </ScrollArea>
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
                    <Input {...field} placeholder="Ex: virement, chèque..." />
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
                    <Input {...field} placeholder="Ex: VIR-2026-001" />
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
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting || selectedCount < 1}>
                {isSubmitting ? 'Création...' : 'Créer la dépense'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
