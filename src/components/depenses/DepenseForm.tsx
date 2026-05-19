import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { useLignesBudgetaires } from '@/hooks/useLignesBudgetaires';
import { useFournisseurs } from '@/hooks/useFournisseurs';
import { useProjets } from '@/hooks/useProjets';
import { useEngagements } from '@/hooks/useEngagements';
import { useFactures } from '@/hooks/useFactures';
import { useComptes } from '@/hooks/useComptes';
import { useNaturesCompte } from '@/hooks/useNaturesCompte';
import { ChargePrincipaleField } from '@/components/finance/ChargePrincipaleField';
import { FinancialQualificationSection } from '@/components/finance/FinancialQualificationSection';
import {
  normalizeChargePrincipaleForEditor,
  resolveChargePrincipale,
} from '@/lib/charge-principale-utils';
import {
  computeFinancialBreakdown,
  getCoherenceErrors,
} from '@/lib/financial-utils';
import type { Depense, DepenseFormData } from '@/types/depense.types';
import type { Engagement } from '@/types/engagement.types';
import type { Facture } from '@/types/facture.types';
import type {
  ChargePrincipaleMode,
  FinancialVentilation,
} from '@/types/financial.types';

const depenseSchema = z.object({
  engagementId: z.string().optional(),
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
}).superRefine((data, ctx) => {
  const hasEngagement = !!data.engagementId;
  const hasFacture = !!data.factureId;
  if (!hasEngagement && !hasFacture) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['engagementId'],
      message: 'Sélectionnez un engagement ou une facture.',
    });
  }
});

type DepenseSchemaValues = z.infer<typeof depenseSchema>;

interface DepenseFormProps {
  depense?: Depense;
  onSubmit: (data: DepenseFormData) => Promise<void>;
  onCancel: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
  preSelectedEngagement?: Engagement;
  preSelectedFacture?: Facture;
  submitLabel?: string;
  useScrollArea?: boolean;
}

export const DepenseForm = ({
  depense,
  onSubmit,
  onCancel,
  onDirtyChange,
  preSelectedEngagement,
  preSelectedFacture,
  submitLabel,
  useScrollArea = true,
}: DepenseFormProps) => {
  const { lignes: lignesBudgetaires } = useLignesBudgetaires();
  const { fournisseurs } = useFournisseurs();
  const { projets } = useProjets();
  const { engagements } = useEngagements();
  const { factures } = useFactures();
  const { comptes } = useComptes();
  const { naturesCompte } = useNaturesCompte();

  const comptesCharge = useMemo(
    () => comptes.filter((compte) => compte.type === 'charge' && compte.statut === 'actif'),
    [comptes]
  );

  const [typeImputation, setTypeImputation] = useState<'engagement' | 'facture'>('engagement');
  const [typeBeneficiaire, setTypeBeneficiaire] = useState<'fournisseur' | 'direct'>(
    'fournisseur'
  );
  const [ventilations, setVentilations] = useState<FinancialVentilation[]>([]);
  const [chargePrincipaleMode, setChargePrincipaleMode] =
    useState<ChargePrincipaleMode>('nature');
  const [natureCompteChargeId, setNatureCompteChargeId] = useState<string>();
  const [compteChargeId, setCompteChargeId] = useState<string>();
  const initializedRef = useRef(false);
  const initialEditorStateRef = useRef<string | null>(null);

  const serializeEditorState = (
    currentTypeImputation: 'engagement' | 'facture',
    currentTypeBeneficiaire: 'fournisseur' | 'direct',
    currentVentilations: FinancialVentilation[],
    currentChargePrincipaleMode: ChargePrincipaleMode,
    currentNatureCompteChargeId?: string,
    currentCompteChargeId?: string,
  ) =>
    JSON.stringify({
      typeImputation: currentTypeImputation,
      typeBeneficiaire: currentTypeBeneficiaire,
      ventilations: currentVentilations,
      chargePrincipaleMode: currentChargePrincipaleMode,
      natureCompteChargeId: currentNatureCompteChargeId ?? null,
      compteChargeId: currentCompteChargeId ?? null,
    });

  const form = useForm<DepenseSchemaValues>({
    resolver: zodResolver(depenseSchema),
    defaultValues: {
      engagementId: '',
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
  const watchedFactureId = form.watch('factureId');
  const hasInheritedFinancialStructure =
    !!preSelectedFacture?.id || !!depense?.factureId || (typeImputation === 'facture' && !!watchedFactureId);

  const setUnifiedFinancialAmount = (amount: number) => {
    form.setValue('montantHT', amount, { shouldDirty: true, shouldValidate: true });
    form.setValue('montantTTC', amount, { shouldDirty: true, shouldValidate: true });
    form.setValue('montantNetPaye', amount, { shouldDirty: true, shouldValidate: true });
  };

  useEffect(() => {
    initializedRef.current = false;
  }, [depense?.id, preSelectedEngagement?.id, preSelectedFacture?.id]);

  useEffect(() => {
    if (initializedRef.current) return;

    if (depense) {
      const normalizedChargePrincipale = normalizeChargePrincipaleForEditor(
        depense.chargePrincipaleMode,
        depense.natureCompteChargeId,
        depense.compteChargeId,
      );

      form.reset({
        engagementId: depense.engagementId || '',
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
      setChargePrincipaleMode(normalizedChargePrincipale.chargePrincipaleMode);
      setNatureCompteChargeId(normalizedChargePrincipale.natureCompteChargeId);
      setCompteChargeId(normalizedChargePrincipale.compteChargeId);
      const nextTypeImputation = depense.factureId
        ? 'facture'
        : 'engagement';
      const nextTypeBeneficiaire = depense.fournisseurId ? 'fournisseur' : 'direct';
      setTypeImputation(nextTypeImputation);
      setTypeBeneficiaire(nextTypeBeneficiaire);
      initialEditorStateRef.current = serializeEditorState(
        nextTypeImputation,
        nextTypeBeneficiaire,
        depense.ventilations || [],
        normalizedChargePrincipale.chargePrincipaleMode,
        normalizedChargePrincipale.natureCompteChargeId,
        normalizedChargePrincipale.compteChargeId,
      );
      initializedRef.current = true;
      return;
    }

    const selectedFacture = preSelectedFacture || undefined;
    const selectedEngagement = preSelectedEngagement || undefined;
    if (selectedFacture) {
      const normalizedChargePrincipale = normalizeChargePrincipaleForEditor(
        selectedFacture.chargePrincipaleMode,
        selectedFacture.natureCompteChargeId,
        selectedFacture.compteChargeId,
      );

      setTypeImputation('facture');
      setTypeBeneficiaire('fournisseur');
      form.reset({
        engagementId: selectedFacture.engagementId || '',
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
      setChargePrincipaleMode(normalizedChargePrincipale.chargePrincipaleMode);
      setNatureCompteChargeId(normalizedChargePrincipale.natureCompteChargeId);
      setCompteChargeId(normalizedChargePrincipale.compteChargeId);
      initialEditorStateRef.current = serializeEditorState(
        'facture',
        'fournisseur',
        selectedFacture.ventilations || [],
        normalizedChargePrincipale.chargePrincipaleMode,
        normalizedChargePrincipale.natureCompteChargeId,
        normalizedChargePrincipale.compteChargeId,
      );
      initializedRef.current = true;
      return;
    }

    if (selectedEngagement) {
      setTypeImputation('engagement');
      setTypeBeneficiaire(selectedEngagement.fournisseurId ? 'fournisseur' : 'direct');
      form.reset({
        engagementId: selectedEngagement.id,
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
      initialEditorStateRef.current = serializeEditorState(
        'engagement',
        selectedEngagement.fournisseurId ? 'fournisseur' : 'direct',
        [],
        'nature',
      );
      initializedRef.current = true;
      return;
    }

    setTypeImputation('engagement');
    setTypeBeneficiaire('fournisseur');
    setVentilations([]);
    setChargePrincipaleMode('nature');
    setNatureCompteChargeId(undefined);
    setCompteChargeId(undefined);
    form.reset({
      engagementId: '',
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
    initialEditorStateRef.current = serializeEditorState('engagement', 'fournisseur', [], 'nature');
    initializedRef.current = true;
  }, [
    depense,
    form,
    preSelectedEngagement,
    preSelectedFacture,
  ]);

  const watchedEngagementId = form.watch('engagementId');
  const hasSelectedEngagement = !!watchedEngagementId;
  const manualSelectedEngagement = useMemo(
    () => engagements.find((engagement) => engagement.id === watchedEngagementId),
    [engagements, watchedEngagementId]
  );
  const manualSelectedFacture = useMemo(
    () => factures.find((facture) => facture.id === watchedFactureId),
    [factures, watchedFactureId]
  );

  useEffect(() => {
    if (depense || preSelectedEngagement || preSelectedFacture) return;

    if (typeImputation === 'engagement' && manualSelectedEngagement) {
      setTypeBeneficiaire(manualSelectedEngagement.fournisseurId ? 'fournisseur' : 'direct');
      form.setValue('factureId', '', { shouldDirty: true });
      form.setValue('ligneBudgetaireId', manualSelectedEngagement.ligneBudgetaireId || '', { shouldDirty: true });
      form.setValue('fournisseurId', manualSelectedEngagement.fournisseurId || '', { shouldDirty: true });
      form.setValue('beneficiaire', manualSelectedEngagement.beneficiaire || '', { shouldDirty: true });
      form.setValue('projetId', manualSelectedEngagement.projetId || '', { shouldDirty: true });
      form.setValue('objet', manualSelectedEngagement.objet, { shouldDirty: true });
      form.setValue('montantHT', manualSelectedEngagement.solde || manualSelectedEngagement.montant, { shouldDirty: true });
      form.setValue('montantTTC', manualSelectedEngagement.solde || manualSelectedEngagement.montant, { shouldDirty: true });
      form.setValue('montantNetPaye', manualSelectedEngagement.solde || manualSelectedEngagement.montant, { shouldDirty: true });
      setVentilations([]);
      setChargePrincipaleMode('nature');
      setNatureCompteChargeId(undefined);
      setCompteChargeId(undefined);
    }

    if (typeImputation === 'facture' && manualSelectedFacture) {
      const normalizedChargePrincipale = normalizeChargePrincipaleForEditor(
        manualSelectedFacture.chargePrincipaleMode,
        manualSelectedFacture.natureCompteChargeId,
        manualSelectedFacture.compteChargeId,
      );
      setTypeBeneficiaire('fournisseur');
      form.setValue('engagementId', manualSelectedFacture.engagementId || '', { shouldDirty: true });
      form.setValue('ligneBudgetaireId', manualSelectedFacture.ligneBudgetaireId || '', { shouldDirty: true });
      form.setValue('fournisseurId', manualSelectedFacture.fournisseurId, { shouldDirty: true });
      form.setValue('beneficiaire', '', { shouldDirty: true });
      form.setValue('projetId', manualSelectedFacture.projetId || '', { shouldDirty: true });
      form.setValue('objet', manualSelectedFacture.objet, { shouldDirty: true });
      form.setValue('montantHT', manualSelectedFacture.montantHT, { shouldDirty: true });
      form.setValue('montantTTC', manualSelectedFacture.montantTTC, { shouldDirty: true });
      form.setValue('montantNetPaye', manualSelectedFacture.montantNetPaye || manualSelectedFacture.montantTTC, { shouldDirty: true });
      setVentilations(manualSelectedFacture.ventilations || []);
      setChargePrincipaleMode(normalizedChargePrincipale.chargePrincipaleMode);
      setNatureCompteChargeId(normalizedChargePrincipale.natureCompteChargeId);
      setCompteChargeId(normalizedChargePrincipale.compteChargeId);
    }
  }, [
    depense,
    factures,
    form,
    manualSelectedEngagement,
    manualSelectedFacture,
    preSelectedEngagement,
    preSelectedFacture,
    typeImputation,
  ]);

  const currentEditorState = useMemo(
    () =>
      serializeEditorState(
        typeImputation,
        typeBeneficiaire,
        ventilations,
        chargePrincipaleMode,
        natureCompteChargeId,
        compteChargeId,
      ),
    [typeImputation, typeBeneficiaire, ventilations, chargePrincipaleMode, natureCompteChargeId, compteChargeId]
  );

  const isDirty =
    form.formState.isDirty ||
    (initialEditorStateRef.current !== null &&
      initialEditorStateRef.current !== currentEditorState);

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

  const breakdown = computeFinancialBreakdown(
    form.watch('montantHT') || 0,
    form.watch('montantTTC') || 0,
    form.watch('montantNetPaye') || 0,
    ventilations
  );
  const coherenceErrors = getCoherenceErrors(breakdown);
  const lockImputationSource = !!preSelectedEngagement || !!preSelectedFacture;
  const lockTypeBeneficiaire =
    !!preSelectedFacture ||
    (typeImputation === 'engagement' && hasSelectedEngagement);
  const lockDepenseInheritedFields =
    !!preSelectedFacture ||
    (!!preSelectedEngagement && typeImputation === 'engagement') ||
    (typeImputation === 'facture' && !!watchedFactureId) ||
    (typeImputation === 'engagement' && hasSelectedEngagement);

  const handleSubmit = async (values: DepenseSchemaValues) => {
    const resolvedChargePrincipale = hasInheritedFinancialStructure
      ? {
          chargePrincipaleMode: undefined,
          natureCompteChargeId: undefined,
          compteChargeId: undefined,
          error: undefined,
        }
      : resolveChargePrincipale({
          mode: chargePrincipaleMode,
          natureCompteId: natureCompteChargeId,
          compteChargeId,
          naturesCompte,
        });

    if (resolvedChargePrincipale.error) {
      form.setError('objet', { type: 'manual', message: resolvedChargePrincipale.error });
      return;
    }

    if (!hasInheritedFinancialStructure && coherenceErrors.length > 0) {
      form.setError('montantNetPaye', { type: 'manual', message: coherenceErrors[0] });
      return;
    }

    const montantExecution = values.montantTTC;

    const payload: DepenseFormData = {
      engagementId: values.engagementId || undefined,
      reservationCreditId: undefined,
      ligneBudgetaireId: values.ligneBudgetaireId || undefined,
      factureId: values.factureId || undefined,
      fournisseurId: typeBeneficiaire === 'fournisseur' ? values.fournisseurId || undefined : undefined,
      beneficiaire: typeBeneficiaire === 'direct' ? values.beneficiaire || undefined : undefined,
      projetId: values.projetId || undefined,
      objet: values.objet,
      montant: montantExecution,
      montantHT: hasInheritedFinancialStructure ? montantExecution : values.montantHT,
      montantTTC: montantExecution,
      montantNetPaye: hasInheritedFinancialStructure ? montantExecution : values.montantNetPaye,
      totalAjouts: hasInheritedFinancialStructure ? 0 : breakdown.totalAjouts,
      totalRetraits: hasInheritedFinancialStructure ? 0 : breakdown.totalRetraits,
      dateDepense: values.dateDepense,
      modePaiement: values.modePaiement as DepenseFormData['modePaiement'],
      referencePaiement: values.referencePaiement || undefined,
      observations: values.observations || undefined,
      chargePrincipaleMode: resolvedChargePrincipale.chargePrincipaleMode,
      natureCompteChargeId: resolvedChargePrincipale.natureCompteChargeId,
      compteChargeId: resolvedChargePrincipale.compteChargeId,
      ventilations: hasInheritedFinancialStructure ? [] : ventilations,
    };

    await onSubmit(payload);
  };

  const body = (
    <div className="space-y-10">
      <section className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold tracking-tight">Noyau de saisie</h3>
          <p className="text-sm text-muted-foreground">
            Identifiez la dépense, son imputation et son bénéficiaire.
          </p>
        </div>
        <Card>
          <CardContent className="space-y-6 pt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <FormLabel>Type d&apos;imputation</FormLabel>
                <Select
                  value={typeImputation}
                  onValueChange={(value) =>
                    setTypeImputation(value as 'engagement' | 'facture')
                  }
                  disabled={lockImputationSource}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="engagement">Depuis engagement</SelectItem>
                    <SelectItem value="facture">Depuis facture</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <FormLabel>Type de bénéficiaire</FormLabel>
                <Select
                  value={typeBeneficiaire}
                  onValueChange={(value) =>
                    setTypeBeneficiaire(value as 'fournisseur' | 'direct')
                  }
                  disabled={lockTypeBeneficiaire}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fournisseur">Fournisseur</SelectItem>
                    <SelectItem value="direct">Bénéficiaire direct</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {typeImputation === 'engagement' ? (
                <FormField
                  control={form.control}
                  name="engagementId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Engagement</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!!preSelectedEngagement}
                      >
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Sélectionner un engagement" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {engagements.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.numero}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}

              {typeImputation === 'facture' ? (
                <FormField
                  control={form.control}
                  name="factureId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Facture</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!!preSelectedFacture}
                      >
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Sélectionner une facture" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {factures.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.numero}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}

              <FormField
                control={form.control}
                name="ligneBudgetaireId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ligne budgétaire</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={lockDepenseInheritedFields}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Sélectionner une ligne budgétaire" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {lignesBudgetaires.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.libelle}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {typeBeneficiaire === 'fournisseur' ? (
                <FormField
                  control={form.control}
                  name="fournisseurId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fournisseur</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={lockDepenseInheritedFields}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Sélectionner un fournisseur" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {fournisseurs.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.nom} - {item.code}
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
                      <FormLabel>Bénéficiaire</FormLabel>
                      <FormControl><Input {...field} value={field.value || ''} disabled={lockDepenseInheritedFields} /></FormControl>
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
                    <FormLabel>Projet</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={lockDepenseInheritedFields}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Sélectionner un projet" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projets.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.code} - {item.nom}
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
                  <FormItem className="md:col-span-2">
                    <FormLabel>Objet</FormLabel>
                    <FormControl><Input {...field} disabled={lockDepenseInheritedFields} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

          </CardContent>
        </Card>
      </section>

      <FinancialQualificationSection
        mode={hasInheritedFinancialStructure ? 'inherited' : 'editable'}
        title="Qualification financière"
        editableDescription="Qualifiez comptablement le montant de la dépense et vérifiez sa ventilation."
        inheritedDescription="La charge est héritée de la facture source. Seul le montant de la dépense reste saisissable."
        chargeField={
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
        }
        amountFields={
          <div className="grid gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="montantHT"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Montant HT</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="montantTTC"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Montant TTC</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="montantNetPaye"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Montant net payé</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        }
        inheritedAmountField={
          <FormField
            control={form.control}
            name="montantTTC"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Montant de la dépense</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    value={field.value}
                    onChange={(event) => {
                      const amount = Number(event.target.value) || 0;
                      field.onChange(amount);
                      setUnifiedFinancialAmount(amount);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        }
        ventilations={ventilations}
        onVentilationsChange={setVentilations}
        totalAjouts={breakdown.totalAjouts}
        totalRetraits={breakdown.totalRetraits}
        coherenceError={coherenceErrors[0]}
        ventilationEntityLabel="la dépense"
      />

      <section className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold tracking-tight">Informations annexes</h3>
          <p className="text-sm text-muted-foreground">
            Ajoutez les éléments utiles au paiement et au suivi opérationnel de la dépense.
          </p>
        </div>
        <Card>
          <CardContent className="space-y-6 pt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="dateDepense"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="modePaiement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mode de paiement</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Sélectionner un mode" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="virement">Virement</SelectItem>
                        <SelectItem value="cheque">Chèque</SelectItem>
                        <SelectItem value="especes">Espèces</SelectItem>
                        <SelectItem value="carte">Carte</SelectItem>
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
                    <FormLabel>Référence de paiement</FormLabel>
                    <FormControl><Input {...field} value={field.value || ''} /></FormControl>
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
                    <FormControl><Textarea rows={4} {...field} value={field.value || ''} /></FormControl>
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
        {useScrollArea ? <ScrollArea className="h-[72vh] pr-4">{body}</ScrollArea> : body}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="submit">{submitLabel || (depense ? 'Enregistrer' : 'Créer la dépense')}</Button>
        </div>
      </form>
    </Form>
  );
};
