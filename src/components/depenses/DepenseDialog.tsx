import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLignesBudgetaires } from '@/hooks/useLignesBudgetaires';
import { useFournisseurs } from '@/hooks/useFournisseurs';
import { useProjets } from '@/hooks/useProjets';
import { useEngagements } from '@/hooks/useEngagements';
import { useReservations } from '@/hooks/useReservations';
import { useFactures } from '@/hooks/useFactures';
import { useComptes } from '@/hooks/useComptes';
import { useNaturesCompte } from '@/hooks/useNaturesCompte';
import { ChargePrincipaleField } from '@/components/finance/ChargePrincipaleField';
import { VentilationEditor } from '@/components/finance/VentilationEditor';
import { computeFinancialBreakdown, createEmptyVentilation, getCoherenceErrors } from '@/lib/financial-utils';
import type { Depense, DepenseFormData } from '@/types/depense.types';
import type { Engagement } from '@/types/engagement.types';
import type { ReservationCredit } from '@/types/reservation.types';
import type { Facture } from '@/types/facture.types';
import type { ChargePrincipaleMode, FinancialVentilation } from '@/types/financial.types';

const depenseSchema = z.object({
  engagementId: z.string().optional(),
  reservationCreditId: z.string().optional(),
  ligneBudgetaireId: z.string().optional(),
  factureId: z.string().optional(),
  fournisseurId: z.string().optional(),
  beneficiaire: z.string().optional(),
  projetId: z.string().optional(),
  objet: z.string().min(1, "L'objet est requis"),
  montantHT: z.coerce.number().positive('Le montant HT est requis'),
  montantTTC: z.coerce.number().positive('Le montant TTC est requis'),
  montantNetPaye: z.coerce.number().positive('Le montant net paye est requis'),
  dateDepense: z.string().min(1, 'La date est requise'),
  modePaiement: z.string().optional(),
  referencePaiement: z.string().optional(),
  observations: z.string().optional(),
});

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
  const { comptes } = useComptes();
  const { naturesCompte } = useNaturesCompte();

  const comptesCharge = useMemo(() => comptes.filter((compte) => compte.type === 'charge' && compte.statut === 'actif'), [comptes]);
  const [typeImputation, setTypeImputation] = useState<'engagement' | 'reservation' | 'facture' | 'direct'>('direct');
  const [typeBeneficiaire, setTypeBeneficiaire] = useState<'fournisseur' | 'direct'>('fournisseur');
  const [ventilations, setVentilations] = useState<FinancialVentilation[]>([]);
  const [chargePrincipaleMode, setChargePrincipaleMode] = useState<ChargePrincipaleMode>('nature');
  const [natureCompteChargeId, setNatureCompteChargeId] = useState<string>();
  const [compteChargeId, setCompteChargeId] = useState<string>();

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
      montantHT: 0,
      montantTTC: 0,
      montantNetPaye: 0,
      dateDepense: format(new Date(), 'yyyy-MM-dd'),
      modePaiement: '',
      referencePaiement: '',
      observations: '',
    },
  });

  useEffect(() => {
    if (!open) return;

    if (depense) {
      form.reset({
        engagementId: depense.engagementId || '',
        reservationCreditId: depense.reservationCreditId || '',
        ligneBudgetaireId: depense.ligneBudgetaireId || '',
        factureId: depense.factureId || '',
        fournisseurId: depense.fournisseurId || '',
        beneficiaire: depense.beneficiaire || '',
        projetId: depense.projetId || '',
        objet: depense.objet,
        montantHT: depense.montantHT || depense.montant,
        montantTTC: depense.montantTTC || depense.montant,
        montantNetPaye: depense.montantNetPaye || depense.montant,
        dateDepense: depense.dateDepense,
        modePaiement: depense.modePaiement || '',
        referencePaiement: depense.referencePaiement || '',
        observations: depense.observations || '',
      });
      setVentilations(depense.ventilations || []);
      setChargePrincipaleMode(depense.chargePrincipaleMode || 'nature');
      setNatureCompteChargeId(depense.natureCompteChargeId);
      setCompteChargeId(depense.compteChargeId);
      if (depense.factureId) setTypeImputation('facture');
      else if (depense.engagementId) setTypeImputation('engagement');
      else if (depense.reservationCreditId) setTypeImputation('reservation');
      else setTypeImputation('direct');
      setTypeBeneficiaire(depense.fournisseurId ? 'fournisseur' : 'direct');
      return;
    }

    const selectedFacture = preSelectedFacture || undefined;
    const selectedEngagement = preSelectedEngagement || undefined;
    const selectedReservation = preSelectedReservation || undefined;

    if (selectedFacture) {
      setTypeImputation('facture');
      form.reset({
        engagementId: selectedFacture.engagementId || '',
        reservationCreditId: '',
        ligneBudgetaireId: selectedFacture.ligneBudgetaireId || '',
        factureId: selectedFacture.id,
        fournisseurId: selectedFacture.fournisseurId,
        beneficiaire: '',
        projetId: selectedFacture.projetId || '',
        objet: selectedFacture.objet,
        montantHT: selectedFacture.montantHT,
        montantTTC: selectedFacture.montantTTC,
        montantNetPaye: selectedFacture.montantNetPaye || selectedFacture.montantTTC,
        dateDepense: format(new Date(), 'yyyy-MM-dd'),
        modePaiement: '',
        referencePaiement: '',
        observations: '',
      });
      setVentilations(selectedFacture.ventilations || []);
      return;
    }

    if (selectedEngagement) {
      setTypeImputation('engagement');
      form.reset({
        engagementId: selectedEngagement.id,
        reservationCreditId: selectedEngagement.reservationCreditId || '',
        ligneBudgetaireId: selectedEngagement.ligneBudgetaireId || '',
        factureId: '',
        fournisseurId: selectedEngagement.fournisseurId || '',
        beneficiaire: selectedEngagement.beneficiaire || '',
        projetId: selectedEngagement.projetId || '',
        objet: selectedEngagement.objet,
        montantHT: selectedEngagement.solde || selectedEngagement.montant,
        montantTTC: selectedEngagement.solde || selectedEngagement.montant,
        montantNetPaye: selectedEngagement.solde || selectedEngagement.montant,
        dateDepense: format(new Date(), 'yyyy-MM-dd'),
        modePaiement: '',
        referencePaiement: '',
        observations: '',
      });
      return;
    }

    if (selectedReservation) {
      setTypeImputation('reservation');
      form.reset({
        engagementId: '',
        reservationCreditId: selectedReservation.id,
        ligneBudgetaireId: selectedReservation.ligneBudgetaireId,
        factureId: '',
        fournisseurId: '',
        beneficiaire: selectedReservation.beneficiaire || '',
        projetId: selectedReservation.projetId || '',
        objet: selectedReservation.objet,
        montantHT: selectedReservation.montant,
        montantTTC: selectedReservation.montant,
        montantNetPaye: selectedReservation.montant,
        dateDepense: format(new Date(), 'yyyy-MM-dd'),
        modePaiement: '',
        referencePaiement: '',
        observations: '',
      });
      return;
    }

    setTypeImputation('direct');
    setTypeBeneficiaire('fournisseur');
    setVentilations([]);
    setChargePrincipaleMode('nature');
    setNatureCompteChargeId(undefined);
    setCompteChargeId(undefined);
    form.reset({
      engagementId: '',
      reservationCreditId: '',
      ligneBudgetaireId: '',
      factureId: '',
      fournisseurId: '',
      beneficiaire: '',
      projetId: '',
      objet: '',
      montantHT: 0,
      montantTTC: 0,
      montantNetPaye: 0,
      dateDepense: format(new Date(), 'yyyy-MM-dd'),
      modePaiement: '',
      referencePaiement: '',
      observations: '',
    });
  }, [open, depense, preSelectedEngagement, preSelectedReservation, preSelectedFacture, form]);

  useEffect(() => {
    if (chargePrincipaleMode !== 'nature' || !natureCompteChargeId) return;
    const nature = naturesCompte.find((item) => item.id === natureCompteChargeId);
    if (nature?.compteDefautId) {
      setCompteChargeId(nature.compteDefautId);
    }
  }, [chargePrincipaleMode, natureCompteChargeId, naturesCompte]);

  const breakdown = computeFinancialBreakdown(
    form.watch('montantHT') || 0,
    form.watch('montantTTC') || 0,
    form.watch('montantNetPaye') || 0,
    ventilations
  );
  const coherenceErrors = getCoherenceErrors(breakdown);

  const handleSubmit = async (values: z.infer<typeof depenseSchema>) => {
    if (!natureCompteChargeId && !compteChargeId) {
      form.setError('objet', { type: 'manual', message: 'La charge principale est requise.' });
      return;
    }

    if (coherenceErrors.length > 0) {
      form.setError('montantNetPaye', { type: 'manual', message: coherenceErrors[0] });
      return;
    }

    const payload: DepenseFormData = {
      engagementId: typeImputation === 'engagement' ? values.engagementId || undefined : values.engagementId || undefined,
      reservationCreditId: typeImputation === 'reservation' ? values.reservationCreditId || undefined : values.reservationCreditId || undefined,
      ligneBudgetaireId: values.ligneBudgetaireId || undefined,
      factureId: typeImputation === 'facture' ? values.factureId || undefined : values.factureId || undefined,
      fournisseurId: typeBeneficiaire === 'fournisseur' ? values.fournisseurId || undefined : undefined,
      beneficiaire: typeBeneficiaire === 'direct' ? values.beneficiaire || undefined : undefined,
      projetId: values.projetId || undefined,
      objet: values.objet,
      montant: values.montantTTC,
      montantHT: values.montantHT,
      montantTTC: values.montantTTC,
      montantNetPaye: values.montantNetPaye,
      totalAjouts: breakdown.totalAjouts,
      totalRetraits: breakdown.totalRetraits,
      dateDepense: values.dateDepense,
      modePaiement: values.modePaiement as DepenseFormData['modePaiement'],
      referencePaiement: values.referencePaiement || undefined,
      observations: values.observations || undefined,
      chargePrincipaleMode,
      natureCompteChargeId,
      compteChargeId,
      ventilations,
    };

    await onSave(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>{depense ? 'Modifier la depense' : 'Nouvelle depense'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <ScrollArea className="h-[72vh] pr-4">
              <div className="space-y-6">
                <section className="space-y-4 rounded-md border p-4">
                  <div className="space-y-1">
                    <h3 className="font-medium">Bloc 1 - Noyau de saisie</h3>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <FormLabel>Type d'imputation</FormLabel>
                      <Select value={typeImputation} onValueChange={(value) => setTypeImputation(value as typeof typeImputation)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="direct">Direct</SelectItem>
                          <SelectItem value="engagement">Depuis engagement</SelectItem>
                          <SelectItem value="reservation">Depuis reservation</SelectItem>
                          <SelectItem value="facture">Depuis facture</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <FormLabel>Type de beneficiaire</FormLabel>
                      <Select value={typeBeneficiaire} onValueChange={(value) => setTypeBeneficiaire(value as typeof typeBeneficiaire)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fournisseur">Fournisseur</SelectItem>
                          <SelectItem value="direct">Beneficiaire direct</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {typeImputation === 'engagement' ? (
                      <FormField control={form.control} name="engagementId" render={({ field }) => (
                        <FormItem><FormLabel>Engagement</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selectionner un engagement" /></SelectTrigger></FormControl><SelectContent>{engagements.map((item) => <SelectItem key={item.id} value={item.id}>{item.numero}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                      )} />
                    ) : null}

                    {typeImputation === 'reservation' ? (
                      <FormField control={form.control} name="reservationCreditId" render={({ field }) => (
                        <FormItem><FormLabel>Reservation</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selectionner une reservation" /></SelectTrigger></FormControl><SelectContent>{reservations.map((item) => <SelectItem key={item.id} value={item.id}>{item.numero}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                      )} />
                    ) : null}

                    {typeImputation === 'facture' ? (
                      <FormField control={form.control} name="factureId" render={({ field }) => (
                        <FormItem><FormLabel>Facture</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selectionner une facture" /></SelectTrigger></FormControl><SelectContent>{factures.map((item) => <SelectItem key={item.id} value={item.id}>{item.numero}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                      )} />
                    ) : null}

                    <FormField control={form.control} name="ligneBudgetaireId" render={({ field }) => (
                      <FormItem><FormLabel>Ligne budgetaire</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selectionner une ligne budgetaire" /></SelectTrigger></FormControl><SelectContent>{lignesBudgetaires.map((item) => <SelectItem key={item.id} value={item.id}>{item.libelle}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                    )} />

                    {typeBeneficiaire === 'fournisseur' ? (
                      <FormField control={form.control} name="fournisseurId" render={({ field }) => (
                        <FormItem><FormLabel>Fournisseur</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selectionner un fournisseur" /></SelectTrigger></FormControl><SelectContent>{fournisseurs.map((item) => <SelectItem key={item.id} value={item.id}>{item.nom} - {item.code}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                      )} />
                    ) : (
                      <FormField control={form.control} name="beneficiaire" render={({ field }) => (
                        <FormItem><FormLabel>Beneficiaire</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                      )} />
                    )}

                    <FormField control={form.control} name="projetId" render={({ field }) => (
                      <FormItem><FormLabel>Projet</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selectionner un projet" /></SelectTrigger></FormControl><SelectContent>{projets.map((item) => <SelectItem key={item.id} value={item.id}>{item.code} - {item.nom}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                    )} />

                    <FormField control={form.control} name="objet" render={({ field }) => (
                      <FormItem className="md:col-span-2"><FormLabel>Objet</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>

                  <ChargePrincipaleField
                    mode={chargePrincipaleMode}
                    onModeChange={setChargePrincipaleMode}
                    natureCompteId={natureCompteChargeId}
                    onNatureCompteIdChange={setNatureCompteChargeId}
                    compteChargeId={compteChargeId}
                    onCompteChargeIdChange={setCompteChargeId}
                    naturesCompte={naturesCompte}
                    comptesCharge={comptesCharge}
                  />

                  <div className="grid gap-4 md:grid-cols-3">
                    <FormField control={form.control} name="montantHT" render={({ field }) => (
                      <FormItem><FormLabel>Montant HT</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="montantTTC" render={({ field }) => (
                      <FormItem><FormLabel>Montant TTC</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="montantNetPaye" render={({ field }) => (
                      <FormItem><FormLabel>Montant net paye</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                </section>

                <VentilationEditor ventilations={ventilations} onChange={setVentilations} />

                {coherenceErrors.length > 0 ? (
                  <Alert variant="destructive"><AlertDescription>{coherenceErrors[0]}</AlertDescription></Alert>
                ) : (
                  <Alert><AlertDescription>Montants coherents.</AlertDescription></Alert>
                )}

                <section className="space-y-4 rounded-md border p-4">
                  <div className="space-y-1">
                    <h3 className="font-medium">Bloc 3 - Informations annexes</h3>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField control={form.control} name="dateDepense" render={({ field }) => (
                      <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="modePaiement" render={({ field }) => (
                      <FormItem><FormLabel>Mode de paiement</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selectionner un mode" /></SelectTrigger></FormControl><SelectContent><SelectItem value="virement">Virement</SelectItem><SelectItem value="cheque">Cheque</SelectItem><SelectItem value="especes">Especes</SelectItem><SelectItem value="carte">Carte</SelectItem><SelectItem value="autre">Autre</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="referencePaiement" render={({ field }) => (
                      <FormItem><FormLabel>Reference de paiement</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="observations" render={({ field }) => (
                      <FormItem className="md:col-span-2"><FormLabel>Observations</FormLabel><FormControl><Textarea rows={4} {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                </section>
              </div>
            </ScrollArea>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
              <Button type="submit">{depense ? 'Enregistrer' : 'Creer la depense'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
