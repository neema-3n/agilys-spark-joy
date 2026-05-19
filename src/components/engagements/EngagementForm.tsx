import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useLignesBudgetaires } from '@/hooks/useLignesBudgetaires';
import { useFournisseurs } from '@/hooks/useFournisseurs';
import { useProjets } from '@/hooks/useProjets';
import { useEngagements } from '@/hooks/useEngagements';
import type { Engagement, EngagementFormData } from '@/types/engagement.types';
import type { ReservationCredit } from '@/types/reservation.types';

const engagementSchema = z.object({
  ligneBudgetaireId: z.string().min(1, 'Veuillez sélectionner une ligne budgétaire'),
  objet: z.string().min(1, "L'objet est requis").max(500, "L'objet ne peut dépasser 500 caractères"),
  montant: z.coerce.number().positive('Le montant doit être supérieur à 0'),
  fournisseurId: z.string().optional().or(z.literal('')),
  beneficiaire: z.string().optional().or(z.literal('')),
  projetId: z.string().optional().or(z.literal('')),
  observations: z.string().optional().or(z.literal('')),
  reservationCreditId: z.string().optional().or(z.literal('')),
});

type EngagementFormValues = z.infer<typeof engagementSchema>;

type PendingOverrideSubmission = {
  data: EngagementFormData;
  messages: string[];
};

interface EngagementFormProps {
  engagement?: Engagement;
  selectedReservation?: ReservationCredit;
  onSubmit: (data: EngagementFormData) => Promise<void>;
  onCancel: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
  submitLabel?: string;
}

export const EngagementForm = ({
  engagement,
  selectedReservation,
  onSubmit,
  onCancel,
  onDirtyChange,
  submitLabel,
}: EngagementFormProps) => {
  const { lignes: lignesBudgetaires } = useLignesBudgetaires();
  const { fournisseurs } = useFournisseurs();
  const { projets } = useProjets();
  const { engagements } = useEngagements();
  const initializedRef = useRef(false);

  const lignesActives = lignesBudgetaires.filter((ligne) => ligne.statut === 'actif');
  const fournisseursActifs = fournisseurs.filter((fournisseur) => fournisseur.statut === 'actif');
  const projetsActifs = projets.filter((projet) => projet.statut !== 'termine' && projet.statut !== 'annule');

  const [typeBeneficiaire, setTypeBeneficiaire] = useState<'fournisseur' | 'direct'>('fournisseur');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [montantDisponibleReservation, setMontantDisponibleReservation] = useState<number | null>(null);
  const [pendingOverrideSubmission, setPendingOverrideSubmission] = useState<PendingOverrideSubmission | null>(null);
  const initialTypeBeneficiaireRef = useRef<'fournisseur' | 'direct' | null>(null);

  const form = useForm<EngagementFormValues>({
    resolver: zodResolver(engagementSchema),
    defaultValues: {
      ligneBudgetaireId: '',
      objet: '',
      montant: 0,
      fournisseurId: '',
      beneficiaire: '',
      projetId: '',
      observations: '',
      reservationCreditId: '',
    },
  });

  useEffect(() => {
    initializedRef.current = false;
  }, [engagement?.id, selectedReservation?.id]);

  useEffect(() => {
    if (initializedRef.current) return;

    if (selectedReservation) {
      const engagementsReservation = engagements.filter(
        (item) => item.reservationCreditId === selectedReservation.id && item.statut !== 'annule'
      );
      const montantEngage = engagementsReservation.reduce((sum, item) => sum + item.montant, 0);
      const montantDisponible = selectedReservation.montant - montantEngage;
      setMontantDisponibleReservation(montantDisponible);
      form.reset({
        reservationCreditId: selectedReservation.id,
        ligneBudgetaireId: selectedReservation.ligneBudgetaireId,
        objet: selectedReservation.objet,
        montant: montantDisponible,
        fournisseurId: '',
        beneficiaire: selectedReservation.beneficiaire || '',
        projetId: selectedReservation.projetId || '',
        observations: '',
      });
      if (selectedReservation.beneficiaire) {
        setTypeBeneficiaire('direct');
        initialTypeBeneficiaireRef.current = 'direct';
      } else {
        initialTypeBeneficiaireRef.current = 'fournisseur';
      }
      initializedRef.current = true;
      return;
    }

    if (engagement) {
      form.reset({
        ligneBudgetaireId: engagement.ligneBudgetaireId,
        objet: engagement.objet,
        montant: engagement.montant,
        fournisseurId: engagement.fournisseurId || '',
        beneficiaire: engagement.beneficiaire || '',
        projetId: engagement.projetId || '',
        observations: engagement.observations || '',
        reservationCreditId: engagement.reservationCreditId || '',
      });
      setTypeBeneficiaire(engagement.fournisseurId ? 'fournisseur' : 'direct');
      initialTypeBeneficiaireRef.current = engagement.fournisseurId ? 'fournisseur' : 'direct';
      setMontantDisponibleReservation(null);
      initializedRef.current = true;
      return;
    }

    form.reset({
      ligneBudgetaireId: '',
      objet: '',
      montant: 0,
      fournisseurId: '',
      beneficiaire: '',
      projetId: '',
      observations: '',
      reservationCreditId: '',
    });
    setTypeBeneficiaire('fournisseur');
    initialTypeBeneficiaireRef.current = 'fournisseur';
    setMontantDisponibleReservation(null);
    initializedRef.current = true;
  }, [engagement, engagements, form, selectedReservation]);

  const isDirty =
    form.formState.isDirty ||
    (initialTypeBeneficiaireRef.current !== null &&
      initialTypeBeneficiaireRef.current !== typeBeneficiaire);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    return () => onDirtyChange?.(false);
  }, [onDirtyChange]);

  const submitEngagement = async (data: EngagementFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const buildSubmissionData = (values: EngagementFormValues): EngagementFormData =>
    typeBeneficiaire === 'fournisseur'
      ? {
          ligneBudgetaireId: values.ligneBudgetaireId,
          objet: values.objet,
          montant: values.montant,
          fournisseurId: values.fournisseurId || undefined,
          projetId: values.projetId || undefined,
          observations: values.observations || undefined,
          reservationCreditId: values.reservationCreditId || undefined,
        }
      : {
          ligneBudgetaireId: values.ligneBudgetaireId,
          objet: values.objet,
          montant: values.montant,
          beneficiaire: values.beneficiaire || undefined,
          projetId: values.projetId || undefined,
          observations: values.observations || undefined,
          reservationCreditId: values.reservationCreditId || undefined,
        };

  const handleSubmit = async (values: EngagementFormValues) => {
    if (typeBeneficiaire === 'fournisseur' && !values.fournisseurId) {
      form.setError('fournisseurId', { message: 'Veuillez sélectionner un fournisseur' });
      return;
    }

    if (typeBeneficiaire === 'direct' && !values.beneficiaire?.trim()) {
      form.setError('beneficiaire', { message: 'Veuillez saisir le nom du bénéficiaire' });
      return;
    }

    const ligneBudgetaire = lignesActives.find((ligne) => ligne.id === values.ligneBudgetaireId);
    const overrideMessages: string[] = [];

    if (ligneBudgetaire && values.montant > ligneBudgetaire.disponible) {
      overrideMessages.push(
        `Le montant saisi (${values.montant.toLocaleString('fr-FR')}) dépasse le disponible de la ligne budgétaire (${ligneBudgetaire.disponible.toLocaleString('fr-FR')}).`,
      );
    }

    if (montantDisponibleReservation !== null && values.montant > montantDisponibleReservation) {
      overrideMessages.push(
        `Le montant saisi (${values.montant.toLocaleString('fr-FR')}) dépasse le disponible de la réservation (${montantDisponibleReservation.toLocaleString('fr-FR')}).`,
      );
    }

    const cleanedData = buildSubmissionData(values);

    if (overrideMessages.length > 0) {
      setPendingOverrideSubmission({
        data: cleanedData,
        messages: overrideMessages,
      });
      return;
    }

    await submitEngagement(cleanedData);
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        {selectedReservation ? (
          <div className="rounded-xl border bg-muted/30 p-4 space-y-1">
            <p className="text-sm font-medium">Réservation source : {selectedReservation.numero}</p>
            <p className="text-sm text-muted-foreground">
              Montant réservé : {selectedReservation.montant.toLocaleString('fr-FR')}
            </p>
            {montantDisponibleReservation !== null ? (
              <p className="text-sm text-muted-foreground">
                Montant disponible : {montantDisponibleReservation.toLocaleString('fr-FR')}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Noyau de saisie</h2>
            <p className="text-sm text-muted-foreground">
              Définissez l’objet, la ligne budgétaire, le montant et le bénéficiaire de l’engagement.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="ligneBudgetaireId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ligne budgétaire *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!!selectedReservation}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une ligne budgétaire" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {lignesActives.map((ligne) => (
                        <SelectItem key={ligne.id} value={ligne.id}>
                          {ligne.libelle} - Disponible : {ligne.disponible.toLocaleString('fr-FR')}
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
                  <FormLabel>Montant *</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} placeholder="0" />
                  </FormControl>
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
                  <Textarea {...field} placeholder="Objet de l'engagement" disabled={!!selectedReservation} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Bénéficiaire</h2>
            <p className="text-sm text-muted-foreground">
              Rattachez l’engagement à un fournisseur ou à un bénéficiaire direct.
            </p>
          </div>

          <div className="space-y-2">
            <FormLabel>Type de bénéficiaire *</FormLabel>
            <RadioGroup
              value={typeBeneficiaire}
              onValueChange={(value) => setTypeBeneficiaire(value as 'fournisseur' | 'direct')}
              disabled={!!selectedReservation}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="fournisseur" id="engagement-fournisseur" />
                <label htmlFor="engagement-fournisseur" className="text-sm">
                  Fournisseur
                </label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="direct" id="engagement-direct" />
                <label htmlFor="engagement-direct" className="text-sm">
                  Bénéficiaire direct
                </label>
              </div>
            </RadioGroup>
          </div>

          {typeBeneficiaire === 'fournisseur' ? (
            <FormField
              control={form.control}
              name="fournisseurId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fournisseur *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un fournisseur" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {fournisseursActifs.map((fournisseur) => (
                        <SelectItem key={fournisseur.id} value={fournisseur.id}>
                          {fournisseur.code} - {fournisseur.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <FormField
              control={form.control}
              name="beneficiaire"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du bénéficiaire *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nom du bénéficiaire" disabled={!!selectedReservation} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Informations annexes</h2>
            <p className="text-sm text-muted-foreground">
              Précisez le projet associé et les observations utiles au suivi de l’engagement.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
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
                      {projetsActifs.map((projet) => (
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
          </div>

          <FormField
            control={form.control}
            name="observations"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Observations</FormLabel>
                <FormControl>
                  <Textarea {...field} placeholder="Observations" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

          <div className="flex justify-end gap-3 border-t pt-6">
            <Button type="button" variant="outline" onClick={onCancel}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Enregistrement...' : submitLabel || (engagement ? "Enregistrer l'engagement" : "Créer l'engagement")}
            </Button>
          </div>
        </form>
      </Form>

      <AlertDialog open={!!pendingOverrideSubmission} onOpenChange={(open) => !open && setPendingOverrideSubmission(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer le dépassement</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Cet engagement dépasse le plafond actuellement disponible.</p>
                <ul className="list-disc space-y-1 pl-5">
                  {pendingOverrideSubmission?.messages.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
                <p>Voulez-vous créer l&apos;engagement malgré ce dépassement&nbsp;?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Revenir au formulaire</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!pendingOverrideSubmission) return;
                const submission = pendingOverrideSubmission.data;
                setPendingOverrideSubmission(null);
                await submitEngagement(submission);
              }}
            >
              Confirmer le dépassement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
