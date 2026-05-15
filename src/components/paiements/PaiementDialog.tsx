import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
import { usePaiements } from '@/hooks/usePaiements';
import { useDepenses } from '@/hooks/useDepenses';
import { useEngagements } from '@/hooks/useEngagements';
import { useLignesBudgetaires } from '@/hooks/useLignesBudgetaires';
import { useFournisseurs } from '@/hooks/useFournisseurs';
import { useProjets } from '@/hooks/useProjets';
import { useComptes } from '@/hooks/useComptes';
import { useNaturesCompte } from '@/hooks/useNaturesCompte';
import { PaiementFormData } from '@/types/paiement.types';
import { ChargePrincipaleField } from '@/components/finance/ChargePrincipaleField';
import { VentilationEditor } from '@/components/finance/VentilationEditor';
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
  montantNetPaye: z.coerce.number().positive('Le montant net paye est requis'),
  datePaiement: z.string().min(1, 'La date est requise'),
  modePaiement: z.enum(['virement', 'cheque', 'especes', 'carte', 'autre']),
  referencePaiement: z.string().optional(),
  observations: z.string().optional(),
});

interface PaiementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (data: PaiementFormData) => Promise<void>;
  depenseId?: string;
  montantRestant?: number;
  depenseNumero?: string;
}

export const PaiementDialog = ({
  open,
  onOpenChange,
  onSubmit,
  depenseId,
  montantRestant = 0,
  depenseNumero,
}: PaiementDialogProps) => {
  const { createPaiement } = usePaiements();
  const { depenses } = useDepenses();
  const { engagements } = useEngagements();
  const { lignes: lignesBudgetaires } = useLignesBudgetaires();
  const { fournisseurs } = useFournisseurs();
  const { projets } = useProjets();
  const { comptes } = useComptes();
  const { naturesCompte } = useNaturesCompte();

  const comptesCharge = useMemo(() => comptes.filter((compte) => compte.type === 'charge' && compte.statut === 'actif'), [comptes]);
  const [modeSource, setModeSource] = useState<'depense' | 'direct'>(depenseId ? 'depense' : 'direct');
  const [ventilations, setVentilations] = useState<FinancialVentilation[]>([]);
  const [chargePrincipaleMode, setChargePrincipaleMode] = useState<ChargePrincipaleMode>('nature');
  const [natureCompteChargeId, setNatureCompteChargeId] = useState<string>();
  const [compteChargeId, setCompteChargeId] = useState<string>();

  const selectedDepense = useMemo(() => depenses.find((item) => item.id === depenseId), [depenses, depenseId]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      depenseId,
      engagementId: '',
      ligneBudgetaireId: '',
      fournisseurId: '',
      beneficiaire: '',
      projetId: '',
      objet: '',
      montantHT: montantRestant || selectedDepense?.montantHT || selectedDepense?.montant || 0,
      montantTTC: montantRestant || selectedDepense?.montantTTC || selectedDepense?.montant || 0,
      montantNetPaye: montantRestant || selectedDepense?.montantNetPaye || selectedDepense?.montant || 0,
      datePaiement: new Date().toISOString().split('T')[0],
      modePaiement: 'virement',
      referencePaiement: '',
      observations: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    setModeSource(depenseId ? 'depense' : 'direct');
    if (depenseId && selectedDepense) {
      form.reset({
        depenseId,
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
  }, [open, depenseId, montantRestant, selectedDepense, form]);

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
    if (!natureCompteChargeId && !compteChargeId) {
      form.setError('objet', { type: 'manual', message: 'La charge principale est requise.' });
      return;
    }

    if (coherenceErrors.length > 0) {
      form.setError('montantNetPaye', { type: 'manual', message: coherenceErrors[0] });
      return;
    }

    const payload: PaiementFormData = {
      depenseId: modeSource === 'depense' ? (values.depenseId || depenseId) : undefined,
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
      chargePrincipaleMode,
      natureCompteChargeId,
      compteChargeId,
      ventilations,
    };

    await createPaiement(payload);
    if (onSubmit) {
      await onSubmit(payload);
    }
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>{modeSource === 'depense' ? 'Enregistrer un paiement' : 'Nouveau paiement direct'}</DialogTitle>
          {depenseNumero ? (
            <p className="text-sm text-muted-foreground">
              Depense {depenseNumero} - Reste a payer : {montantRestant.toFixed(2)}
            </p>
          ) : null}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <div className="space-y-6">
              <section className="space-y-4 rounded-md border p-4">
                <div className="space-y-1">
                  <h3 className="font-medium">Bloc 1 - Noyau de saisie</h3>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <FormLabel>Mode</FormLabel>
                    <Select value={modeSource} onValueChange={(value) => setModeSource(value as typeof modeSource)} disabled={!!depenseId}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="depense">Paiement sur depense</SelectItem>
                        <SelectItem value="direct">Paiement direct</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {modeSource === 'depense' ? (
                    <FormField control={form.control} name="depenseId" render={({ field }) => (
                      <FormItem><FormLabel>Depense</FormLabel><Select onValueChange={field.onChange} value={field.value || depenseId || ''} disabled={!!depenseId}><FormControl><SelectTrigger><SelectValue placeholder="Selectionner une depense" /></SelectTrigger></FormControl><SelectContent>{depenses.filter((item) => item.statut === 'ordonnancee' || item.statut === 'payee').map((item) => <SelectItem key={item.id} value={item.id}>{item.numero}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                    )} />
                  ) : (
                    <FormField control={form.control} name="engagementId" render={({ field }) => (
                      <FormItem><FormLabel>Engagement minimal</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selectionner un engagement" /></SelectTrigger></FormControl><SelectContent>{engagements.map((item) => <SelectItem key={item.id} value={item.id}>{item.numero}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                    )} />
                  )}

                  <FormField control={form.control} name="ligneBudgetaireId" render={({ field }) => (
                    <FormItem><FormLabel>Ligne budgetaire</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selectionner une ligne budgetaire" /></SelectTrigger></FormControl><SelectContent>{lignesBudgetaires.map((item) => <SelectItem key={item.id} value={item.id}>{item.libelle}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                  )} />

                  <FormField control={form.control} name="fournisseurId" render={({ field }) => (
                    <FormItem><FormLabel>Fournisseur</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selectionner un fournisseur" /></SelectTrigger></FormControl><SelectContent>{fournisseurs.map((item) => <SelectItem key={item.id} value={item.id}>{item.nom} - {item.code}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                  )} />

                  <FormField control={form.control} name="beneficiaire" render={({ field }) => (
                    <FormItem><FormLabel>Beneficiaire libre</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                  )} />

                  <FormField control={form.control} name="projetId" render={({ field }) => (
                    <FormItem><FormLabel>Projet</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selectionner un projet" /></SelectTrigger></FormControl><SelectContent>{projets.map((item) => <SelectItem key={item.id} value={item.id}>{item.code} - {item.nom}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                  )} />

                  <FormField control={form.control} name="objet" render={({ field }) => (
                    <FormItem className="md:col-span-2"><FormLabel>Objet</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
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
                  <FormField control={form.control} name="datePaiement" render={({ field }) => (
                    <FormItem><FormLabel>Date de paiement</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="modePaiement" render={({ field }) => (
                    <FormItem><FormLabel>Mode de paiement</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="virement">Virement</SelectItem><SelectItem value="cheque">Cheque</SelectItem><SelectItem value="especes">Especes</SelectItem><SelectItem value="carte">Carte</SelectItem><SelectItem value="autre">Autre</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="referencePaiement" render={({ field }) => (
                    <FormItem><FormLabel>Reference</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="observations" render={({ field }) => (
                    <FormItem className="md:col-span-2"><FormLabel>Observations</FormLabel><FormControl><Textarea rows={4} {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </section>
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
              <Button type="submit">Enregistrer le paiement</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
