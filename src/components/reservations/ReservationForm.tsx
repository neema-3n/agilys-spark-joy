import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useLignesBudgetaires } from '@/hooks/useLignesBudgetaires';
import { useProjets } from '@/hooks/useProjets';
import { useExercice } from '@/contexts/ExerciceContext';
import type { ReservationCredit, ReservationCreditFormData } from '@/types/reservation.types';
import type { LigneBudgetaire } from '@/types/budget.types';

const reservationSchema = z.object({
  ligneBudgetaireId: z.string().min(1, 'Veuillez sélectionner une ligne budgétaire'),
  montant: z.coerce.number().positive('Le montant doit être supérieur à 0'),
  objet: z.string().min(1, "L'objet est requis").max(500, "L'objet ne peut dépasser 500 caractères"),
  beneficiaire: z.string().optional(),
  projetId: z.string().optional(),
  dateExpiration: z.string().min(1, "La date d'expiration est requise"),
});

type ReservationFormValues = z.infer<typeof reservationSchema>;

interface ReservationFormProps {
  reservation?: ReservationCredit;
  preSelectedLigneBudgetaire?: LigneBudgetaire | null;
  onSubmit: (data: ReservationCreditFormData) => Promise<void>;
  onCancel: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
  submitLabel?: string;
}

export const ReservationForm = ({
  reservation,
  preSelectedLigneBudgetaire,
  onSubmit,
  onCancel,
  onDirtyChange,
  submitLabel = 'Créer la réservation',
}: ReservationFormProps) => {
  const { lignes: lignesBudgetaires = [] } = useLignesBudgetaires();
  const { projets = [] } = useProjets();
  const { currentExercice } = useExercice();
  const [typeBeneficiaire, setTypeBeneficiaire] = useState<'projet' | 'autre'>('projet');

  const lignesActives = useMemo(() => lignesBudgetaires.filter((ligne) => ligne.statut === 'actif'), [lignesBudgetaires]);
  const projetsActifs = useMemo(
    () => projets.filter((projet) => projet.statut !== 'termine' && projet.statut !== 'annule'),
    [projets]
  );

  const form = useForm<ReservationFormValues>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      ligneBudgetaireId: '',
      montant: 0,
      objet: '',
      beneficiaire: '',
      projetId: '',
      dateExpiration: currentExercice?.dateFin || '',
    },
  });

  useEffect(() => {
    if (reservation) {
      const hasProjet = !!reservation.projetId;
      setTypeBeneficiaire(hasProjet ? 'projet' : 'autre');
      form.reset({
        ligneBudgetaireId: reservation.ligneBudgetaireId,
        montant: reservation.montant,
        objet: reservation.objet,
        beneficiaire: reservation.beneficiaire || '',
        projetId: reservation.projetId || '',
        dateExpiration: reservation.dateExpiration || '',
      });
      return;
    }

    setTypeBeneficiaire('projet');
    form.reset({
      ligneBudgetaireId: preSelectedLigneBudgetaire?.id || '',
      montant: 0,
      objet: '',
      beneficiaire: '',
      projetId: '',
      dateExpiration: currentExercice?.dateFin || '',
    });
  }, [reservation, currentExercice, preSelectedLigneBudgetaire, form]);

  const watchedValues = form.watch();
  const initialTypeBeneficiaire = reservation?.projetId ? 'projet' : 'autre';
  const isBeneficiaryModeDirty = reservation
    ? typeBeneficiaire !== initialTypeBeneficiaire
    : typeBeneficiaire !== 'projet';

  useEffect(() => {
    onDirtyChange?.(form.formState.isDirty || isBeneficiaryModeDirty);
  }, [form.formState.isDirty, isBeneficiaryModeDirty, onDirtyChange, watchedValues]);

  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  const handleSubmit = async (values: ReservationFormValues) => {
    if (typeBeneficiaire === 'projet' && !values.projetId) {
      form.setError('projetId', { message: 'Veuillez sélectionner un projet' });
      return;
    }
    if (typeBeneficiaire === 'autre' && !values.beneficiaire?.trim()) {
      form.setError('beneficiaire', { message: 'Veuillez saisir le nom du bénéficiaire' });
      return;
    }

    const ligneBudgetaire = lignesActives.find((ligne) => ligne.id === values.ligneBudgetaireId);
    if (ligneBudgetaire && values.montant > ligneBudgetaire.disponible) {
      form.setError('montant', {
        message: `Le montant dépasse le disponible de la ligne (${ligneBudgetaire.disponible.toLocaleString('fr-FR')})`,
      });
      return;
    }

    await onSubmit({
      ligneBudgetaireId: values.ligneBudgetaireId,
      montant: values.montant,
      objet: values.objet,
      dateExpiration: values.dateExpiration,
      beneficiaire: typeBeneficiaire === 'autre' ? values.beneficiaire : undefined,
      projetId: typeBeneficiaire === 'projet' ? values.projetId : undefined,
    });
  };

  return (
    <div className="space-y-6">
      {preSelectedLigneBudgetaire && !reservation && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>Ligne budgétaire :</strong> {preSelectedLigneBudgetaire.libelle}
            <br />
            <strong>Disponible :</strong> {preSelectedLigneBudgetaire.disponible.toLocaleString('fr-FR')}
          </p>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <FormField
              control={form.control}
              name="ligneBudgetaireId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ligne budgétaire *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!!preSelectedLigneBudgetaire && !reservation}
                  >
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

            <div className="grid gap-4 md:grid-cols-2">
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

              <FormField
                control={form.control}
                name="dateExpiration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date d'expiration *</FormLabel>
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
              name="objet"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Objet *</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Objet de la réservation" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Type de bénéficiaire *</FormLabel>
              <RadioGroup
                value={typeBeneficiaire}
                onValueChange={(value) => setTypeBeneficiaire(value as 'projet' | 'autre')}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="projet" id="beneficiaire-projet" />
                  <label htmlFor="beneficiaire-projet" className="text-sm">Projet</label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="autre" id="beneficiaire-autre" />
                  <label htmlFor="beneficiaire-autre" className="text-sm">Autre bénéficiaire</label>
                </div>
              </RadioGroup>
            </div>

            {typeBeneficiaire === 'projet' ? (
              <FormField
                control={form.control}
                name="projetId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Projet *</FormLabel>
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
            ) : (
              <FormField
                control={form.control}
                name="beneficiaire"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du bénéficiaire *</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} placeholder="Nom du bénéficiaire" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onCancel}>
              Annuler
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {submitLabel}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
