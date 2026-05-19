import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
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
import { useLignesBudgetaires } from '@/hooks/useLignesBudgetaires';
import { useFournisseurs } from '@/hooks/useFournisseurs';
import { useProjets } from '@/hooks/useProjets';
import { useComptesTresorerie } from '@/hooks/useComptesTresorerie';
import { Paiement, PaiementFormData } from '@/types/paiement.types';
import { SinglePageFormFooter } from '@/components/shared/SinglePageFormFooter';

const formSchema = z.object({
  depenseId: z.string().min(1, 'La dépense est requise'),
  engagementId: z.string().optional(),
  ligneBudgetaireId: z.string().optional(),
  fournisseurId: z.string().optional(),
  beneficiaire: z.string().optional(),
  projetId: z.string().optional(),
  objet: z.string().optional(),
  montant: z.coerce.number().positive('Le montant du paiement est requis'),
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
  const { lignes: lignesBudgetaires } = useLignesBudgetaires();
  const { fournisseurs } = useFournisseurs();
  const { projets } = useProjets();
  const { comptesActifs: comptesTresorerie, isLoading: loadingComptesTresorerie } =
    useComptesTresorerie();

  const [submitStatus, setSubmitStatus] = useState<'brouillon' | 'valide'>('brouillon');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initializedRef = useRef(false);
  const hydratedDepenseIdRef = useRef<string | null>(null);

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
      montant: 0,
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

  useEffect(() => {
    setSubmitStatus(paiement?.statut === 'valide' ? 'valide' : 'brouillon');
  }, [paiement?.id, paiement?.statut]);

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

    return [...projets, { ...linkedDepense.projet }];
  }, [linkedDepense, projets]);

  const hydrateFromDepense = (depenseSource: typeof depenses[number], depenseSourceId: string) => {
    const montantRestant = depenseSource.montant - depenseSource.montantPaye;
    form.reset({
      depenseId: depenseSourceId,
      engagementId: depenseSource.engagementId || '',
      ligneBudgetaireId: depenseSource.ligneBudgetaireId || depenseSource.ligneBudgetaire?.id || '',
      fournisseurId: depenseSource.fournisseurId || depenseSource.fournisseur?.id || '',
      beneficiaire: depenseSource.beneficiaire || '',
      projetId: depenseSource.projetId || depenseSource.projet?.id || '',
      objet: depenseSource.objet,
      montant: montantRestant || depenseSource.montant,
      datePaiement: new Date().toISOString().split('T')[0],
      modePaiement: 'virement',
      compteTresorerieId: '',
      referencePaiement: '',
      observations: '',
    });
  };

  useEffect(() => {
    if (initializedRef.current) return;
    if (initialDepenseId && !selectedDepense) return;

    if (paiement) {
      form.reset({
        depenseId: paiement.depenseId || '',
        engagementId: paiement.engagementId || '',
        ligneBudgetaireId: paiement.ligneBudgetaireId || '',
        fournisseurId: paiement.fournisseurId || '',
        beneficiaire: paiement.beneficiaire || '',
        projetId: paiement.projetId || '',
        objet: paiement.objet || '',
        montant: paiement.montant,
        datePaiement: paiement.datePaiement,
        modePaiement: paiement.modePaiement,
        compteTresorerieId: paiement.compteTresorerieId || '',
        referencePaiement: paiement.referencePaiement || '',
        observations: paiement.observations || '',
      });
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
      montant: 0,
      datePaiement: new Date().toISOString().split('T')[0],
      modePaiement: 'virement',
      compteTresorerieId: '',
      referencePaiement: '',
      observations: '',
    });
    hydratedDepenseIdRef.current = null;
    initializedRef.current = true;
  }, [form, initialDepenseId, paiement, selectedDepense]);

  useEffect(() => {
    if (paiement || !selectedDepenseId || !selectedDepense) return;
    if (hydratedDepenseIdRef.current === selectedDepense.id) return;

    hydrateFromDepense(selectedDepense, selectedDepenseId);
    hydratedDepenseIdRef.current = selectedDepense.id;
  }, [form, paiement, selectedDepense, selectedDepenseId]);

  const isDirty = form.formState.isDirty;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  const lockPaiementInheritedFields = !!selectedDepenseId;

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    const payload: PaiementFormData = {
      depenseId: values.depenseId || initialDepenseId,
      engagementId: values.engagementId || undefined,
      ligneBudgetaireId: values.ligneBudgetaireId || undefined,
      fournisseurId: values.fournisseurId || undefined,
      beneficiaire: values.beneficiaire || undefined,
      projetId: values.projetId || undefined,
      objet: values.objet || undefined,
      montant: values.montant,
      datePaiement: values.datePaiement,
      modePaiement: values.modePaiement,
      compteTresorerieId: values.compteTresorerieId,
      referencePaiement: values.referencePaiement || undefined,
      observations: values.observations || undefined,
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
            Définissez la dépense réglée et les rattachements hérités du paiement.
          </p>
        </div>
        <Card>
          <CardContent className="space-y-6 pt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField control={form.control} name="depenseId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Dépense</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || initialDepenseId || ''} disabled={!!initialDepenseId}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner une dépense" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {depenses.filter((item) => item.statut === 'validee' || item.statut === 'payee').map((item) => (
                        <SelectItem key={item.id} value={item.id}>{item.numero}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="ligneBudgetaireId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Ligne budgétaire</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={lockPaiementInheritedFields}>
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
                  <Select onValueChange={field.onChange} value={field.value} disabled={lockPaiementInheritedFields}>
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
                  <FormControl><Input {...field} value={field.value || ''} disabled={lockPaiementInheritedFields} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="projetId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Projet</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={lockPaiementInheritedFields}>
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
                  <FormControl><Input {...field} value={field.value || ''} disabled={lockPaiementInheritedFields} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="montant" render={({ field }) => (
                <FormItem>
                  <FormLabel>Montant du paiement</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold tracking-tight">Informations de règlement</h3>
          <p className="text-sm text-muted-foreground">
            Renseignez les informations de trésorerie et de règlement du paiement.
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
              <FormItem>
                <FormLabel>Statut à l&apos;enregistrement</FormLabel>
                <Select
                  onValueChange={(value) => setSubmitStatus(value as 'brouillon' | 'valide')}
                  value={submitStatus}
                >
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="brouillon">Brouillon</SelectItem>
                    <SelectItem value="valide">Validé</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
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
        <SinglePageFormFooter
          mode={paiement ? 'edit' : 'create'}
          onCancel={onCancel}
          isSubmitting={isSubmitting}
          submitLabel={submitLabel}
        />
      </form>
    </Form>
  );
};
