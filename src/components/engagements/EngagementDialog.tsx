import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
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
  fournisseurId: z.string().optional(),
  beneficiaire: z.string().optional(),
  projetId: z.string().optional(),
  observations: z.string().optional(),
  reservationCreditId: z.string().optional(),
});

interface EngagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: EngagementFormData) => Promise<void>;
  engagement?: Engagement;
  reservation?: ReservationCredit;
}

export const EngagementDialog = ({
  open,
  onOpenChange,
  onSave,
  engagement,
  reservation,
}: EngagementDialogProps) => {
  const { lignes: lignesBudgetaires } = useLignesBudgetaires();
  const { fournisseurs } = useFournisseurs();
  const { projets } = useProjets();
  const { engagements } = useEngagements();

  const lignesActives = lignesBudgetaires.filter(l => l.statut === 'actif');
  const fournisseursActifs = fournisseurs.filter(f => f.statut === 'actif');
  const projetsActifs = projets.filter(p => p.statut !== 'termine' && p.statut !== 'annule');

  const [typeBeneficiaire, setTypeBeneficiaire] = useState<'fournisseur' | 'direct'>('fournisseur');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [montantDisponibleReservation, setMontantDisponibleReservation] = useState<number | null>(null);

  const form = useForm<z.infer<typeof engagementSchema>>({
    resolver: zodResolver(engagementSchema),
    defaultValues: {
      ligneBudgetaireId: '',
      objet: '',
      montant: 0,
      fournisseurId: undefined,
      beneficiaire: undefined,
      projetId: undefined,
      observations: '',
      reservationCreditId: undefined,
    },
  });

  useEffect(() => {
    if (reservation) {
      const engagementsReservation = engagements.filter(
        e => e.reservationCreditId === reservation.id && e.statut !== 'annule'
      );
      const montantEngage = engagementsReservation.reduce((sum, e) => sum + e.montant, 0);
      const montantDisponible = reservation.montant - montantEngage;
      setMontantDisponibleReservation(montantDisponible);
      
      form.reset({
        reservationCreditId: reservation.id,
        ligneBudgetaireId: reservation.ligneBudgetaireId,
        objet: reservation.objet,
        montant: montantDisponible,
        beneficiaire: reservation.beneficiaire,
        projetId: reservation.projetId,
        observations: '',
      });
      
      if (reservation.beneficiaire) {
        setTypeBeneficiaire('direct');
      }
    } else if (engagement) {
      form.reset({
        ligneBudgetaireId: engagement.ligneBudgetaireId,
        objet: engagement.objet,
        montant: engagement.montant,
        fournisseurId: engagement.fournisseurId,
        beneficiaire: engagement.beneficiaire,
        projetId: engagement.projetId,
        observations: engagement.observations,
      });
      setTypeBeneficiaire(engagement.fournisseurId ? 'fournisseur' : 'direct');
      setMontantDisponibleReservation(null);
    } else {
      form.reset({
        ligneBudgetaireId: '',
        objet: '',
        montant: 0,
        fournisseurId: undefined,
        beneficiaire: undefined,
        projetId: undefined,
        observations: '',
        reservationCreditId: undefined,
      });
      setTypeBeneficiaire('fournisseur');
      setMontantDisponibleReservation(null);
    }
  }, [engagement, reservation, open]);

  const handleSubmit = async (values: z.infer<typeof engagementSchema>) => {
    if (typeBeneficiaire === 'fournisseur' && !values.fournisseurId) {
      form.setError('fournisseurId', { message: 'Veuillez sélectionner un fournisseur' });
      return;
    }
    if (typeBeneficiaire === 'direct' && !values.beneficiaire?.trim()) {
      form.setError('beneficiaire', { message: 'Veuillez saisir le nom du bénéficiaire' });
      return;
    }

    const ligneBudgetaire = lignesActives.find(l => l.id === values.ligneBudgetaireId);
    if (ligneBudgetaire && values.montant > ligneBudgetaire.disponible) {
      form.setError('montant', { 
        message: `Le montant dépasse le disponible de la ligne (${ligneBudgetaire.disponible.toLocaleString('fr-FR')} FCFA)` 
      });
      return;
    }

    if (montantDisponibleReservation !== null && values.montant > montantDisponibleReservation) {
      form.setError('montant', { 
        message: `Le montant dépasse le disponible de la réservation (${montantDisponibleReservation.toLocaleString('fr-FR')} FCFA)` 
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanedData: EngagementFormData = typeBeneficiaire === 'fournisseur' 
        ? {
            ligneBudgetaireId: values.ligneBudgetaireId,
            objet: values.objet,
            montant: values.montant,
            fournisseurId: values.fournisseurId,
            projetId: values.projetId,
            observations: values.observations,
            reservationCreditId: values.reservationCreditId,
          }
        : {
            ligneBudgetaireId: values.ligneBudgetaireId,
            objet: values.objet,
            montant: values.montant,
            beneficiaire: values.beneficiaire,
            projetId: values.projetId,
            observations: values.observations,
            reservationCreditId: values.reservationCreditId,
          };

      await onSave(cleanedData);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {engagement ? 'Modifier un engagement' : 'Créer un engagement'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-1">
          <Form {...form}>
          <form className="space-y-4 py-4">
            {reservation && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="text-sm font-medium">Engagement depuis la réservation : {reservation.numero}</p>
                <p className="text-sm text-muted-foreground">
                  Montant réservé : {reservation.montant.toLocaleString('fr-FR')} FCFA
                </p>
                {montantDisponibleReservation !== null && (
                  <p className="text-sm text-muted-foreground">
                    Montant disponible : {montantDisponibleReservation.toLocaleString('fr-FR')} FCFA
                  </p>
                )}
              </div>
            )}

            <FormField
              control={form.control}
              name="ligneBudgetaireId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ligne budgétaire *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!!reservation}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une ligne budgétaire" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {lignesActives.map((ligne) => (
                        <SelectItem key={ligne.id} value={ligne.id}>
                          {ligne.libelle} - Disponible : {ligne.disponible.toLocaleString('fr-FR')} FCFA
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
              name="objet"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Objet *</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Objet de l'engagement" disabled={!!reservation} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="montant"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Montant (FCFA) *</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} placeholder="0" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Type de bénéficiaire *</FormLabel>
              <RadioGroup
                value={typeBeneficiaire}
                onValueChange={(value) => setTypeBeneficiaire(value as 'fournisseur' | 'direct')}
                disabled={!!reservation}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fournisseur" id="fournisseur" />
                  <label htmlFor="fournisseur" className="text-sm">Fournisseur</label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="direct" id="direct" />
                  <label htmlFor="direct" className="text-sm">Bénéficiaire direct</label>
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
                      <Input {...field} placeholder="Nom du bénéficiaire" disabled={!!reservation} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
            {isSubmitting ? 'Enregistrement...' : engagement ? 'Modifier' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
