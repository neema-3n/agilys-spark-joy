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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useLignesBudgetaires } from '@/hooks/useLignesBudgetaires';
import { useFournisseurs } from '@/hooks/useFournisseurs';
import { useProjets } from '@/hooks/useProjets';
import { useEngagements } from '@/hooks/useEngagements';
import { useReservations } from '@/hooks/useReservations';
import { useFactures } from '@/hooks/useFactures';
import type { Depense, DepenseFormData } from '@/types/depense.types';
import type { Engagement } from '@/types/engagement.types';
import type { ReservationCredit } from '@/types/reservation.types';
import type { Facture } from '@/types/facture.types';
import { format } from 'date-fns';

const depenseSchema = z.object({
  engagementId: z.string().optional().or(z.literal('')),
  reservationCreditId: z.string().optional().or(z.literal('')),
  ligneBudgetaireId: z.string().optional().or(z.literal('')),
  factureId: z.string().optional().or(z.literal('')),
  fournisseurId: z.string().optional().or(z.literal('')),
  beneficiaire: z.string().optional().or(z.literal('')),
  projetId: z.string().optional().or(z.literal('')),
  objet: z.string().min(1, "L'objet est requis").max(500, "L'objet ne peut dépasser 500 caractères"),
  montant: z.coerce.number().positive('Le montant doit être supérieur à 0'),
  dateDepense: z.string().min(1, 'La date est requise'),
  modePaiement: z.string().optional().or(z.literal('')),
  referencePaiement: z.string().optional().or(z.literal('')),
  observations: z.string().optional().or(z.literal('')),
}).refine(
  (data) => data.engagementId || data.reservationCreditId || data.ligneBudgetaireId || data.factureId,
  { message: 'Au moins une imputation budgétaire est requise', path: ['ligneBudgetaireId'] }
);

interface DepenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: DepenseFormData) => Promise<void>;
  depense?: Depense;
  preSelectedEngagement?: Engagement;
  preSelectedReservation?: ReservationCredit;
  preSelectedFacture?: Facture;
}

export const DepenseDialog = ({
  open,
  onOpenChange,
  onSave,
  depense,
  preSelectedEngagement,
  preSelectedReservation,
  preSelectedFacture,
}: DepenseDialogProps) => {
  const { lignes: lignesBudgetaires } = useLignesBudgetaires();
  const { fournisseurs } = useFournisseurs();
  const { projets } = useProjets();
  const { engagements } = useEngagements();
  const { reservations } = useReservations();
  const { factures } = useFactures();

  const lignesActives = lignesBudgetaires.filter(l => l.statut === 'actif');
  const fournisseursActifs = fournisseurs.filter(f => f.statut === 'actif');
  const projetsActifs = projets.filter(p => p.statut !== 'termine' && p.statut !== 'annule');
  const engagementsDisponibles = engagements.filter(e => 
    e.statut !== 'annule' && (e.statut === 'valide' || e.statut === 'engage')
  );
  const reservationsActives = reservations.filter(r => r.statut === 'active');
  const facturesNonLiquidees = factures.filter(f => 
    f.statut !== 'annulee' && f.statut === 'validee'
  );

  const [typeImputation, setTypeImputation] = useState<'engagement' | 'reservation' | 'facture' | 'direct'>('direct');
  const [typeBeneficiaire, setTypeBeneficiaire] = useState<'fournisseur' | 'direct'>('fournisseur');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [montantDisponible, setMontantDisponible] = useState<number | null>(null);
  const [montantMax, setMontantMax] = useState<number | null>(null);
  const [selectedEngagement, setSelectedEngagement] = useState<Engagement | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<ReservationCredit | null>(null);
  const [selectedFacture, setSelectedFacture] = useState<Facture | null>(null);

  const form = useForm<z.infer<typeof depenseSchema>>({
    resolver: zodResolver(depenseSchema),
    defaultValues: {
      engagementId: '',
      reservationCreditId: '',
      ligneBudgetaireId: '',
      factureId: '',
      fournisseurId: '',
      beneficiaire: '',
      projetId: '',
      objet: '',
      montant: 0,
      dateDepense: format(new Date(), 'yyyy-MM-dd'),
      modePaiement: '',
      referencePaiement: '',
      observations: '',
    },
  });

  // Pre-fill from preselected items
  useEffect(() => {
    if (open && !depense) {
      if (preSelectedEngagement) {
        setTypeImputation('engagement');
        handleEngagementChange(preSelectedEngagement.id);
      } else if (preSelectedReservation) {
        setTypeImputation('reservation');
        handleReservationChange(preSelectedReservation.id);
      } else if (preSelectedFacture) {
        setTypeImputation('facture');
        handleFactureChange(preSelectedFacture.id);
      }
    }
  }, [open, preSelectedEngagement, preSelectedReservation, preSelectedFacture]);

  // Load existing depense
  useEffect(() => {
    if (depense && open) {
      form.reset({
        engagementId: depense.engagementId || '',
        reservationCreditId: depense.reservationCreditId || '',
        ligneBudgetaireId: depense.ligneBudgetaireId || '',
        factureId: depense.factureId || '',
        fournisseurId: depense.fournisseurId || '',
        beneficiaire: depense.beneficiaire || '',
        projetId: depense.projetId || '',
        objet: depense.objet,
        montant: depense.montant,
        dateDepense: depense.dateDepense,
        modePaiement: depense.modePaiement || '',
        referencePaiement: depense.referencePaiement || '',
        observations: depense.observations || '',
      });

      // Determine type
      if (depense.engagementId) {
        setTypeImputation('engagement');
        handleEngagementChange(depense.engagementId);
      } else if (depense.reservationCreditId) {
        setTypeImputation('reservation');
        handleReservationChange(depense.reservationCreditId);
      } else if (depense.factureId) {
        setTypeImputation('facture');
        handleFactureChange(depense.factureId);
      } else {
        setTypeImputation('direct');
      }

      if (depense.fournisseurId) {
        setTypeBeneficiaire('fournisseur');
      } else if (depense.beneficiaire) {
        setTypeBeneficiaire('direct');
      }
    }
  }, [depense, open]);

  const handleEngagementChange = (engagementId: string) => {
    const engagement = engagements.find(e => e.id === engagementId);
    if (!engagement) return;

    setSelectedEngagement(engagement);
    
    // Calculate disponible (solde)
    const solde = engagement.solde || 0;
    setMontantDisponible(solde);
    setMontantMax(solde);

    // Pre-fill fields
    form.setValue('engagementId', engagementId);
    form.setValue('ligneBudgetaireId', engagement.ligneBudgetaireId);
    
    if (engagement.fournisseurId) {
      form.setValue('fournisseurId', engagement.fournisseurId);
      setTypeBeneficiaire('fournisseur');
    } else if (engagement.beneficiaire) {
      form.setValue('beneficiaire', engagement.beneficiaire);
      setTypeBeneficiaire('direct');
    }
    
    if (engagement.projetId) {
      form.setValue('projetId', engagement.projetId);
    }
    
    if (!form.getValues('objet')) {
      form.setValue('objet', engagement.objet);
    }

    if (form.getValues('montant') === 0) {
      form.setValue('montant', solde);
    }
  };

  const handleReservationChange = (reservationId: string) => {
    const reservation = reservations.find(r => r.id === reservationId);
    if (!reservation) return;

    setSelectedReservation(reservation);

    // Calculate disponible
    const engagementsReservation = engagements.filter(
      e => e.reservationCreditId === reservationId && e.statut !== 'annule'
    );
    const montantEngage = engagementsReservation.reduce((sum, e) => sum + e.montant, 0);
    const disponible = reservation.montant - montantEngage;
    
    setMontantDisponible(disponible);
    setMontantMax(disponible);

    // Pre-fill fields
    form.setValue('reservationCreditId', reservationId);
    form.setValue('ligneBudgetaireId', reservation.ligneBudgetaireId);
    
    if (reservation.beneficiaire) {
      form.setValue('beneficiaire', reservation.beneficiaire);
      setTypeBeneficiaire('direct');
    }
    
    if (reservation.projetId) {
      form.setValue('projetId', reservation.projetId);
    }
    
    if (!form.getValues('objet')) {
      form.setValue('objet', reservation.objet);
    }

    if (form.getValues('montant') === 0) {
      form.setValue('montant', disponible);
    }
  };

  const handleFactureChange = (factureId: string) => {
    const facture = factures.find(f => f.id === factureId);
    if (!facture) return;

    setSelectedFacture(facture);

    // Calculate reste à payer
    const resteAPayer = facture.montantTTC - facture.montantPaye;
    setMontantDisponible(resteAPayer);
    setMontantMax(facture.montantTTC);

    // Pre-fill fields
    form.setValue('factureId', factureId);
    form.setValue('fournisseurId', facture.fournisseurId);
    setTypeBeneficiaire('fournisseur');
    
    if (facture.ligneBudgetaireId) {
      form.setValue('ligneBudgetaireId', facture.ligneBudgetaireId);
    }
    
    if (facture.projetId) {
      form.setValue('projetId', facture.projetId);
    }
    
    if (!form.getValues('objet')) {
      form.setValue('objet', facture.objet);
    }

    if (form.getValues('montant') === 0) {
      form.setValue('montant', resteAPayer);
    }
  };

  const handleLigneDirecteChange = (ligneId: string) => {
    const ligne = lignesBudgetaires.find(l => l.id === ligneId);
    if (!ligne) return;

    setMontantDisponible(ligne.disponible);
    setMontantMax(ligne.disponible);
    form.setValue('ligneBudgetaireId', ligneId);
  };

  const handleTypeImputationChange = (type: 'engagement' | 'reservation' | 'facture' | 'direct') => {
    setTypeImputation(type);
    setMontantDisponible(null);
    setMontantMax(null);
    setSelectedEngagement(null);
    setSelectedReservation(null);
    setSelectedFacture(null);
    
    // Reset imputation fields
    form.setValue('engagementId', '');
    form.setValue('reservationCreditId', '');
    form.setValue('factureId', '');
    if (type !== 'direct') {
      form.setValue('ligneBudgetaireId', '');
    }
  };

  const currentMontant = form.watch('montant');
  
  const montantValidation = {
    isValid: montantMax === null || currentMontant <= montantMax,
    percentage: montantMax ? (currentMontant / montantMax) * 100 : 0,
    resteApres: montantDisponible !== null ? montantDisponible - currentMontant : null,
  };

  const handleSubmit = async (data: z.infer<typeof depenseSchema>) => {
    setIsSubmitting(true);
    try {
      const formData: DepenseFormData = {
        engagementId: data.engagementId || undefined,
        reservationCreditId: data.reservationCreditId || undefined,
        ligneBudgetaireId: data.ligneBudgetaireId || undefined,
        factureId: data.factureId || undefined,
        fournisseurId: data.fournisseurId || undefined,
        beneficiaire: data.beneficiaire || undefined,
        projetId: data.projetId || undefined,
        objet: data.objet,
        montant: data.montant,
        dateDepense: data.dateDepense,
        modePaiement: data.modePaiement as any || undefined,
        referencePaiement: data.referencePaiement || undefined,
        observations: data.observations || undefined,
      };

      await onSave(formData);
      form.reset();
      setTypeImputation('direct');
      setTypeBeneficiaire('fournisseur');
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving depense:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {depense ? 'Modifier la dépense' : 'Nouvelle dépense'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Section 1: Type d'imputation */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Type d'imputation budgétaire</h3>
                <RadioGroup
                  value={typeImputation}
                  onValueChange={(value) => handleTypeImputationChange(value as any)}
                  className="grid grid-cols-2 gap-4"
                >
                  <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-accent">
                    <RadioGroupItem value="engagement" id="type-engagement" />
                    <label htmlFor="type-engagement" className="cursor-pointer flex-1">
                      Depuis un engagement
                    </label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-accent">
                    <RadioGroupItem value="reservation" id="type-reservation" />
                    <label htmlFor="type-reservation" className="cursor-pointer flex-1">
                      Depuis une réservation
                    </label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-accent">
                    <RadioGroupItem value="facture" id="type-facture" />
                    <label htmlFor="type-facture" className="cursor-pointer flex-1">
                      Depuis une facture
                    </label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-accent">
                    <RadioGroupItem value="direct" id="type-direct" />
                    <label htmlFor="type-direct" className="cursor-pointer flex-1">
                      Imputation directe
                    </label>
                  </div>
                </RadioGroup>
              </div>

              {/* Section 2: Sélecteurs conditionnels */}
              <div className="space-y-4">
                {typeImputation === 'engagement' && (
                  <FormField
                    control={form.control}
                    name="engagementId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Engagement</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleEngagementChange(value);
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un engagement" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {engagementsDisponibles.map((eng) => (
                              <SelectItem key={eng.id} value={eng.id}>
                                {eng.numero} - {eng.objet} (Solde: {eng.solde?.toLocaleString() || 0} €)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {typeImputation === 'reservation' && (
                  <FormField
                    control={form.control}
                    name="reservationCreditId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Réservation de crédit</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleReservationChange(value);
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner une réservation" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {reservationsActives.map((res) => (
                              <SelectItem key={res.id} value={res.id}>
                                {res.numero} - {res.objet} ({res.montant.toLocaleString()} €)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {typeImputation === 'facture' && (
                  <FormField
                    control={form.control}
                    name="factureId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Facture</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleFactureChange(value);
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner une facture" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {facturesNonLiquidees.map((fac) => (
                              <SelectItem key={fac.id} value={fac.id}>
                                {fac.numero} - {fac.fournisseur?.nom || 'N/A'} ({fac.montantTTC.toLocaleString()} €)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {typeImputation === 'direct' && (
                  <FormField
                    control={form.control}
                    name="ligneBudgetaireId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ligne budgétaire</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleLigneDirecteChange(value);
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner une ligne budgétaire" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {lignesActives.map((ligne) => (
                              <SelectItem key={ligne.id} value={ligne.id}>
                                {ligne.libelle} (Disponible: {ligne.disponible.toLocaleString()} €)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Alert contextuel */}
                {selectedEngagement && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Cette dépense sera rattachée à l'engagement {selectedEngagement.numero}.
                      Solde disponible: <strong>{selectedEngagement.solde?.toLocaleString() || 0} €</strong>
                    </AlertDescription>
                  </Alert>
                )}

                {selectedReservation && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Cette dépense sera rattachée à la réservation {selectedReservation.numero}.
                      Montant disponible: <strong>{montantDisponible?.toLocaleString() || 0} €</strong>
                    </AlertDescription>
                  </Alert>
                )}

                {selectedFacture && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Liquidation de la facture {selectedFacture.numero}.
                      Reste à payer: <strong>{montantDisponible?.toLocaleString() || 0} €</strong>
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Section 3: Bénéficiaire */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Bénéficiaire</h3>
                <RadioGroup
                  value={typeBeneficiaire}
                  onValueChange={(value) => setTypeBeneficiaire(value as any)}
                  className="grid grid-cols-2 gap-4"
                >
                  <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-accent">
                    <RadioGroupItem value="fournisseur" id="benef-fournisseur" />
                    <label htmlFor="benef-fournisseur" className="cursor-pointer flex-1">
                      Fournisseur
                    </label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-accent">
                    <RadioGroupItem value="direct" id="benef-direct" />
                    <label htmlFor="benef-direct" className="cursor-pointer flex-1">
                      Bénéficiaire direct
                    </label>
                  </div>
                </RadioGroup>

                {typeBeneficiaire === 'fournisseur' ? (
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
                            {fournisseursActifs.map((f) => (
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
                ) : (
                  <FormField
                    control={form.control}
                    name="beneficiaire"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom du bénéficiaire</FormLabel>
                        <FormControl>
                          <Input placeholder="Nom du bénéficiaire" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Section 4: Informations de la dépense */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Informations de la dépense</h3>

                <FormField
                  control={form.control}
                  name="objet"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Objet de la dépense *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Description de la dépense" 
                          className="min-h-20"
                          maxLength={500}
                          {...field} 
                        />
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
                        <FormLabel>Montant (€) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                          />
                        </FormControl>
                        {montantMax !== null && (
                          <div className="text-xs text-muted-foreground">
                            Maximum autorisé: {montantMax.toLocaleString()} €
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dateDepense"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date de la dépense *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Validation badge */}
                {currentMontant > 0 && montantDisponible !== null && (
                  <div className="space-y-2">
                    {montantValidation.isValid ? (
                      montantValidation.resteApres !== null && montantValidation.resteApres >= 0 ? (
                        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-green-700 dark:text-green-300">
                            Montant valide. Reste disponible après cette dépense: <strong>{montantValidation.resteApres.toLocaleString()} €</strong>
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950">
                          <AlertTriangle className="h-4 w-4 text-orange-600" />
                          <AlertDescription className="text-orange-700 dark:text-orange-300">
                            Attention, utilisation complète du disponible.
                          </AlertDescription>
                        </Alert>
                      )
                    ) : (
                      <Alert className="border-red-500 bg-red-50 dark:bg-red-950">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-700 dark:text-red-300">
                          Le montant dépasse le disponible de <strong>{(currentMontant - (montantDisponible || 0)).toLocaleString()} €</strong>
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {/* Progress bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Utilisation</span>
                        <span>{montantValidation.percentage.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            montantValidation.percentage > 100
                              ? 'bg-red-500'
                              : montantValidation.percentage > 80
                              ? 'bg-orange-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(montantValidation.percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
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
                          <SelectItem value="">Aucun projet</SelectItem>
                          {projetsActifs.map((p) => (
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

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="modePaiement"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mode de paiement (optionnel)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">Non spécifié</SelectItem>
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
                        <FormLabel>Référence de paiement (optionnel)</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: numéro de chèque" {...field} />
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
                      <FormLabel>Observations (optionnel)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Notes complémentaires"
                          className="min-h-20"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
        </ScrollArea>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              form.reset();
              onOpenChange(false);
            }}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button
            onClick={form.handleSubmit(handleSubmit)}
            disabled={isSubmitting || !montantValidation.isValid}
          >
            {isSubmitting ? 'Enregistrement...' : depense ? 'Modifier' : 'Créer la dépense'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
