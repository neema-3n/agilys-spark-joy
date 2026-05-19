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
import { normalizeChargePrincipaleForEditor } from '@/lib/charge-principale-utils';
import type { Depense, DepenseFormData } from '@/types/depense.types';
import type { Engagement } from '@/types/engagement.types';
import type { Facture } from '@/types/facture.types';

const depenseSchema = z
  .object({
    engagementId: z.string().optional(),
    ligneBudgetaireId: z.string().optional(),
    factureId: z.string().optional(),
    fournisseurId: z.string().optional(),
    beneficiaire: z.string().optional(),
    projetId: z.string().optional(),
    objet: z.string().min(1, "L'objet est requis"),
    montant: z.coerce.number().positive('Le montant est requis'),
    dateDepense: z.string().min(1, 'La date est requise'),
    modePaiement: z.string().optional(),
    referencePaiement: z.string().optional(),
    observations: z.string().optional(),
    compteChargeId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const hasEngagement = !!data.engagementId;
    const hasFacture = !!data.factureId;

    if (!hasEngagement && !hasFacture) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['engagementId'],
        message: 'Sélectionnez un engagement ou une facture.',
      });
    }

    if (!hasFacture && !data.compteChargeId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['compteChargeId'],
        message: 'Le compte de charge est requis hors facture.',
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

  const comptesCharge = useMemo(
    () => comptes.filter((compte) => compte.type === 'charge' && compte.statut === 'actif'),
    [comptes]
  );

  const [typeImputation, setTypeImputation] = useState<'engagement' | 'facture'>('engagement');
  const [typeBeneficiaire, setTypeBeneficiaire] = useState<'fournisseur' | 'direct'>(
    'fournisseur'
  );
  const [compteChargeId, setCompteChargeId] = useState<string>();
  const initializedRef = useRef(false);
  const initialEditorStateRef = useRef<string | null>(null);

  const serializeEditorState = (
    currentTypeImputation: 'engagement' | 'facture',
    currentTypeBeneficiaire: 'fournisseur' | 'direct',
    currentCompteChargeId?: string,
  ) =>
    JSON.stringify({
      typeImputation: currentTypeImputation,
      typeBeneficiaire: currentTypeBeneficiaire,
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
      montant: 0,
      dateDepense: format(new Date(), 'yyyy-MM-dd'),
      modePaiement: '',
      referencePaiement: '',
      observations: '',
      compteChargeId: '',
    },
  });

  const watchedEngagementId = form.watch('engagementId');
  const watchedFactureId = form.watch('factureId');
  const hasSelectedEngagement = !!watchedEngagementId;
  const isFactureDerived =
    !!preSelectedFacture?.id || !!depense?.factureId || (typeImputation === 'facture' && !!watchedFactureId);

  useEffect(() => {
    initializedRef.current = false;
  }, [depense?.id, preSelectedEngagement?.id, preSelectedFacture?.id]);

  useEffect(() => {
    if (initializedRef.current) return;

    if (depense) {
      const nextTypeImputation = depense.factureId ? 'facture' : 'engagement';
      const nextTypeBeneficiaire = depense.fournisseurId ? 'fournisseur' : 'direct';
      form.reset({
        engagementId: depense.engagementId || '',
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
        compteChargeId: depense.compteChargeId || '',
      });
      setTypeImputation(nextTypeImputation);
      setTypeBeneficiaire(nextTypeBeneficiaire);
      setCompteChargeId(depense.compteChargeId);
      initialEditorStateRef.current = serializeEditorState(
        nextTypeImputation,
        nextTypeBeneficiaire,
        depense.compteChargeId,
      );
      initializedRef.current = true;
      return;
    }

    if (preSelectedFacture) {
      const normalizedCharge = normalizeChargePrincipaleForEditor(
        preSelectedFacture.chargePrincipaleMode,
        preSelectedFacture.natureCompteChargeId,
        preSelectedFacture.compteChargeId,
      );
      form.reset({
        engagementId: preSelectedFacture.engagementId || '',
        ligneBudgetaireId: preSelectedFacture.ligneBudgetaireId || '',
        factureId: preSelectedFacture.id,
        fournisseurId: preSelectedFacture.fournisseurId,
        beneficiaire: '',
        projetId: preSelectedFacture.projetId || '',
        objet: preSelectedFacture.objet,
        montant: preSelectedFacture.montantTTC,
        dateDepense: format(new Date(), 'yyyy-MM-dd'),
        modePaiement: '',
        referencePaiement: '',
        observations: '',
        compteChargeId: normalizedCharge.compteChargeId || '',
      });
      setTypeImputation('facture');
      setTypeBeneficiaire('fournisseur');
      setCompteChargeId(normalizedCharge.compteChargeId);
      initialEditorStateRef.current = serializeEditorState(
        'facture',
        'fournisseur',
        normalizedCharge.compteChargeId,
      );
      initializedRef.current = true;
      return;
    }

    if (preSelectedEngagement) {
      const nextTypeBeneficiaire = preSelectedEngagement.fournisseurId ? 'fournisseur' : 'direct';
      form.reset({
        engagementId: preSelectedEngagement.id,
        ligneBudgetaireId: preSelectedEngagement.ligneBudgetaireId || '',
        factureId: '',
        fournisseurId: preSelectedEngagement.fournisseurId || '',
        beneficiaire: preSelectedEngagement.beneficiaire || '',
        projetId: preSelectedEngagement.projetId || '',
        objet: preSelectedEngagement.objet,
        montant: preSelectedEngagement.solde || preSelectedEngagement.montant,
        dateDepense: format(new Date(), 'yyyy-MM-dd'),
        modePaiement: '',
        referencePaiement: '',
        observations: '',
        compteChargeId: '',
      });
      setTypeImputation('engagement');
      setTypeBeneficiaire(nextTypeBeneficiaire);
      setCompteChargeId(undefined);
      initialEditorStateRef.current = serializeEditorState('engagement', nextTypeBeneficiaire, undefined);
      initializedRef.current = true;
      return;
    }

    form.reset({
      engagementId: '',
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
      compteChargeId: '',
    });
    setTypeImputation('engagement');
    setTypeBeneficiaire('fournisseur');
    setCompteChargeId(undefined);
    initialEditorStateRef.current = serializeEditorState('engagement', 'fournisseur', undefined);
    initializedRef.current = true;
  }, [depense, form, preSelectedEngagement, preSelectedFacture]);

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
      const nextTypeBeneficiaire = manualSelectedEngagement.fournisseurId ? 'fournisseur' : 'direct';
      setTypeBeneficiaire(nextTypeBeneficiaire);
      form.setValue('factureId', '', { shouldDirty: true });
      form.setValue('ligneBudgetaireId', manualSelectedEngagement.ligneBudgetaireId || '', { shouldDirty: true });
      form.setValue('fournisseurId', manualSelectedEngagement.fournisseurId || '', { shouldDirty: true });
      form.setValue('beneficiaire', manualSelectedEngagement.beneficiaire || '', { shouldDirty: true });
      form.setValue('projetId', manualSelectedEngagement.projetId || '', { shouldDirty: true });
      form.setValue('objet', manualSelectedEngagement.objet, { shouldDirty: true });
      form.setValue('montant', manualSelectedEngagement.solde || manualSelectedEngagement.montant, {
        shouldDirty: true,
      });
      form.setValue('compteChargeId', '', { shouldDirty: true });
      setCompteChargeId(undefined);
    }

    if (typeImputation === 'facture' && manualSelectedFacture) {
      const normalizedCharge = normalizeChargePrincipaleForEditor(
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
      form.setValue('montant', manualSelectedFacture.montantTTC, { shouldDirty: true });
      form.setValue('compteChargeId', normalizedCharge.compteChargeId || '', { shouldDirty: true });
      setCompteChargeId(normalizedCharge.compteChargeId);
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
    () => serializeEditorState(typeImputation, typeBeneficiaire, compteChargeId),
    [typeImputation, typeBeneficiaire, compteChargeId]
  );

  const isDirty =
    form.formState.isDirty ||
    (initialEditorStateRef.current !== null && initialEditorStateRef.current !== currentEditorState);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  const lockImputationSource = !!preSelectedEngagement || !!preSelectedFacture;
  const lockTypeBeneficiaire =
    !!preSelectedFacture || (typeImputation === 'engagement' && hasSelectedEngagement);
  const lockDepenseInheritedFields =
    !!preSelectedFacture ||
    (!!preSelectedEngagement && typeImputation === 'engagement') ||
    (typeImputation === 'facture' && !!watchedFactureId) ||
    (typeImputation === 'engagement' && hasSelectedEngagement);

  const handleSubmit = async (values: DepenseSchemaValues) => {
    const payload: DepenseFormData = {
      engagementId: values.engagementId || undefined,
      ligneBudgetaireId: values.ligneBudgetaireId || undefined,
      factureId: values.factureId || undefined,
      fournisseurId: typeBeneficiaire === 'fournisseur' ? values.fournisseurId || undefined : undefined,
      beneficiaire: typeBeneficiaire === 'direct' ? values.beneficiaire || undefined : undefined,
      projetId: values.projetId || undefined,
      objet: values.objet,
      montant: values.montant,
      dateDepense: values.dateDepense,
      modePaiement: values.modePaiement as DepenseFormData['modePaiement'],
      referencePaiement: values.referencePaiement || undefined,
      observations: values.observations || undefined,
      compteChargeId: isFactureDerived ? compteChargeId || undefined : values.compteChargeId || undefined,
    };

    await onSubmit(payload);
  };

  const body = (
    <div className="space-y-10">
      <section className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold tracking-tight">Noyau de saisie</h3>
          <p className="text-sm text-muted-foreground">
            Identifiez la dépense, son rattachement et le montant à exécuter.
          </p>
        </div>
        <Card>
          <CardContent className="space-y-6 pt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <FormLabel>Type d&apos;imputation</FormLabel>
                <Select
                  value={typeImputation}
                  onValueChange={(value) => setTypeImputation(value as 'engagement' | 'facture')}
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
                  onValueChange={(value) => setTypeBeneficiaire(value as 'fournisseur' | 'direct')}
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
              ) : (
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
              )}

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
                      <FormControl>
                        <Input {...field} value={field.value || ''} disabled={lockDepenseInheritedFields} />
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

              <FormField
                control={form.control}
                name="montant"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant de la dépense</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>
      </section>

      {!isFactureDerived ? (
        <section className="space-y-3">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold tracking-tight">Constatation de charge</h3>
            <p className="text-sm text-muted-foreground">
              Renseignez le compte de charge pour les dépenses non issues d&apos;une facture.
            </p>
          </div>
          <Card>
            <CardContent className="pt-6">
              <FormField
                control={form.control}
                name="compteChargeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Compte de charge</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setCompteChargeId(value);
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Sélectionner un compte de charge" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {comptesCharge.map((compte) => (
                          <SelectItem key={compte.id} value={compte.id}>
                            {compte.code} - {compte.libelle}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </section>
      ) : null}

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
