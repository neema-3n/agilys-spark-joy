import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { BonCommande, CreateBonCommandeInput, UpdateBonCommandeInput } from '@/types/bonCommande.types';
import type { Engagement } from '@/types/engagement.types';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import { useFournisseurs } from '@/hooks/useFournisseurs';
import { useEngagements } from '@/hooks/useEngagements';
import { useProjets } from '@/hooks/useProjets';
import { format } from 'date-fns';

const formSchema = z.object({
  numero: z.string().min(1, 'Le numéro est requis'),
  dateCommande: z.string().min(1, 'La date est requise'),
  fournisseurId: z.string().min(1, 'Le fournisseur est requis'),
  engagementId: z.string().optional(),
  projetId: z.string().optional(),
  objet: z.string().min(1, 'L\'objet est requis'),
  montant: z.string().min(1, 'Le montant est requis'),
  dateLivraisonPrevue: z.string().optional(),
  conditionsLivraison: z.string().optional(),
  observations: z.string().optional(),
}).refine((data) => {
  // Validation : la date de livraison prévue doit être >= date de commande
  if (data.dateLivraisonPrevue && data.dateCommande) {
    const dateCommande = new Date(data.dateCommande);
    const dateLivraison = new Date(data.dateLivraisonPrevue);
    return dateLivraison >= dateCommande;
  }
  return true;
}, {
  message: "La date de livraison prévue doit être postérieure ou égale à la date de commande",
  path: ["dateLivraisonPrevue"],
});

interface BonCommandeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bonCommande?: BonCommande;
  selectedEngagement?: Engagement;
  onSubmit: (data: CreateBonCommandeInput | UpdateBonCommandeInput) => Promise<void>;
  onGenererNumero: () => Promise<string>;
}

export const BonCommandeDialog = ({
  open,
  onOpenChange,
  bonCommande,
  selectedEngagement,
  onSubmit,
  onGenererNumero,
}: BonCommandeDialogProps) => {
  const { currentClient } = useClient();
  const { currentExercice } = useExercice();
  const { fournisseurs } = useFournisseurs();
  const { engagements } = useEngagements();
  const { projets } = useProjets();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isReadOnly = bonCommande && bonCommande.statut !== 'brouillon';

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      numero: '',
      dateCommande: format(new Date(), 'yyyy-MM-dd'),
      fournisseurId: '',
      engagementId: '',
      projetId: '',
      objet: '',
      montant: '',
      dateLivraisonPrevue: '',
      conditionsLivraison: '',
      observations: '',
    },
  });

  useEffect(() => {
    if (open && !bonCommande && !selectedEngagement) {
      onGenererNumero().then((numero) => {
        form.setValue('numero', numero);
      });
    }
  }, [open, bonCommande, selectedEngagement, onGenererNumero, form]);

  useEffect(() => {
    if (selectedEngagement && open && !bonCommande) {
      onGenererNumero().then((numero) => {
        form.reset({
          numero: numero,
          dateCommande: format(new Date(), 'yyyy-MM-dd'),
          fournisseurId: selectedEngagement.fournisseurId || '',
          engagementId: selectedEngagement.id,
          projetId: selectedEngagement.projetId || '',
          objet: selectedEngagement.objet,
          montant: selectedEngagement.montant.toString(),
          observations: `Créé depuis l'engagement ${selectedEngagement.numero}`,
        });
      });
    }
  }, [selectedEngagement, open, bonCommande, onGenererNumero, form]);

  useEffect(() => {
    if (bonCommande && open) {
      form.reset({
        numero: bonCommande.numero,
        dateCommande: bonCommande.dateCommande,
        fournisseurId: bonCommande.fournisseurId,
        engagementId: bonCommande.engagementId || '',
        projetId: bonCommande.projetId || '',
        objet: bonCommande.objet,
        montant: bonCommande.montant.toString(),
        dateLivraisonPrevue: bonCommande.dateLivraisonPrevue || '',
        conditionsLivraison: bonCommande.conditionsLivraison || '',
        observations: bonCommande.observations || '',
      });
    }
  }, [bonCommande, form, open]);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!currentClient || !currentExercice) return;

    setIsSubmitting(true);
    try {
      const data: any = {
        clientId: currentClient.id,
        exerciceId: currentExercice.id,
        numero: values.numero,
        dateCommande: values.dateCommande,
        fournisseurId: values.fournisseurId,
        engagementId: values.engagementId || undefined,
        projetId: values.projetId || undefined,
        objet: values.objet,
        montant: parseFloat(values.montant),
        statut: 'brouillon',
        dateLivraisonPrevue: values.dateLivraisonPrevue || undefined,
        conditionsLivraison: values.conditionsLivraison || undefined,
        observations: values.observations || undefined,
      };

      await onSubmit(data);
      onOpenChange(false);
      form.reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  const engagementsValides = engagements.filter(e => e.statut === 'valide');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {bonCommande ? 'Modifier le bon de commande' : 'Nouveau bon de commande'}
          </DialogTitle>
          {isReadOnly && (
            <p className="text-sm text-muted-foreground mt-2">
              Seuls les bons de commande en brouillon peuvent être modifiés.
            </p>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="numero"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numéro *</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateCommande"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de commande *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} disabled={isReadOnly} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="fournisseurId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fournisseur *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un fournisseur" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {fournisseurs.map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.nom}</SelectItem>
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
                name="engagementId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Engagement</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Optionnel" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {engagementsValides.map((e) => (
                          <SelectItem key={e.id} value={e.id}>{e.numero} - {e.objet}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="projetId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Projet</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Optionnel" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projets.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.code} - {p.nom}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="objet"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Objet *</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} disabled={isReadOnly} />
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
                    <FormLabel>Montant *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} disabled={isReadOnly} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateLivraisonPrevue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de livraison prévue</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ''} disabled={isReadOnly} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="conditionsLivraison"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conditions de livraison</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} disabled={isReadOnly} />
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
                    <Textarea {...field} rows={2} disabled={isReadOnly} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {isReadOnly ? 'Fermer' : 'Annuler'}
              </Button>
              {!isReadOnly && (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Enregistrement...' : bonCommande ? 'Mettre à jour' : 'Créer'}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
