import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { usePaiements } from '@/hooks/usePaiements';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PaiementFormData } from '@/types/paiement.types';

const formSchema = z.object({
  depenseId: z.string(),
  montant: z.coerce.number().positive('Le montant doit être positif'),
  datePaiement: z.string().min(1, 'La date est requise'),
  modePaiement: z.enum(['virement', 'cheque', 'especes', 'carte', 'autre']),
  referencePaiement: z.string().optional(),
  observations: z.string().optional(),
});

interface PaiementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (data: PaiementFormData) => Promise<void>;
  depenseId: string;
  montantRestant: number;
  depenseNumero: string;
}

export const PaiementDialog = ({
  open,
  onOpenChange,
  onSubmit,
  depenseId,
  montantRestant,
  depenseNumero,
}: PaiementDialogProps) => {
  const { createPaiement } = usePaiements();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      depenseId,
      montant: montantRestant,
      datePaiement: new Date().toISOString().split('T')[0],
      modePaiement: 'virement',
      referencePaiement: '',
      observations: '',
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    await createPaiement(values as PaiementFormData);
    if (onSubmit) {
      await onSubmit(values as PaiementFormData);
    }
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Enregistrer un paiement</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Dépense {depenseNumero} - Reste à payer : {montantRestant.toFixed(2)} €
          </p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="montant"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant *</FormLabel>
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
                name="datePaiement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de paiement *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="modePaiement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mode de paiement *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="virement">Virement</SelectItem>
                        <SelectItem value="cheque">Chèque</SelectItem>
                        <SelectItem value="especes">Espèces</SelectItem>
                        <SelectItem value="carte">Carte bancaire</SelectItem>
                        <SelectItem value="autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
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
                      <Input placeholder="N° chèque, référence virement..." {...field} />
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
                  <FormLabel>Observations</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observations sur ce paiement..."
                      rows={3}
                      {...field}
                    />
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
              >
                Annuler
              </Button>
              <Button type="submit">Enregistrer le paiement</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
