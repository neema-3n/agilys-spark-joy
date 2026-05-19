import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { AlertCircle, CircleCheckBig } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Facture, CreateFactureInput } from '@/types/facture.types';
import { ChargePrincipaleField } from '@/components/finance/ChargePrincipaleField';
import { FinancialVentilationSection } from '@/components/finance/FinancialVentilationSection';
import { useComptes } from '@/hooks/useComptes';
import { useNaturesCompte } from '@/hooks/useNaturesCompte';
import {
  normalizeChargePrincipaleForEditor,
  resolveChargePrincipale,
} from '@/lib/charge-principale-utils';
import {
  computeFinancialBreakdown,
  getCoherenceErrors,
  sumTaxVentilations,
} from '@/lib/financial-utils';
import type { ChargePrincipaleMode, FinancialVentilation } from '@/types/financial.types';
import { SinglePageFormFooter } from '@/components/shared/SinglePageFormFooter';

const factureSchema = z.object({
  numero: z.string().min(1, 'Le numéro est requis'),
  dateFacture: z.string().min(1, 'La date de facture est requise'),
  dateEcheance: z.string().optional(),
  fournisseurId: z.string().min(1, 'Le fournisseur est requis'),
  bonCommandeId: z.string().optional(),
  engagementId: z.string().optional(),
  ligneBudgetaireId: z.string().optional(),
  projetId: z.string().optional(),
  objet: z.string().min(1, "L'objet est requis"),
  numeroFactureFournisseur: z.string().optional(),
  montantHT: z.coerce.number().positive('Le montant HT est requis'),
  montantTTC: z.coerce.number().positive('Le montant TTC est requis'),
  montantNetPaye: z.coerce.number().positive('Le montant net paye est requis'),
  observations: z.string().optional(),
}).superRefine((data, ctx) => {
  const hasBonCommande = !!data.bonCommandeId && data.bonCommandeId !== 'none';
  const hasEngagement = !!data.engagementId && data.engagementId !== 'none';
  if (!hasBonCommande && !hasEngagement) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['bonCommandeId'],
      message: 'Sélectionnez un engagement ou un bon de commande.',
    });
  }
});

export interface FactureFormProps {
  facture?: Facture;
  onSubmit: (data: CreateFactureInput) => Promise<void>;
  onCancel: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
  fournisseurs: Array<{ id: string; nom: string; code: string }>;
  bonsCommande: Array<{
    id: string;
    numero: string;
    statut: string;
    fournisseur_id?: string;
    engagement_id?: string;
    ligne_budgetaire_id?: string;
    projet_id?: string;
    objet?: string;
    montant?: number;
  }>;
  engagements: Array<{
    id: string;
    numero: string;
    fournisseurId?: string;
    ligneBudgetaireId?: string;
    projetId?: string;
    objet?: string;
    montant?: number;
  }>;
  lignesBudgetaires: Array<{ id: string; libelle: string }>;
  projets: Array<{ id: string; nom: string; code: string }>;
  currentClientId: string;
  currentExerciceId: string;
  onGenererNumero: () => Promise<string>;
  initialBonCommandeId?: string;
  initialEngagementId?: string;
  submitLabel?: string;
  scrollAreaClassName?: string;
  useScrollArea?: boolean;
}

export const FactureForm = ({
  facture,
  onSubmit,
  onCancel,
  onDirtyChange,
  fournisseurs,
  bonsCommande,
  engagements,
  lignesBudgetaires,
  projets,
  currentClientId,
  currentExerciceId,
  onGenererNumero,
  initialBonCommandeId,
  initialEngagementId,
  submitLabel,
  scrollAreaClassName = 'h-[72vh] pr-4',
  useScrollArea = true,
}: FactureFormProps) => {
  const { comptes } = useComptes();
  const { naturesCompte } = useNaturesCompte();
  const comptesCharge = useMemo(
    () => comptes.filter((compte) => compte.type === 'charge' && compte.statut === 'actif'),
    [comptes]
  );

  const [ventilations, setVentilations] = useState<FinancialVentilation[]>([]);
  const [chargePrincipaleMode, setChargePrincipaleMode] = useState<ChargePrincipaleMode>('nature');
  const [natureCompteChargeId, setNatureCompteChargeId] = useState<string>();
  const [compteChargeId, setCompteChargeId] = useState<string>();
  const initializedRef = useRef(false);
  const initialFinanceStateRef = useRef<string | null>(null);

  const serializeFinanceState = (
    currentVentilations: FinancialVentilation[],
    currentChargePrincipaleMode: ChargePrincipaleMode,
    currentNatureCompteChargeId?: string,
    currentCompteChargeId?: string,
  ) =>
    JSON.stringify({
      ventilations: currentVentilations,
      chargePrincipaleMode: currentChargePrincipaleMode,
      natureCompteChargeId: currentNatureCompteChargeId ?? null,
      compteChargeId: currentCompteChargeId ?? null,
    });

  const form = useForm<z.infer<typeof factureSchema>>({
    resolver: zodResolver(factureSchema),
    defaultValues: {
      numero: '',
      dateFacture: format(new Date(), 'yyyy-MM-dd'),
      dateEcheance: '',
      fournisseurId: '',
      bonCommandeId: 'none',
      engagementId: 'none',
      ligneBudgetaireId: 'none',
      projetId: 'none',
      objet: '',
      numeroFactureFournisseur: '',
      montantHT: 0,
      montantTTC: 0,
      montantNetPaye: 0,
      observations: '',
    },
  });

  useEffect(() => {
    initializedRef.current = false;
  }, [facture?.id, initialBonCommandeId, initialEngagementId]);

  useEffect(() => {
    if (initializedRef.current) return;

    if (!facture && initialBonCommandeId && bonsCommande.length === 0) return;
    if (!facture && initialEngagementId && engagements.length === 0) return;

    if (facture) {
      const normalizedChargePrincipale = normalizeChargePrincipaleForEditor(
        facture.chargePrincipaleMode,
        facture.natureCompteChargeId,
        facture.compteChargeId,
      );
      const nextVentilations = facture.ventilations || [];
      form.reset({
        numero: facture.numero,
        dateFacture: facture.dateFacture,
        dateEcheance: facture.dateEcheance || '',
        fournisseurId: facture.fournisseurId,
        bonCommandeId: facture.bonCommandeId || 'none',
        engagementId: facture.engagementId || 'none',
        ligneBudgetaireId: facture.ligneBudgetaireId || 'none',
        projetId: facture.projetId || 'none',
        objet: facture.objet,
        numeroFactureFournisseur: facture.numeroFactureFournisseur || '',
        montantHT: facture.montantHT,
        montantTTC: facture.montantTTC,
        montantNetPaye: facture.montantNetPaye || facture.montantTTC,
        observations: facture.observations || '',
      });
      setVentilations(nextVentilations);
      setChargePrincipaleMode(normalizedChargePrincipale.chargePrincipaleMode);
      setNatureCompteChargeId(normalizedChargePrincipale.natureCompteChargeId);
      setCompteChargeId(normalizedChargePrincipale.compteChargeId);
      initialFinanceStateRef.current = serializeFinanceState(
        nextVentilations,
        normalizedChargePrincipale.chargePrincipaleMode,
        normalizedChargePrincipale.natureCompteChargeId,
        normalizedChargePrincipale.compteChargeId,
      );
      initializedRef.current = true;
      return;
    }

    void onGenererNumero().then((numero) => {
      const selectedBC = initialBonCommandeId
        ? bonsCommande.find((bc) => bc.id === initialBonCommandeId)
        : undefined;
      const selectedEngagement = !selectedBC && initialEngagementId
        ? engagements.find((engagement) => engagement.id === initialEngagementId)
        : undefined;
      const montantTTC = selectedBC?.montant || selectedEngagement?.montant || 0;
      const montantHT = montantTTC > 0 ? Number((montantTTC / 1.2).toFixed(2)) : 0;

      form.reset({
        numero,
        dateFacture: format(new Date(), 'yyyy-MM-dd'),
        dateEcheance: '',
        fournisseurId: selectedBC?.fournisseur_id || selectedEngagement?.fournisseurId || '',
        bonCommandeId: selectedBC?.id || 'none',
        engagementId: selectedBC?.engagement_id || selectedEngagement?.id || 'none',
        ligneBudgetaireId: selectedBC?.ligne_budgetaire_id || selectedEngagement?.ligneBudgetaireId || 'none',
        projetId: selectedBC?.projet_id || selectedEngagement?.projetId || 'none',
        objet: selectedBC?.objet || selectedEngagement?.objet || '',
        numeroFactureFournisseur: '',
        montantHT,
        montantTTC,
        montantNetPaye: montantTTC,
        observations: '',
      });
      initialFinanceStateRef.current = serializeFinanceState([], 'nature');
      initializedRef.current = true;
    });

    setVentilations([]);
    setChargePrincipaleMode('nature');
    setNatureCompteChargeId(undefined);
    setCompteChargeId(undefined);
  }, [facture, onGenererNumero, initialBonCommandeId, initialEngagementId, bonsCommande, engagements, form]);

  const currentFinanceState = useMemo(
    () =>
      serializeFinanceState(
        ventilations,
        chargePrincipaleMode,
        natureCompteChargeId,
        compteChargeId,
      ),
    [ventilations, chargePrincipaleMode, natureCompteChargeId, compteChargeId]
  );

  const isDirty =
    form.formState.isDirty ||
    (initialFinanceStateRef.current !== null &&
      initialFinanceStateRef.current !== currentFinanceState);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    return () => onDirtyChange?.(false);
  }, [onDirtyChange]);

  useEffect(() => {
    if (chargePrincipaleMode !== 'nature' || !natureCompteChargeId) return;
    const nature = naturesCompte.find((item) => item.id === natureCompteChargeId);
    if (nature?.compteDefautId) {
      setCompteChargeId(nature.compteDefautId);
    }
  }, [chargePrincipaleMode, natureCompteChargeId, naturesCompte]);

  const watchedBonCommandeId = form.watch('bonCommandeId');
  const watchedEngagementId = form.watch('engagementId');
  const hasSelectedBonCommande = !!watchedBonCommandeId && watchedBonCommandeId !== 'none';
  const hasSelectedEngagement = !!watchedEngagementId && watchedEngagementId !== 'none';
  const isHydratedFromBonCommande = !facture && hasSelectedBonCommande;
  const isHydratedFromEngagement = !facture && !hasSelectedBonCommande && hasSelectedEngagement;
  const lockFactureInheritedFields = isHydratedFromBonCommande || isHydratedFromEngagement;
  const lockBonCommandeField = !!initialBonCommandeId;
  const lockEngagementField = !!initialEngagementId || isHydratedFromBonCommande;

  useEffect(() => {
    if (facture) return;

    const selectedBC =
      watchedBonCommandeId && watchedBonCommandeId !== 'none'
        ? bonsCommande.find((item) => item.id === watchedBonCommandeId)
        : undefined;

    if (selectedBC) {
      const montantTTC = selectedBC.montant || 0;
      const montantHT = montantTTC > 0 ? Number((montantTTC / 1.2).toFixed(2)) : 0;
      form.setValue('fournisseurId', selectedBC.fournisseur_id || '', { shouldDirty: true });
      form.setValue('engagementId', selectedBC.engagement_id || 'none', { shouldDirty: true });
      form.setValue('ligneBudgetaireId', selectedBC.ligne_budgetaire_id || 'none', { shouldDirty: true });
      form.setValue('projetId', selectedBC.projet_id || 'none', { shouldDirty: true });
      form.setValue('objet', selectedBC.objet || '', { shouldDirty: true });
      form.setValue('montantHT', montantHT, { shouldDirty: true });
      form.setValue('montantTTC', montantTTC, { shouldDirty: true });
      form.setValue('montantNetPaye', montantTTC, { shouldDirty: true });
      return;
    }

    const selectedEngagement =
      watchedEngagementId && watchedEngagementId !== 'none'
        ? engagements.find((item) => item.id === watchedEngagementId)
        : undefined;

    if (selectedEngagement) {
      const montant = selectedEngagement.montant || 0;
      form.setValue('fournisseurId', selectedEngagement.fournisseurId || '', { shouldDirty: true });
      form.setValue('ligneBudgetaireId', selectedEngagement.ligneBudgetaireId || 'none', { shouldDirty: true });
      form.setValue('projetId', selectedEngagement.projetId || 'none', { shouldDirty: true });
      form.setValue('objet', selectedEngagement.objet || '', { shouldDirty: true });
      form.setValue('montantHT', montant, { shouldDirty: true });
      form.setValue('montantTTC', montant, { shouldDirty: true });
      form.setValue('montantNetPaye', montant, { shouldDirty: true });
    }
  }, [bonsCommande, engagements, facture, form, watchedBonCommandeId, watchedEngagementId]);

  const breakdown = computeFinancialBreakdown(
    form.watch('montantHT') || 0,
    form.watch('montantTTC') || 0,
    form.watch('montantNetPaye') || 0,
    ventilations
  );
  const coherenceErrors = getCoherenceErrors(breakdown);

  const handleSubmit = async (values: z.infer<typeof factureSchema>) => {
    const resolvedChargePrincipale = resolveChargePrincipale({
      mode: chargePrincipaleMode,
      natureCompteId: natureCompteChargeId,
      compteChargeId,
      naturesCompte,
    });

    if (resolvedChargePrincipale.error) {
      form.setError('objet', { type: 'manual', message: resolvedChargePrincipale.error });
      return;
    }

    if (coherenceErrors.length > 0) {
      form.setError('montantNetPaye', { type: 'manual', message: coherenceErrors[0] });
      return;
    }

    const payload: CreateFactureInput = {
      clientId: currentClientId,
      exerciceId: currentExerciceId,
      numero: values.numero,
      dateFacture: values.dateFacture,
      dateEcheance: values.dateEcheance || undefined,
      fournisseurId: values.fournisseurId,
      bonCommandeId: values.bonCommandeId !== 'none' ? values.bonCommandeId : undefined,
      engagementId: values.engagementId !== 'none' ? values.engagementId : undefined,
      ligneBudgetaireId: values.ligneBudgetaireId !== 'none' ? values.ligneBudgetaireId : undefined,
      projetId: values.projetId !== 'none' ? values.projetId : undefined,
      objet: values.objet,
      numeroFactureFournisseur: values.numeroFactureFournisseur || undefined,
      montantHT: values.montantHT,
      montantTVA: sumTaxVentilations(ventilations),
      montantTTC: values.montantTTC,
      montantNetPaye: values.montantNetPaye,
      totalAjouts: breakdown.totalAjouts,
      totalRetraits: breakdown.totalRetraits,
      montantLiquide: facture?.montantLiquide || 0,
      chargePrincipaleMode: resolvedChargePrincipale.chargePrincipaleMode,
      natureCompteChargeId: resolvedChargePrincipale.natureCompteChargeId,
      compteChargeId: resolvedChargePrincipale.compteChargeId,
      ventilations,
      statut: facture?.statut || 'brouillon',
      observations: values.observations || undefined,
    };

    await onSubmit(payload);
  };

  const content = (
    <div className="space-y-10">
      <section className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold">Noyau de saisie</h3>
          <p className="text-sm text-muted-foreground">
            Identification de la piece, reference budgetaire, charge principale et montants pivots.
          </p>
        </div>
        <div className="rounded-md border p-4 md:p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField control={form.control} name="numero" render={({ field }) => (
              <FormItem><FormLabel>Numero AGILYS</FormLabel><FormControl><Input {...field} readOnly /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="numeroFactureFournisseur" render={({ field }) => (
              <FormItem><FormLabel>Numero facture fournisseur</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="dateFacture" render={({ field }) => (
              <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="dateEcheance" render={({ field }) => (
              <FormItem><FormLabel>Echeance</FormLabel><FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="fournisseurId" render={({ field }) => (
              <FormItem>
                <FormLabel>Fournisseur</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={lockFactureInheritedFields}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selectionner un fournisseur" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {fournisseurs.map((item) => <SelectItem key={item.id} value={item.id}>{item.nom} - {item.code}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="objet" render={({ field }) => (
                <FormItem><FormLabel>Objet</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="bonCommandeId" render={({ field }) => (
              <FormItem>
                <FormLabel>Bon de commande</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={lockBonCommandeField}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Aucun bon de commande" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {bonsCommande.map((item) => <SelectItem key={item.id} value={item.id}>{item.numero}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="engagementId" render={({ field }) => (
              <FormItem>
                <FormLabel>Engagement</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={lockEngagementField}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Aucun engagement" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {engagements.map((item) => <SelectItem key={item.id} value={item.id}>{item.numero}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="ligneBudgetaireId" render={({ field }) => (
              <FormItem>
                <FormLabel>Ligne budgetaire</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={lockFactureInheritedFields}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Aucune ligne budgetaire" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="none">Aucune</SelectItem>
                    {lignesBudgetaires.map((item) => <SelectItem key={item.id} value={item.id}>{item.libelle}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="projetId" render={({ field }) => (
              <FormItem>
                <FormLabel>Projet</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={lockFactureInheritedFields}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Aucun projet" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {projets.map((item) => <SelectItem key={item.id} value={item.id}>{item.code} - {item.nom}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div className="mt-6 space-y-6">
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
          </div>
        </div>
      </section>

      <FinancialVentilationSection
        ventilations={ventilations}
        onVentilationsChange={setVentilations}
        totalAjouts={breakdown.totalAjouts}
        totalRetraits={breakdown.totalRetraits}
        coherenceError={coherenceErrors[0]}
        entityLabel="la facture"
      />

      <section className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold">Informations annexes</h3>
          <p className="text-sm text-muted-foreground">
            Ajoutez les observations et précisions utiles au traitement ou au suivi de la facture.
          </p>
        </div>
        <div className="rounded-md border p-4 md:p-5">
          <FormField control={form.control} name="observations" render={({ field }) => (
            <FormItem><FormLabel>Observations</FormLabel><FormControl><Textarea rows={4} {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
      </section>
    </div>
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        {useScrollArea ? (
          <ScrollArea className={scrollAreaClassName}>{content}</ScrollArea>
        ) : (
          content
        )}

        <SinglePageFormFooter
          mode={facture ? 'edit' : 'create'}
          onCancel={onCancel}
          submitLabel={submitLabel}
          className="mt-4"
        />
      </form>
    </Form>
  );
};
