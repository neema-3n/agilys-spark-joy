import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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

const reservationSchema = z.object({
  ligneBudgetaireId: z.string().min(1, 'Veuillez sélectionner une ligne budgétaire'),
  montant: z.coerce.number().positive('Le montant doit être supérieur à 0'),
  objet: z.string().min(1, "L'objet est requis").max(500, "L'objet ne peut dépasser 500 caractères"),
  beneficiaire: z.string().optional(),
  projetId: z.string().optional(),
  dateExpiration: z.string().min(1, "La date d'expiration est requise"),
});

interface ReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: ReservationCreditFormData) => Promise<void>;
  reservation?: ReservationCredit;
}

export const ReservationDialog = ({ open, onOpenChange, onSave, reservation }: ReservationDialogProps) => {
  const { lignes: lignesBudgetaires = [] } = useLignesBudgetaires();
  const { projets = [] } = useProjets();
  const { currentExercice } = useExercice();
  const [typeBeneficiaire, setTypeBeneficiaire] = useState<'projet' | 'autre'>('projet');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const lignesActives = lignesBudgetaires.filter(l => l.statut === 'actif');
  const projetsActifs = projets.filter(p => p.statut !== 'termine' && p.statut !== 'annule');

  const form = useForm<z.infer<typeof reservationSchema>>({
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
    } else {
      setTypeBeneficiaire('projet');
      form.reset({
        ligneBudgetaireId: '',
        montant: 0,
        objet: '',
        beneficiaire: '',
        projetId: '',
        dateExpiration: currentExercice?.dateFin || '',
      });
    }
  }, [reservation, open, currentExercice]);

  const handleSubmit = async (values: z.infer<typeof reservationSchema>) => {
    if (typeBeneficiaire === 'projet' && !values.projetId) {
      form.setError('projetId', { message: 'Veuillez sélectionner un projet' });
      return;
    }
    if (typeBeneficiaire === 'autre' && !values.beneficiaire?.trim()) {
      form.setError('beneficiaire', { message: 'Veuillez saisir le nom du bénéficiaire' });
      return;
    }

    const ligneBudgetaire = lignesActives.find(l => l.id === values.ligneBudgetaireId);
    if (ligneBudgetaire && values.montant > ligneBudgetaire.disponible) {
      form.setError('montant', {
        message: `Le montant dépasse le disponible de la ligne (${ligneBudgetaire.disponible.toLocaleString('fr-FR')})`
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanedData: ReservationCreditFormData = {
        ligneBudgetaireId: values.ligneBudgetaireId,
        montant: values.montant,
        objet: values.objet,
        dateExpiration: values.dateExpiration,
        beneficiaire: typeBeneficiaire === 'autre' ? values.beneficiaire : undefined,
        projetId: typeBeneficiaire === 'projet' ? values.projetId : undefined,
      };

      await onSave(cleanedData);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {reservation ? 'Modifier la réservation' : 'Créer une réservation de crédit'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-4 min-h-0">
          <Form {...form}>
          <form className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="ligneBudgetaireId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ligne budgétaire *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
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
                  <RadioGroupItem value="projet" id="projet" />
                  <label htmlFor="projet" className="text-sm">Projet</label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="autre" id="autre" />
                  <label htmlFor="autre" className="text-sm">Autre bénéficiaire</label>
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
                      <Input {...field} placeholder="Nom du bénéficiaire" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
              )}
            />
            )}

          </form>
          </Form>
        </div>
        
        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button 
            type="button" 
            disabled={isSubmitting}
            onClick={form.handleSubmit(handleSubmit)}
          >
            {isSubmitting ? 'Enregistrement...' : reservation ? 'Modifier' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
