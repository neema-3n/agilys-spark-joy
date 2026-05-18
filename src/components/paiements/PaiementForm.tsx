import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { useDepenses } from '@/hooks/useDepenses';
import { useEngagements } from '@/hooks/useEngagements';
import { useLignesBudgetaires } from '@/hooks/useLignesBudgetaires';
import { useFournisseurs } from '@/hooks/useFournisseurs';
import { useProjets } from '@/hooks/useProjets';
import { useComptes } from '@/hooks/useComptes';
import { useNaturesCompte } from '@/hooks/useNaturesCompte';
import { useComptesTresorerie } from '@/hooks/useComptesTresorerie';
import { Paiement, PaiementFormData } from '@/types/paiement.types';
import { ChargePrincipaleField } from '@/components/finance/ChargePrincipaleField';
import { FinancialQualificationSection } from '@/components/finance/FinancialQualificationSection';
import {
  normalizeChargePrincipaleForEditor,
  resolveChargePrincipale,
} from '@/lib/charge-principale-utils';
import { computeFinancialBreakdown, getCoherenceErrors } from '@/lib/financial-utils';
import type { ChargePrincipaleMode, FinancialVentilation } from '@/types/financial.types';

const formSchema = z.object({
  depenseId: z.string().optional(),
  engagementId: z.string().optional(),
  ligneBudgetaireId: z.string().optional(),
  fournisseurId: z.string().optional(),
  beneficiaire: z.string().optional(),
  projetId: z.string().optional(),
  objet: z.string().optional(),
  montantHT: z.coerce.number().positive('Le montant HT est requis'),
  montantTTC: z.coerce.number().positive('Le montant TTC est requis'),
  montantNetPaye: z.coerce.number().positive('Le montant net payé est requis'),
  datePaiement: z.string().min(1, 'La date est requise'),
  modePaiement: z.enum(['virement', 'cheque', 'especes', 'carte', 'autre']),
  compteTresorerieId: z.string().min(1, 'Le compte de trésorerie est requis'),
  referencePaiement: z.string().optional(),
  observations: z.string().optional(),
});

interface PaiementFormProps {
  paiement?: Paiement;
  initialDepenseId?: string;
  onSubmit: (data: PaiementFormData) => Promise<void>;
  onCancel: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
  submitLabel?: string;
  useScrollArea?: boolean;
}

export const PaiementForm = ({
  paiement,
  initialDepenseId,
  onSubmit,
  onCancel,
  onDirtyChange,
  submitLabel,
  useScrollArea = true,
}: PaiementFormProps) => {
  const { depenses } = useDepenses();
  const { engagements } = useEngagements();
  const { lignes: lignesBudgetaires } = useLignesBudgetaires();
  const { fournisseurs } = useFournisseurs();
  const { projets } = useProjets();
  const { comptes } = useComptes();
  const { naturesCompte } = useNaturesCompte();
  const { comptesActifs: comptesTresorerie, isLoading: loadingComptesTresorerie } =
    useComptesTresorerie();

  const comptesCharge = useMemo(
    () => comptes.filter((compte) => compte.type === 'charge' && compte.statut === 'actif'),
    [comptes]
  );
  const [modeSource, setModeSource] = useState<'depense' | 'direct'>(initialDepenseId ? 'depense' : 'direct');
  const [ventilations, setVentilations] = useState<FinancialVentilation[]>([]);
  const [chargePrincipaleMode, setChargePrincipaleMode] = useState<ChargePrincipaleMode>('nature');
  const [natureCompteChargeId, setNatureCompteChargeId] = useState<string>();
  const [compteChargeId, setCompteChargeId] = useState<string>();
  const [submitStatus, setSubmitStatus] = useState<'brouillon' | 'valide'>('brouillon');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initializedRef = useRef(false);
  const initialEditorStateRef = useRef<string | null>(null);
  const hydratedDepenseIdRef = useRef<string | null>(null);

  const serializeEditorState = (
    currentModeSource: 'depense' | 'direct',
    currentVentilations: FinancialVentilation[],
    currentChargePrincipaleMode: ChargePrincipaleMode,
    currentNatureCompteChargeId?: string,
    currentCompteChargeId?: string,
  ) =>
    JSON.stringify({
      modeSource: currentModeSource,
      ventilations: currentVentilations,
      chargePrincipaleMode: currentChargePrincipaleMode,
      natureCompteChargeId: currentNatureCompteChargeId ?? null,
      compteChargeId: currentCompteChargeId ?? null,
    });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      depenseId: initialDepenseId,
      engagementId: '',
      ligneBudgetaireId: '',
      fournisseurId: '',
      beneficiaire: '',
      projetId: '',
      objet: '',
      montantHT: 0,
      montantTTC: 0,
      montantNetPaye: 0,
      datePaiement: new Date().toISOString().split('T')[0],
      modePaiement: 'virement',
      compteTresorerieId: '',
      referencePaiement: '',
      observations: '',
    },
  });
  const watchedDepenseId = form.watch('depenseId');
  const selectedDepenseId = initialDepenseId || watchedDepenseId || '';
  const selectedDepense = useMemo(
    () => depenses.find((item) => item.id === selectedDepenseId),
    [depenses, selectedDepenseId]
  );
  const linkedDepense = useMemo(() => {
    const targetDepenseId = initialDepenseId || watchedDepenseId || paiement?.depenseId;
    return targetDepenseId ? depenses.find((item) => item.id === targetDepenseId) : undefined;
  }, [depenses, initialDepenseId, paiement?.depenseId, watchedDepenseId]);
  const ligneBudgetaireOptions = useMemo(() => {
    if (!linkedDepense?.ligneBudgetaire) return lignesBudgetaires;
    const linkedLineId = linkedDepense.ligneBudgetaireId || linkedDepense.ligneBudgetaire.id;
    if (!linkedLineId || lignesBudgetaires.some((item) => item.id === linkedLineId)) {
      return lignesBudgetaires;
    }

    return [
      ...lignesBudgetaires,
      {
        id: linkedDepense.ligneBudgetaire.id,
        libelle: linkedDepense.ligneBudgetaire.libelle,
        disponible: linkedDepense.ligneBudgetaire.disponible,
      },
    ];
  }, [lignesBudgetaires, linkedDepense]);
  const fournisseurOptions = useMemo(() => {
    if (!linkedDepense?.fournisseur) return fournisseurs;
    const linkedFournisseurId = linkedDepense.fournisseurId || linkedDepense.fournisseur.id;
    if (!linkedFournisseurId || fournisseurs.some((item) => item.id === linkedFournisseurId)) {
      return fournisseurs;
    }

    return [
      ...fournisseurs,
      {
        ...linkedDepense.fournisseur,
        clientId: '',
        type: 'personne_morale',
        statut: 'actif',
        dateCreation: '',
        dateModification: '',
      },
    ];
  }, [fournisseurs, linkedDepense]);
  const projetOptions = useMemo(() => {
    if (!linkedDepense?.projet) return projets;
    const linkedProjetId = linkedDepense.projetId || linkedDepense.projet.id;
    if (!linkedProjetId || projets.some((item) => item.id === linkedProjetId)) {
      return projets;
    }

    return [
      ...projets,
      {
        ...linkedDepense.projet,
      },
    ];
  }, [linkedDepense, projets]);
  const hasInheritedFinancialStructure =
    !!linkedDepense?.factureId && (modeSource === 'depense' || !!paiement?.depenseId || !!initialDepenseId);

  const setUnifiedFinancialAmount = (amount: number) => {
    form.setValue('montantHT', amount, { shouldDirty: true, shouldValidate: true });
    form.setValue('montantTTC', amount, { shouldDirty: true, shouldValidate: true });
    form.setValue('montantNetPaye', amount, { shouldDirty: true, shouldValidate: true });
  };

  const hydrateFromDepense = (depenseSource: typeof depenses[number], depenseSourceId: string) => {
    const normalizedChargePrincipale = normalizeChargePrincipaleForEditor(
      depenseSource.chargePrincipaleMode,
      depenseSource.natureCompteChargeId,
      depenseSource.compteChargeId,
    );
    const montantRestant = depenseSource.montant - depenseSource.montantPaye;

    form.reset({
      depenseId: depenseSourceId,
      engagementId: depenseSource.engagementId || '',
      ligneBudgetaireId: depenseSource.ligneBudgetaireId || depenseSource.ligneBudgetaire?.id || '',
      fournisseurId: depenseSource.fournisseurId || depenseSource.fournisseur?.id || '',
      beneficiaire: depenseSource.beneficiaire || '',
      projetId: depenseSource.projetId || depenseSource.projet?.id || '',
      objet: depenseSource.objet,
      montantHT: depenseSource.montantHT || montantRestant || depenseSource.montant,
      montantTTC: depenseSource.montantTTC || montantRestant || depenseSource.montant,
      montantNetPaye: montantRestant || depenseSource.montantNetPaye || depenseSource.montant,
      datePaiement: new Date().toISOString().split('T')[0],
      modePaiement: 'virement',
      compteTresorerieId: '',
      referencePaiement: '',
      observations: '',
    });
    setVentilations(depenseSource.ventilations || []);
    setChargePrincipaleMode(normalizedChargePrincipale.chargePrincipaleMode);
    setNatureCompteChargeId(normalizedChargePrincipale.natureCompteChargeId);
    setCompteChargeId(normalizedChargePrincipale.compteChargeId);
    initialEditorStateRef.current = serializeEditorState(
      'depense',
      depenseSource.ventilations || [],
      normalizedChargePrincipale.chargePrincipaleMode,
      normalizedChargePrincipale.natureCompteChargeId,
      normalizedChargePrincipale.compteChargeId,
    );
  };

  useEffect(() => {
    if (initializedRef.current) return;
    if (initialDepenseId && !selectedDepense) return;

    setModeSource(initialDepenseId ? 'depense' : 'direct');

    if (paiement) {
      const normalizedChargePrincipale = normalizeChargePrincipaleForEditor(
        paiement.chargePrincipaleMode,
        paiement.natureCompteChargeId,
        paiement.compteChargeId,
      );
      form.reset({
        depenseId: paiement.depenseId || '',
        engagementId: paiement.engagementId || '',
        ligneBudgetaireId: paiement.ligneBudgetaireId || '',
        fournisseurId: paiement.fournisseurId || '',
        beneficiaire: paiement.beneficiaire || '',
        projetId: paiement.projetId || '',
        objet: paiement.objet || '',
        montantHT: paiement.montantHT || paiement.montant,
        montantTTC: paiement.montantTTC || paiement.montant,
        montantNetPaye: paiement.montantNetPaye || paiement.montant,
        datePaiement: paiement.datePaiement,
        modePaiement: paiement.modePaiement,
        compteTresorerieId: paiement.compteTresorerieId || '',
        referencePaiement: paiement.referencePaiement || '',
        observations: paiement.observations || '',
      });
      setVentilations(paiement.ventilations || []);
      setChargePrincipaleMode(normalizedChargePrincipale.chargePrincipaleMode);
      setNatureCompteChargeId(normalizedChargePrincipale.natureCompteChargeId);
      setCompteChargeId(normalizedChargePrincipale.compteChargeId);
      initialEditorStateRef.current = serializeEditorState(
        paiement.depenseId ? 'depense' : 'direct',
        paiement.ventilations || [],
        normalizedChargePrincipale.chargePrincipaleMode,
        normalizedChargePrincipale.natureCompteChargeId,
        normalizedChargePrincipale.compteChargeId,
      );
      initializedRef.current = true;
      return;
    }

    if (initialDepenseId && selectedDepense) {
      hydrateFromDepense(selectedDepense, initialDepenseId);
      hydratedDepenseIdRef.current = selectedDepense.id;
      initializedRef.current = true;
      return;
    }

    form.reset({
      depenseId: '',
      engagementId: '',
      ligneBudgetaireId: '',
      fournisseurId: '',
      beneficiaire: '',
      projetId: '',
      objet: '',
      montantHT: 0,
      montantTTC: 0,
      montantNetPaye: 0,
      datePaiement: new Date().toISOString().split('T')[0],
      modePaiement: 'virement',
      compteTresorerieId: '',
      referencePaiement: '',
      observations: '',
    });
    setVentilations([]);
    setChargePrincipaleMode('nature');
    setNatureCompteChargeId(undefined);
    setCompteChargeId(undefined);
    hydratedDepenseIdRef.current = null;
    initialEditorStateRef.current = serializeEditorState('direct', [], 'nature');
    initializedRef.current = true;
  }, [form, initialDepenseId, paiement, selectedDepense]);

  useEffect(() => {
    if (paiement || modeSource !== 'depense' || !selectedDepenseId || !selectedDepense) return;
    if (hydratedDepenseIdRef.current === selectedDepense.id) return;

    hydrateFromDepense(selectedDepense, selectedDepenseId);
    hydratedDepenseIdRef.current = selectedDepense.id;
  }, [form, modeSource, paiement, selectedDepense, selectedDepenseId]);

  useEffect(() => {
    if (modeSource !== 'depense') {
      hydratedDepenseIdRef.current = null;
    }
  }, [modeSource]);

  const currentEditorState = useMemo(
    () =>
      serializeEditorState(
        modeSource,
        ventilations,
        chargePrincipaleMode,
        natureCompteChargeId,
        compteChargeId,
      ),
    [modeSource, ventilations, chargePrincipaleMode, natureCompteChargeId, compteChargeId]
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

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
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

    const montantExecution = values.montantNetPaye;

    const payload: PaiementFormData = {
      depenseId: modeSource === 'depense' ? (values.depenseId || initialDepenseId) : undefined,
      engagementId: modeSource === 'direct' ? values.engagementId || undefined : values.engagementId || undefined,
      ligneBudgetaireId: values.ligneBudgetaireId || undefined,
      fournisseurId: values.fournisseurId || undefined,
      beneficiaire: values.beneficiaire || undefined,
      projetId: values.projetId || undefined,
      objet: values.objet || undefined,
      montant: montantExecution,
      montantHT: hasInheritedFinancialStructure ? montantExecution : values.montantHT,
      montantTTC: hasInheritedFinancialStructure ? montantExecution : values.montantTTC,
      montantNetPaye: montantExecution,
      totalAjouts: hasInheritedFinancialStructure ? 0 : breakdown.totalAjouts,
      totalRetraits: hasInheritedFinancialStructure ? 0 : breakdown.totalRetraits,
      datePaiement: values.datePaiement,
      modePaiement: values.modePaiement,
      compteTresorerieId: values.compteTresorerieId,
      referencePaiement: values.referencePaiement || undefined,
      observations: values.observations || undefined,
      chargePrincipaleMode: resolvedChargePrincipale.chargePrincipaleMode,
      natureCompteChargeId: resolvedChargePrincipale.natureCompteChargeId,
      compteChargeId: resolvedChargePrincipale.compteChargeId,
      ventilations: hasInheritedFinancialStructure ? [] : ventilations,
      statut: submitStatus,
    };

    setIsSubmitting(true);
    try {
      await onSubmit(payload);
      form.reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = (
    <div className="space-y-10">
      <section className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold tracking-tight">Noyau de saisie</h3>
          <p className="text-sm text-muted-foreground">
            Définissez la source du paiement et ses rattachements.
          </p>
        </div>
        <Card>
          <CardContent className="space-y-6 pt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <FormLabel>Mode</FormLabel>
                <Select value={modeSource} onValueChange={(value) => setModeSource(value as typeof modeSource)} disabled={!!initialDepenseId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="depense">Paiement sur dépense</SelectItem>
                    <SelectItem value="direct">Paiement direct</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {modeSource === 'depense' ? (
                <FormField control={form.control} name="depenseId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dépense</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || initialDepenseId || ''} disabled={!!initialDepenseId}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner une dépense" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {depenses.filter((item) => item.statut === 'ordonnancee' || item.statut === 'payee').map((item) => (
                          <SelectItem key={item.id} value={item.id}>{item.numero}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              ) : (
                <FormField control={form.control} name="engagementId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Engagement minimal</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner un engagement" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {engagements.map((item) => (
                          <SelectItem key={item.id} value={item.id}>{item.numero}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              <FormField control={form.control} name="ligneBudgetaireId" render={({ field }) => (
                <FormItem>
                    <FormLabel>Ligne budgétaire</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner une ligne budgétaire" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {ligneBudgetaireOptions.map((item) => (
                          <SelectItem key={item.id} value={item.id}>{item.libelle}</SelectItem>
                        ))}
                      </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="fournisseurId" render={({ field }) => (
                <FormItem>
                    <FormLabel>Fournisseur</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner un fournisseur" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {fournisseurOptions.map((item) => (
                          <SelectItem key={item.id} value={item.id}>{item.nom} - {item.code}</SelectItem>
                        ))}
                      </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="beneficiaire" render={({ field }) => (
                <FormItem>
                  <FormLabel>Bénéficiaire libre</FormLabel>
                  <FormControl><Input {...field} value={field.value || ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="projetId" render={({ field }) => (
                <FormItem>
                    <FormLabel>Projet</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner un projet" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {projetOptions.map((item) => (
                          <SelectItem key={item.id} value={item.id}>{item.code} - {item.nom}</SelectItem>
                        ))}
                      </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="objet" render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Objet</FormLabel>
                  <FormControl><Input {...field} value={field.value || ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </CardContent>
        </Card>
      </section>

      <FinancialQualificationSection
        mode={hasInheritedFinancialStructure ? 'inherited' : 'editable'}
        title="Qualification financière"
        editableDescription="Qualifiez comptablement le montant du paiement et vérifiez sa ventilation."
        inheritedDescription="Le règlement hérite de la facture source. Seul le montant du paiement reste saisissable."
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
            <FormField control={form.control} name="montantHT" render={({ field }) => (
              <FormItem><FormLabel>Montant HT</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="montantTTC" render={({ field }) => (
              <FormItem><FormLabel>Montant TTC</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="montantNetPaye" render={({ field }) => (
              <FormItem><FormLabel>Montant net payé</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
        }
        inheritedAmountField={
          <FormField
            control={form.control}
            name="montantNetPaye"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Montant du paiement</FormLabel>
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
        ventilationEntityLabel="le paiement"
      />

      <section className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold tracking-tight">Informations annexes</h3>
          <p className="text-sm text-muted-foreground">
            Renseignez les informations de règlement utiles au suivi du paiement.
          </p>
        </div>
        <Card>
          <CardContent className="space-y-6 pt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField control={form.control} name="datePaiement" render={({ field }) => (
                <FormItem><FormLabel>Date de paiement</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="modePaiement" render={({ field }) => (
                <FormItem>
                  <FormLabel>Mode de paiement</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
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
              )} />
              <FormField control={form.control} name="compteTresorerieId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Compte de trésorerie</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={loadingComptesTresorerie}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner un compte" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {comptesTresorerie.map((compte) => (
                        <SelectItem key={compte.id} value={compte.id}>
                          {compte.code} - {compte.libelle} ({compte.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="referencePaiement" render={({ field }) => (
                <FormItem><FormLabel>Référence</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="observations" render={({ field }) => (
                <FormItem className="md:col-span-2"><FormLabel>Observations</FormLabel><FormControl><Textarea rows={4} {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {useScrollArea ? <ScrollArea className="h-[72vh] pr-4">{content}</ScrollArea> : content}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
          <Button
            type="submit"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => setSubmitStatus('brouillon')}
          >
            {isSubmitting ? 'Enregistrement...' : paiement ? 'Mettre à jour le brouillon' : 'Enregistrer en brouillon'}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            onClick={() => setSubmitStatus('valide')}
          >
            {isSubmitting ? 'Enregistrement...' : submitLabel || 'Valider le paiement'}
          </Button>
        </div>
      </form>
    </Form>
  );
};
