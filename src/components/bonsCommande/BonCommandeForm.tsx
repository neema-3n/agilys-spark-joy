import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { BonCommande, CreateBonCommandeInput, UpdateBonCommandeInput } from '@/types/bonCommande.types';
import type { Engagement } from '@/types/engagement.types';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import { useFournisseurs } from '@/hooks/useFournisseurs';
import { useEngagements } from '@/hooks/useEngagements';
import { useProjets } from '@/hooks/useProjets';

const formSchema = z
  .object({
    numero: z.string().min(1, 'Le numéro est requis'),
    dateCommande: z.string().min(1, 'La date est requise'),
    fournisseurId: z.string().min(1, 'Le fournisseur est requis'),
    engagementId: z.string().min(1, "L'engagement est requis").refine((value) => value !== 'none', {
      message: "L'engagement est requis",
    }),
    projetId: z.string().optional(),
    objet: z.string().min(1, "L'objet est requis"),
    montant: z.string().min(1, 'Le montant est requis'),
    dateLivraisonPrevue: z.string().optional(),
    conditionsLivraison: z.string().optional(),
    observations: z.string().optional(),
  })
  .refine((data) => {
    if (data.dateLivraisonPrevue && data.dateCommande) {
      const dateCommande = new Date(data.dateCommande);
      const dateLivraison = new Date(data.dateLivraisonPrevue);
      return dateLivraison >= dateCommande;
    }
    return true;
  }, {
    message: 'La date de livraison prévue doit être postérieure ou égale à la date de commande',
    path: ['dateLivraisonPrevue'],
  });

interface BonCommandeFormProps {
  bonCommande?: BonCommande;
  selectedEngagement?: Engagement;
  onSubmit: (data: CreateBonCommandeInput | UpdateBonCommandeInput) => Promise<void>;
  onCancel: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
  onGenererNumero: () => Promise<string>;
  submitLabel?: string;
  useScrollArea?: boolean;
}

export const BonCommandeForm = ({
  bonCommande,
  selectedEngagement,
  onSubmit,
  onCancel,
  onDirtyChange,
  onGenererNumero,
  submitLabel,
  useScrollArea = true,
}: BonCommandeFormProps) => {
  const { currentClient } = useClient();
  const { currentExercice } = useExercice();
  const { fournisseurs } = useFournisseurs();
  const { engagements } = useEngagements();
  const { projets } = useProjets();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isReadOnly =
    !!bonCommande &&
    (bonCommande.statut === 'receptionne' ||
      bonCommande.statut === 'facture' ||
      bonCommande.statut === 'annule');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      numero: '',
      dateCommande: format(new Date(), 'yyyy-MM-dd'),
      fournisseurId: '',
      engagementId: '',
      projetId: 'none',
      objet: '',
      montant: '',
      dateLivraisonPrevue: '',
      conditionsLivraison: '',
      observations: '',
    },
  });

  useEffect(() => {
    if (bonCommande) {
      form.reset({
        numero: bonCommande.numero,
        dateCommande: bonCommande.dateCommande,
        fournisseurId: bonCommande.fournisseurId,
        engagementId: bonCommande.engagementId || '',
        projetId: bonCommande.projetId || 'none',
        objet: bonCommande.objet,
        montant: bonCommande.montant.toString(),
        dateLivraisonPrevue: bonCommande.dateLivraisonPrevue || '',
        conditionsLivraison: bonCommande.conditionsLivraison || '',
        observations: bonCommande.observations || '',
      });
      return;
    }

    if (selectedEngagement) {
      void onGenererNumero().then((numero) => {
        form.reset({
          numero,
          dateCommande: format(new Date(), 'yyyy-MM-dd'),
          fournisseurId: selectedEngagement.fournisseurId || '',
          engagementId: selectedEngagement.id,
          projetId: selectedEngagement.projetId || 'none',
          objet: selectedEngagement.objet,
          montant: selectedEngagement.montant.toString(),
          dateLivraisonPrevue: '',
          conditionsLivraison: '',
          observations: `Créé depuis l'engagement ${selectedEngagement.numero}`,
        });
      });
      return;
    }

    void onGenererNumero().then((numero) => {
      form.reset({
        numero,
        dateCommande: format(new Date(), 'yyyy-MM-dd'),
        fournisseurId: '',
        engagementId: '',
        projetId: 'none',
        objet: '',
        montant: '',
        dateLivraisonPrevue: '',
        conditionsLivraison: '',
        observations: '',
      });
    });
  }, [bonCommande, form, onGenererNumero, selectedEngagement]);

  const watchedEngagementId = form.watch('engagementId');
  const isPinnedToEngagement = !!selectedEngagement;
  const hasEngagementSource =
    watchedEngagementId !== undefined &&
    watchedEngagementId !== '' &&
    watchedEngagementId !== 'none';
  const lockInheritedBonCommandeFields = !bonCommande && hasEngagementSource;

  useEffect(() => {
    if (bonCommande || selectedEngagement || !watchedEngagementId || watchedEngagementId === 'none') return;
    const engagement = engagements.find((item) => item.id === watchedEngagementId);
    if (!engagement) return;

    form.setValue('fournisseurId', engagement.fournisseurId || '', { shouldDirty: true });
    form.setValue('projetId', engagement.projetId || 'none', { shouldDirty: true });
    form.setValue('objet', engagement.objet, { shouldDirty: true });
    form.setValue('montant', engagement.montant.toString(), { shouldDirty: true });
    form.setValue('observations', `Créé depuis l'engagement ${engagement.numero}`, {
      shouldDirty: true,
    });
  }, [bonCommande, engagements, form, selectedEngagement, watchedEngagementId]);

  useEffect(() => {
    onDirtyChange?.(form.formState.isDirty);
  }, [form.formState.isDirty, onDirtyChange]);

  useEffect(() => {
    return () => onDirtyChange?.(false);
  }, [onDirtyChange]);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!currentClient || !currentExercice) return;

    setIsSubmitting(true);
    try {
      const data: CreateBonCommandeInput | UpdateBonCommandeInput = {
        ...(bonCommande
          ? {}
          : {
              clientId: currentClient.id,
              exerciceId: currentExercice.id,
            }),
        numero: values.numero,
        dateCommande: values.dateCommande,
        fournisseurId: values.fournisseurId,
        engagementId: values.engagementId,
        projetId: values.projetId && values.projetId !== 'none' ? values.projetId : undefined,
        objet: values.objet,
        montant: parseFloat(values.montant),
        statut: bonCommande?.statut || 'brouillon',
        dateLivraisonPrevue: values.dateLivraisonPrevue || undefined,
        conditionsLivraison: values.conditionsLivraison || undefined,
        observations: values.observations || undefined,
      };

      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const engagementsValides = engagements.filter((e) => e.statut === 'valide');

  const content = (
    <div className="space-y-10">
      <section className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold tracking-tight">Noyau de saisie</h3>
          <p className="text-sm text-muted-foreground">
            Identifiez le bon de commande, son rattachement et son montant d&apos;engagement.
          </p>
        </div>
        <Card>
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="numero"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numéro</FormLabel>
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
                    <FormLabel>Date de commande</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} disabled={isReadOnly} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fournisseurId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fournisseur</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isReadOnly || lockInheritedBonCommandeFields}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un fournisseur" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {fournisseurs.map((fournisseur) => (
                          <SelectItem key={fournisseur.id} value={fournisseur.id}>
                            {fournisseur.nom}
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
                name="engagementId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Engagement</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isReadOnly || isPinnedToEngagement}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un engagement" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {engagementsValides.map((engagement) => (
                          <SelectItem key={engagement.id} value={engagement.id}>
                            {engagement.numero} - {engagement.objet}
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
                    <FormLabel>Projet</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isReadOnly || lockInheritedBonCommandeFields}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Optionnel" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">-- Aucun --</SelectItem>
                        {projets.map((projet) => (
                          <SelectItem key={projet.id} value={projet.id}>
                            {projet.code} - {projet.nom}
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
                name="montant"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} disabled={isReadOnly} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="objet"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Objet</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} disabled={isReadOnly} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold tracking-tight">Livraison et suivi</h3>
          <p className="text-sm text-muted-foreground">
            Renseignez le calendrier et les conditions de livraison utiles au pilotage du bon.
          </p>
        </div>
        <Card>
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                  <FormItem className="md:col-span-2">
                    <FormLabel>Observations</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} disabled={isReadOnly} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {useScrollArea ? <ScrollArea className="h-[72vh] pr-4">{content}</ScrollArea> : content}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            {isReadOnly ? 'Fermer' : 'Annuler'}
          </Button>
          {!isReadOnly && (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Enregistrement...' : submitLabel || (bonCommande ? 'Mettre à jour' : 'Créer')}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
};
