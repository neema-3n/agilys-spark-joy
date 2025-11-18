import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Facture, CreateFactureInput } from '@/types/facture.types';
import { format } from 'date-fns';

const factureSchema = z.object({
  numero: z.string().min(1, 'Le numéro est requis'),
  dateFacture: z.string().min(1, 'La date de facture est requise'),
  dateEcheance: z.string().optional(),
  fournisseurId: z.string().min(1, 'Le fournisseur est requis'),
  bonCommandeId: z.string().optional(),
  engagementId: z.string().optional(),
  ligneBudgetaireId: z.string().optional(),
  projetId: z.string().optional(),
  objet: z.string().min(1, 'L\'objet est requis'),
  numeroFactureFournisseur: z.string().optional(),
  montantHT: z.string().min(1, 'Le montant HT est requis'),
  montantTVA: z.string().min(1, 'Le montant TVA est requis'),
  montantTTC: z.string().min(1, 'Le montant TTC est requis'),
  observations: z.string().optional(),
});

interface FactureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facture?: Facture;
  onSubmit: (data: CreateFactureInput) => Promise<void>;
  fournisseurs: Array<{ id: string; nom: string; code: string }>;
  bonsCommande: Array<{ id: string; numero: string }>;
  engagements: Array<{ id: string; numero: string }>;
  lignesBudgetaires: Array<{ id: string; libelle: string }>;
  projets: Array<{ id: string; nom: string; code: string }>;
  currentClientId: string;
  currentExerciceId: string;
  onGenererNumero: () => Promise<string>;
}

export const FactureDialog = ({
  open,
  onOpenChange,
  facture,
  onSubmit,
  fournisseurs,
  bonsCommande,
  engagements,
  lignesBudgetaires,
  projets,
  currentClientId,
  currentExerciceId,
  onGenererNumero,
}: FactureDialogProps) => {
  const isReadOnly = facture && (facture.statut === 'payee' || facture.statut === 'annulee');

  const form = useForm<z.infer<typeof factureSchema>>({
    resolver: zodResolver(factureSchema),
    defaultValues: {
      numero: '',
      dateFacture: format(new Date(), 'yyyy-MM-dd'),
      fournisseurId: '',
      bonCommandeId: 'none',
      engagementId: 'none',
      ligneBudgetaireId: 'none',
      projetId: 'none',
      objet: '',
      numeroFactureFournisseur: '',
      montantHT: '',
      montantTVA: '',
      montantTTC: '',
      dateEcheance: '',
      observations: '',
    },
  });

  useEffect(() => {
    if (open && !facture) {
      onGenererNumero().then((numero) => {
        form.reset({
          numero: numero,
          dateFacture: format(new Date(), 'yyyy-MM-dd'),
          fournisseurId: '',
          bonCommandeId: 'none',
          engagementId: 'none',
          ligneBudgetaireId: 'none',
          projetId: 'none',
          objet: '',
          numeroFactureFournisseur: '',
          montantHT: '',
          montantTVA: '',
          montantTTC: '',
          dateEcheance: '',
          observations: '',
        });
      });
    } else if (open && facture) {
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
        montantHT: facture.montantHT.toString(),
        montantTVA: facture.montantTVA.toString(),
        montantTTC: facture.montantTTC.toString(),
        observations: facture.observations || '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, facture, onGenererNumero]);

  const handleSubmit = async (values: z.infer<typeof factureSchema>) => {
    try {
      const factureData: CreateFactureInput = {
        clientId: currentClientId,
        exerciceId: currentExerciceId,
        numero: values.numero,
        dateFacture: values.dateFacture,
        dateEcheance: values.dateEcheance || undefined,
        fournisseurId: values.fournisseurId,
        bonCommandeId: values.bonCommandeId && values.bonCommandeId !== 'none' ? values.bonCommandeId : undefined,
        engagementId: values.engagementId && values.engagementId !== 'none' ? values.engagementId : undefined,
        ligneBudgetaireId: values.ligneBudgetaireId && values.ligneBudgetaireId !== 'none' ? values.ligneBudgetaireId : undefined,
        projetId: values.projetId && values.projetId !== 'none' ? values.projetId : undefined,
        objet: values.objet,
        numeroFactureFournisseur: values.numeroFactureFournisseur || undefined,
        montantHT: parseFloat(values.montantHT),
        montantTVA: parseFloat(values.montantTVA),
        montantTTC: parseFloat(values.montantTTC),
        statut: 'brouillon',
        observations: values.observations || undefined,
      };

      await onSubmit(factureData);
      onOpenChange(false);
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
    }
  };

  // Calculer automatiquement le montant TTC
  const watchMontantHT = form.watch('montantHT');
  const watchMontantTVA = form.watch('montantTVA');

  useEffect(() => {
    const ht = parseFloat(watchMontantHT) || 0;
    const tva = parseFloat(watchMontantTVA) || 0;
    const ttc = ht + tva;
    const ttcFormatted = ttc.toFixed(2);
    
    // Only update if the value has actually changed to avoid infinite loops
    const currentValue = form.getValues('montantTTC');
    if (!isNaN(ttc) && currentValue !== ttcFormatted) {
      form.setValue('montantTTC', ttcFormatted, { 
        shouldValidate: true,
        shouldDirty: false,
        shouldTouch: false
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchMontantHT, watchMontantTVA]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {facture ? 'Modifier la facture' : 'Nouvelle facture'}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 px-1">
          <Form {...form}>
          <form className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="numero"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numéro</FormLabel>
                    <FormControl>
                      <Input {...field} disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dateFacture"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de facture</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} disabled={isReadOnly} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fournisseurId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fournisseur *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un fournisseur" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {fournisseurs.map((f) => (
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
              <FormField
                control={form.control}
                name="numeroFactureFournisseur"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>N° facture fournisseur</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: F-2025-001" disabled={isReadOnly} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="bonCommandeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bon de commande</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un BC" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">-- Aucun --</SelectItem>
                        {bonsCommande.map((bc) => (
                          <SelectItem key={bc.id} value={bc.id}>
                            {bc.numero}
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
                name="dateEcheance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date d'échéance</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} disabled={isReadOnly} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="objet"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Objet *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Description de la facture" disabled={isReadOnly} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
                <FormField
                control={form.control}
                name="montantHT"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant HT *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} disabled={isReadOnly} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="montantTVA"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant TVA *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} disabled={isReadOnly} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="montantTTC"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant TTC *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} disabled />
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
                  <FormLabel>Observations</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} disabled={isReadOnly} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            </form>
          </Form>
        </ScrollArea>
        
        <div className="flex justify-end gap-2 flex-shrink-0 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {isReadOnly ? 'Fermer' : 'Annuler'}
          </Button>
          {!isReadOnly && (
            <Button 
              type="button"
              onClick={form.handleSubmit(handleSubmit)}
            >
              {facture ? 'Mettre à jour' : 'Créer'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
