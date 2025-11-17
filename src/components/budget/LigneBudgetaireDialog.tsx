import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LigneBudgetaire } from '@/types/budget.types';
import { useComptes } from '@/hooks/useComptes';
import { useSections } from '@/hooks/useSections';
import { useProgrammes } from '@/hooks/useProgrammes';
import { useActions } from '@/hooks/useActions';
import { useEnveloppes } from '@/hooks/useEnveloppes';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';

const ligneBudgetaireSchema = z.object({
  actionId: z.string().min(1, 'Veuillez sélectionner une action budgétaire'),
  compteId: z.string().min(1, 'Veuillez sélectionner un compte comptable'),
  enveloppeId: z.string().optional(),
  libelle: z.string().min(1, 'Le libellé est requis').max(200, 'Le libellé ne peut dépasser 200 caractères'),
  montantInitial: z.coerce.number().positive('Le montant doit être supérieur à 0'),
});

interface LigneBudgetaireDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<LigneBudgetaire>) => void;
  ligne?: LigneBudgetaire | null;
  exerciceId: string;
}

export const LigneBudgetaireDialog = ({
  open,
  onClose,
  onSubmit,
  ligne,
  exerciceId,
}: LigneBudgetaireDialogProps) => {
  const { comptes, isLoading: isLoadingComptes } = useComptes();
  const { enveloppes } = useEnveloppes();
  const { sections } = useSections();
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const { programmes } = useProgrammes(selectedSectionId);
  const [selectedProgrammeId, setSelectedProgrammeId] = useState('');
  const { actions } = useActions(selectedProgrammeId);

  const form = useForm<z.infer<typeof ligneBudgetaireSchema>>({
    resolver: zodResolver(ligneBudgetaireSchema),
    defaultValues: {
      actionId: '',
      compteId: '',
      enveloppeId: '',
      libelle: '',
      montantInitial: 0,
    },
  });

  useEffect(() => {
    if (ligne) {
      form.reset({
        actionId: ligne.actionId,
        compteId: ligne.compteId,
        enveloppeId: ligne.enveloppeId || '',
        libelle: ligne.libelle,
        montantInitial: ligne.montantInitial,
      });
    } else {
      form.reset({
        actionId: '',
        compteId: '',
        enveloppeId: '',
        libelle: '',
        montantInitial: 0,
      });
    }
  }, [ligne, open]);

  const handleSubmit = (values: z.infer<typeof ligneBudgetaireSchema>) => {
    onSubmit({
      ...(ligne ? { id: ligne.id } : {}),
      actionId: values.actionId,
      compteId: values.compteId,
      enveloppeId: values.enveloppeId || null,
      libelle: values.libelle,
      montantInitial: values.montantInitial,
      exerciceId,
    });
    onClose();
  };

  const comptesActifs = comptes.filter(c => c.statut === 'actif');
  const enveloppesActives = enveloppes.filter(e => e.statut === 'actif');
  const sectionsActives = sections.filter(s => s.statut === 'actif');
  const programmesActifs = programmes.filter(p => p.statut === 'actif');
  const actionsActives = actions.filter(a => a.statut === 'actif');

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {ligne ? 'Modifier la ligne budgétaire' : 'Créer une ligne budgétaire'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
                  <SelectValue placeholder={selectedSectionId ? "Sélectionner un programme" : "Veuillez d'abord sélectionner une section"} />
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

            <FormField
              control={form.control}
              name="actionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Action budgétaire *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!selectedProgrammeId}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={selectedProgrammeId ? "Sélectionner une action" : "Veuillez d'abord sélectionner un programme"} />
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
                      {isLoadingComptes ? (
                        <SelectItem value="loading" disabled>Chargement...</SelectItem>
                      ) : (
                        comptesActifs.map((compte) => (
                          <SelectItem key={compte.id} value={compte.id}>
                            {compte.numero} - {compte.libelle}
                          </SelectItem>
                        ))
                      )}
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

            <FormField
              control={form.control}
              name="montantInitial"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Montant initial (FCFA) *</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} placeholder="0" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit">
                {ligne ? 'Modifier' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
