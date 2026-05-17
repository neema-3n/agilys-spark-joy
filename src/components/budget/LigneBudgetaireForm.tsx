import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Action, LigneBudgetaire, Programme, Section } from '@/types/budget.types';
import type { Compte } from '@/types/compte.types';
import type { Enveloppe } from '@/types/enveloppe.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const ligneBudgetaireSchema = z.object({
  actionId: z.string().min(1, 'Veuillez sélectionner une action budgétaire'),
  compteId: z.string().min(1, 'Veuillez sélectionner un compte comptable'),
  enveloppeId: z.string().optional(),
  libelle: z.string().min(1, 'Le libellé est requis').max(200, 'Le libellé ne peut dépasser 200 caractères'),
  montantInitial: z.coerce.number().positive('Le montant doit être supérieur à 0'),
});

type LigneBudgetaireFormValues = z.infer<typeof ligneBudgetaireSchema>;

interface LigneBudgetaireFormProps {
  ligne?: LigneBudgetaire | null;
  exerciceId: string;
  sections: Section[];
  programmes: Programme[];
  actions: Action[];
  comptes: Compte[];
  enveloppes: Enveloppe[];
  onSubmit: (data: Partial<LigneBudgetaire>) => Promise<void> | void;
  onCancel: () => void;
  submitLabel?: string;
}

export const LigneBudgetaireForm = ({
  ligne,
  exerciceId,
  sections,
  programmes,
  actions,
  comptes,
  enveloppes,
  onSubmit,
  onCancel,
  submitLabel,
}: LigneBudgetaireFormProps) => {
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedProgrammeId, setSelectedProgrammeId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LigneBudgetaireFormValues>({
    resolver: zodResolver(ligneBudgetaireSchema),
    defaultValues: {
      actionId: '',
      compteId: '',
      enveloppeId: '',
      libelle: '',
      montantInitial: 0,
    },
  });

  const sectionsActives = useMemo(() => sections.filter((section) => section.statut === 'actif'), [sections]);
  const comptesActifs = useMemo(() => comptes.filter((compte) => compte.statut === 'actif'), [comptes]);
  const enveloppesActives = useMemo(() => enveloppes.filter((enveloppe) => enveloppe.statut === 'actif'), [enveloppes]);

  const programmesActifs = useMemo(
    () =>
      programmes.filter(
        (programme) => programme.statut === 'actif' && programme.section_id === selectedSectionId
      ),
    [programmes, selectedSectionId]
  );

  const actionsActives = useMemo(
    () =>
      actions.filter(
        (action) => action.statut === 'actif' && action.programme_id === selectedProgrammeId
      ),
    [actions, selectedProgrammeId]
  );

  useEffect(() => {
    if (ligne) {
      const selectedAction = actions.find((action) => action.id === ligne.actionId);
      const selectedProgramme = programmes.find((programme) => programme.id === selectedAction?.programme_id);
      setSelectedSectionId(selectedProgramme?.section_id || '');
      setSelectedProgrammeId(selectedAction?.programme_id || '');
      form.reset({
        actionId: ligne.actionId,
        compteId: ligne.compteId,
        enveloppeId: ligne.enveloppeId || '',
        libelle: ligne.libelle,
        montantInitial: ligne.montantInitial,
      });
      return;
    }

    setSelectedSectionId('');
    setSelectedProgrammeId('');
    form.reset({
      actionId: '',
      compteId: '',
      enveloppeId: '',
      libelle: '',
      montantInitial: 0,
    });
  }, [actions, form, ligne, programmes]);

  const handleSubmit = async (values: LigneBudgetaireFormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        ...(ligne ? { id: ligne.id } : {}),
        actionId: values.actionId,
        compteId: values.compteId,
        enveloppeId: values.enveloppeId || null,
        libelle: values.libelle,
        montantInitial: values.montantInitial,
        exerciceId,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Hiérarchie budgétaire</h2>
            <p className="text-sm text-muted-foreground">
              Rattachez la ligne à sa section, son programme et son action budgétaire.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <FormLabel>Section *</FormLabel>
              <Select
                value={selectedSectionId}
                onValueChange={(value) => {
                  setSelectedSectionId(value);
                  setSelectedProgrammeId('');
                  form.setValue('actionId', '');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une section" />
                </SelectTrigger>
                <SelectContent>
                  {sectionsActives.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.code} - {section.libelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <FormLabel>Programme *</FormLabel>
              <Select
                value={selectedProgrammeId}
                onValueChange={(value) => {
                  setSelectedProgrammeId(value);
                  form.setValue('actionId', '');
                }}
                disabled={!selectedSectionId}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      selectedSectionId
                        ? 'Sélectionner un programme'
                        : "Veuillez d'abord sélectionner une section"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {programmesActifs.map((programme) => (
                    <SelectItem key={programme.id} value={programme.id}>
                      {programme.code} - {programme.libelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <FormField
            control={form.control}
            name="actionId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Action budgétaire *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={!selectedProgrammeId}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          selectedProgrammeId
                            ? 'Sélectionner une action'
                            : "Veuillez d'abord sélectionner un programme"
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {actionsActives.map((action) => (
                      <SelectItem key={action.id} value={action.id}>
                        {action.code} - {action.libelle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Imputation</h2>
            <p className="text-sm text-muted-foreground">
              Choisissez le compte de charge, l’enveloppe éventuelle et le libellé de la ligne.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="compteId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Compte comptable *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un compte" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {comptesActifs.map((compte) => (
                        <SelectItem key={compte.id} value={compte.id}>
                          {compte.numero} - {compte.libelle}
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
              name="enveloppeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Enveloppe (optionnel)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une enveloppe" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {enveloppesActives.map((enveloppe) => (
                        <SelectItem key={enveloppe.id} value={enveloppe.id}>
                          {enveloppe.code} - {enveloppe.nom}
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
            name="libelle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Libellé *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Libellé de la ligne budgétaire" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Montant</h2>
            <p className="text-sm text-muted-foreground">
              Renseignez le montant initial de la ligne budgétaire.
            </p>
          </div>

          <FormField
            control={form.control}
            name="montantInitial"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Montant initial *</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} placeholder="0" />
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
            {isSubmitting ? 'Enregistrement...' : submitLabel || (ligne ? 'Enregistrer la ligne' : 'Créer la ligne')}
          </Button>
        </div>
      </form>
    </Form>
  );
};
