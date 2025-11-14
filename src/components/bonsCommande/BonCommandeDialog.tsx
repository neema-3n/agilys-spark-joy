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
import { Badge } from '@/components/ui/badge';

const formSchema = z.object({
  numero: z.string().min(1, 'Le numéro est requis'),
  dateCommande: z.string().min(1, 'La date est requise'),
  fournisseurId: z.string().min(1, 'Le fournisseur est requis'),
  engagementId: z.string().optional(),
  projetId: z.string().optional(),
  objet: z.string().min(1, 'L\'objet est requis'),
  montant: z.string().min(1, 'Le montant est requis'),
  statut: z.string(),
  dateValidation: z.string().optional(),
  dateLivraisonPrevue: z.string().optional(),
  dateLivraisonReelle: z.string().optional(),
  conditionsLivraison: z.string().optional(),
  observations: z.string().optional(),
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
      statut: 'brouillon',
      dateValidation: '',
      dateLivraisonPrevue: '',
      dateLivraisonReelle: '',
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
          statut: 'brouillon',
          observations: `Créé depuis l'engagement ${selectedEngagement.numero}`,
          dateValidation: '',
          dateLivraisonPrevue: '',
          dateLivraisonReelle: '',
          conditionsLivraison: '',
        });
      });
    }
  }, [selectedEngagement, open, bonCommande, onGenererNumero, form]);

  useEffect(() => {
    if (bonCommande) {
      form.reset({
        numero: bonCommande.numero,
        dateCommande: bonCommande.dateCommande,
        fournisseurId: bonCommande.fournisseurId,
        engagementId: bonCommande.engagementId || '',
        projetId: bonCommande.projetId || '',
        objet: bonCommande.objet,
        montant: bonCommande.montant.toString(),
        statut: bonCommande.statut,
        dateValidation: bonCommande.dateValidation || '',
        dateLivraisonPrevue: bonCommande.dateLivraisonPrevue || '',
        dateLivraisonReelle: bonCommande.dateLivraisonReelle || '',
        conditionsLivraison: bonCommande.conditionsLivraison || '',
        observations: bonCommande.observations || '',
      });
    } else {
      form.reset({
        numero: '',
        dateCommande: format(new Date(), 'yyyy-MM-dd'),
        fournisseurId: '',
        engagementId: '',
        projetId: '',
        objet: '',
        montant: '',
        statut: 'brouillon',
        dateValidation: '',
        dateLivraisonPrevue: '',
        dateLivraisonReelle: '',
        conditionsLivraison: '',
        observations: '',
      });
    }
  }, [bonCommande, form]);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!currentClient || !currentExercice) return;

    setIsSubmitting(true);
    try {
      const data: CreateBonCommandeInput = {
        clientId: currentClient.id,
        exerciceId: currentExercice.id,
        numero: values.numero,
        dateCommande: values.dateCommande,
        fournisseurId: values.fournisseurId,
        engagementId: values.engagementId || undefined,
        projetId: values.projetId || undefined,
        objet: values.objet,
        montant: parseFloat(values.montant),
        statut: values.statut as any,
        dateValidation: values.dateValidation || undefined,
        dateLivraisonPrevue: values.dateLivraisonPrevue || undefined,
        dateLivraisonReelle: values.dateLivraisonReelle || undefined,
        conditionsLivraison: values.conditionsLivraison || undefined,
        observations: values.observations || undefined,
      };

      await onSubmit(data);
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {bonCommande ? 'Modifier le bon de commande' : 'Nouveau bon de commande'}
        </DialogTitle>
      </DialogHeader>

      {selectedEngagement && (
        <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-md">
          <p className="text-sm">
            <strong>Engagement :</strong> {selectedEngagement.numero} - {selectedEngagement.objet}
          </p>
          <Badge variant="outline" className="mt-1">
            {new Intl.NumberFormat('fr-FR', {
              style: 'currency',
              currency: 'XAF',
              minimumFractionDigits: 0,
            }).format(selectedEngagement.montant)}
          </Badge>
        </div>
      )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="numero"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numéro</FormLabel>
                    <FormControl>
                      <Input {...field} disabled />
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
                    <FormLabel>Date de commande</FormLabel>
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
              name="fournisseurId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fournisseur</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un fournisseur" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {fournisseurs.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.code} - {f.nom}
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
                name="engagementId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Engagement (optionnel)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un engagement" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {engagements.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.numero} - {e.objet}
                          </SelectItem>
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
                    <FormLabel>Projet (optionnel)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un projet" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projets.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.code} - {p.nom}
                          </SelectItem>
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
                  <FormLabel>Objet</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
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
                    <FormLabel>Montant (FCFA)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="statut"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statut</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="brouillon">Brouillon</SelectItem>
                        <SelectItem value="valide">Validé</SelectItem>
                        <SelectItem value="en_cours">En cours</SelectItem>
                        <SelectItem value="receptionne">Réceptionné</SelectItem>
                        <SelectItem value="annule">Annulé</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="dateValidation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de validation</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
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
                    <FormLabel>Livraison prévue</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateLivraisonReelle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Livraison réelle</FormLabel>
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
              name="conditionsLivraison"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conditions de livraison</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
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
                    <Textarea {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
