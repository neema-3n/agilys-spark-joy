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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { useDepenses } from '@/hooks/useDepenses';
import { useEngagements } from '@/hooks/useEngagements';
import { useLignesBudgetaires } from '@/hooks/useLignesBudgetaires';
import { useFournisseurs } from '@/hooks/useFournisseurs';
import { useProjets } from '@/hooks/useProjets';
import { useComptes } from '@/hooks/useComptes';
import { useNaturesCompte } from '@/hooks/useNaturesCompte';
import { Paiement, PaiementFormData } from '@/types/paiement.types';
import { ChargePrincipaleField } from '@/components/finance/ChargePrincipaleField';
import { VentilationEditor } from '@/components/finance/VentilationEditor';
import { resolveChargePrincipale } from '@/lib/charge-principale-utils';
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

  const comptesCharge = useMemo(
    () => comptes.filter((compte) => compte.type === 'charge' && compte.statut === 'actif'),
    [comptes]
  );
  const [modeSource, setModeSource] = useState<'depense' | 'direct'>(initialDepenseId ? 'depense' : 'direct');
  const [ventilations, setVentilations] = useState<FinancialVentilation[]>([]);
  const [chargePrincipaleMode, setChargePrincipaleMode] = useState<ChargePrincipaleMode>('nature');
  const [natureCompteChargeId, setNatureCompteChargeId] = useState<string>();
  const [compteChargeId, setCompteChargeId] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initializedRef = useRef(false);
  const initialEditorStateRef = useRef<string | null>(null);

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

  const selectedDepense = useMemo(
    () => depenses.find((item) => item.id === initialDepenseId),
    [depenses, initialDepenseId]
  );

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
      referencePaiement: '',
      observations: '',
    },
  });

  useEffect(() => {
    if (initializedRef.current) return;
    if (initialDepenseId && !selectedDepense) return;

    setModeSource(initialDepenseId ? 'depense' : 'direct');

    if (paiement) {
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
        referencePaiement: paiement.referencePaiement || '',
        observations: paiement.observations || '',
      });
      setVentilations(paiement.ventilations || []);
      setChargePrincipaleMode(paiement.chargePrincipaleMode || 'nature');
      setNatureCompteChargeId(paiement.natureCompteChargeId);
      setCompteChargeId(paiement.compteChargeId);
      initialEditorStateRef.current = serializeEditorState(
        paiement.depenseId ? 'depense' : 'direct',
        paiement.ventilations || [],
        paiement.chargePrincipaleMode || 'nature',
        paiement.natureCompteChargeId,
        paiement.compteChargeId,
      );
      initializedRef.current = true;
      return;
    }

    if (initialDepenseId && selectedDepense) {
      const montantRestant = selectedDepense.montant - selectedDepense.montantPaye;
      form.reset({
        depenseId: initialDepenseId,
        engagementId: selectedDepense.engagementId || '',
        ligneBudgetaireId: selectedDepense.ligneBudgetaireId || '',
        fournisseurId: selectedDepense.fournisseurId || '',
        beneficiaire: selectedDepense.beneficiaire || '',
        projetId: selectedDepense.projetId || '',
        objet: selectedDepense.objet,
        montantHT: selectedDepense.montantHT || montantRestant || selectedDepense.montant,
        montantTTC: selectedDepense.montantTTC || montantRestant || selectedDepense.montant,
        montantNetPaye: montantRestant || selectedDepense.montantNetPaye || selectedDepense.montant,
        datePaiement: new Date().toISOString().split('T')[0],
        modePaiement: 'virement',
        referencePaiement: '',
        observations: '',
      });
      setVentilations(selectedDepense.ventilations || []);
      setChargePrincipaleMode(selectedDepense.chargePrincipaleMode || 'nature');
      setNatureCompteChargeId(selectedDepense.natureCompteChargeId);
      setCompteChargeId(selectedDepense.compteChargeId);
      initialEditorStateRef.current = serializeEditorState(
        'depense',
        selectedDepense.ventilations || [],
        selectedDepense.chargePrincipaleMode || 'nature',
        selectedDepense.natureCompteChargeId,
        selectedDepense.compteChargeId,
      );
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
      referencePaiement: '',
      observations: '',
    });
    setVentilations([]);
    setChargePrincipaleMode('nature');
    setNatureCompteChargeId(undefined);
    setCompteChargeId(undefined);
    initialEditorStateRef.current = serializeEditorState('direct', [], 'nature');
    initializedRef.current = true;
  }, [form, initialDepenseId, paiement, selectedDepense]);

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

    const payload: PaiementFormData = {
      depenseId: modeSource === 'depense' ? (values.depenseId || initialDepenseId) : undefined,
      engagementId: modeSource === 'direct' ? values.engagementId || undefined : values.engagementId || undefined,
      ligneBudgetaireId: values.ligneBudgetaireId || undefined,
      fournisseurId: values.fournisseurId || undefined,
      beneficiaire: values.beneficiaire || undefined,
      projetId: values.projetId || undefined,
      objet: values.objet || undefined,
      montant: values.montantNetPaye,
      montantHT: values.montantHT,
      montantTTC: values.montantTTC,
      montantNetPaye: values.montantNetPaye,
      totalAjouts: breakdown.totalAjouts,
      totalRetraits: breakdown.totalRetraits,
      datePaiement: values.datePaiement,
      modePaiement: values.modePaiement,
      referencePaiement: values.referencePaiement || undefined,
      observations: values.observations || undefined,
      chargePrincipaleMode: resolvedChargePrincipale.chargePrincipaleMode,
      natureCompteChargeId: resolvedChargePrincipale.natureCompteChargeId,
      compteChargeId: resolvedChargePrincipale.compteChargeId,
      ventilations,
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
            Définissez la source du paiement, ses rattachements et ses montants pivots.
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
                      {lignesBudgetaires.map((item) => (
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
                      {fournisseurs.map((item) => (
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
                      {projets.map((item) => (
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
                <FormItem><FormLabel>Montant net payé</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
          </CardContent>
        </Card>
      </section>

      <VentilationEditor ventilations={ventilations} onChange={setVentilations} />

      <Alert variant={coherenceErrors.length > 0 ? 'destructive' : 'default'}>
        <AlertDescription>{coherenceErrors.length > 0 ? coherenceErrors[0] : 'Montants cohérents.'}</AlertDescription>
      </Alert>

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
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Enregistrement...' : submitLabel || 'Enregistrer le paiement'}
          </Button>
        </div>
      </form>
    </Form>
  );
};
