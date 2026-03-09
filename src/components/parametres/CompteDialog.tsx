import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { Compte, CompteVersionStatus } from '@/types/compte.types';
import { useReferentiels } from '@/hooks/useReferentiels';

const VERSION_STATUS_OPTIONS: Array<{ value: CompteVersionStatus; label: string }> = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'published', label: 'Publiee' },
  { value: 'archived', label: 'Archivee' }
];

const createCompteSchema = (comptes: Compte[], currentCompteId?: string) =>
  z
    .object({
      numero: z.string().min(1, 'Le numéro est requis').max(20, 'Maximum 20 caractères'),
      libelle: z.string().min(3, 'Le libellé doit contenir au moins 3 caractères').max(200, 'Maximum 200 caractères'),
      type: z.string().min(1, 'Le type est requis'),
      categorie: z.string().min(1, 'La catégorie est requise'),
      parentId: z.string().optional(),
      niveau: z.coerce.number().min(1).max(9).default(1),
      statut: z.string().optional().default('actif'),
      versionStatus: z.enum(['draft', 'published', 'archived']).default('draft'),
      effectiveStartDate: z.string().optional(),
      effectiveEndDate: z.string().optional(),
      changeReason: z.string().max(300, 'Maximum 300 caractères').optional()
    })
    .refine((data) => {
      if (!data.parentId) return true;
      const parent = comptes.find((c) => c.id === data.parentId);
      if (!parent) return true;
      return data.numero.startsWith(parent.numero);
    }, {
      message: 'Le numéro du compte doit commencer par le numéro du parent',
      path: ['numero']
    })
    .refine((data) => {
      if (!data.parentId) return true;
      return data.parentId !== currentCompteId;
    }, {
      message: 'Un compte ne peut pas être son propre parent',
      path: ['parentId']
    })
    .refine((data) => {
      if (!data.effectiveStartDate || !data.effectiveEndDate) return true;
      return new Date(data.effectiveEndDate).getTime() >= new Date(data.effectiveStartDate).getTime();
    }, {
      message: "La date d'effet de fin doit être postérieure ou égale à la date d'effet de début",
      path: ['effectiveEndDate']
    })
    .refine((data) => {
      if (data.versionStatus === 'draft') return true;
      return Boolean(data.changeReason?.trim());
    }, {
      message: 'Le motif de changement est requis pour une version publiée ou archivée',
      path: ['changeReason']
    });

type CompteFormData = {
  numero: string;
  libelle: string;
  type: string;
  categorie: string;
  parentId?: string;
  niveau: number;
  statut?: string;
  versionStatus: CompteVersionStatus;
  effectiveStartDate?: string;
  effectiveEndDate?: string;
  changeReason?: string;
};

interface CompteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CompteFormData) => Promise<void>;
  compte?: Compte;
  comptes: Compte[];
  submitError?: string | null;
}

const getDefaultValues = (compte?: Compte): CompteFormData => ({
  numero: compte?.numero || '',
  libelle: compte?.libelle || '',
  type: compte?.type || 'charge',
  categorie: compte?.categorie || 'exploitation',
  parentId: compte?.parentId || '',
  niveau: compte?.niveau || 1,
  statut: compte?.statut || 'actif',
  versionStatus: compte?.versionStatus || 'draft',
  effectiveStartDate: compte?.effectiveStartDate || '',
  effectiveEndDate: compte?.effectiveEndDate || '',
  changeReason: compte?.changeReason || ''
});

const CompteDialog = ({ open, onOpenChange, onSubmit, compte, comptes, submitError }: CompteDialogProps) => {
  const { data: compteTypes = [], isLoading: loadingTypes } = useReferentiels('compte_type');
  const { data: compteCategories = [], isLoading: loadingCategories } = useReferentiels('compte_categorie');

  const form = useForm<CompteFormData>({
    resolver: zodResolver(createCompteSchema(comptes, compte?.id)),
    defaultValues: getDefaultValues(compte)
  });

  useEffect(() => {
    if (open) {
      form.reset(getDefaultValues(compte));
    }
  }, [open, compte, form]);

  const selectedParentId = form.watch('parentId');
  const versionStatus = form.watch('versionStatus');

  useEffect(() => {
    if (selectedParentId) {
      const parent = comptes.find((c) => c.id === selectedParentId);
      if (parent) {
        form.setValue('niveau', parent.niveau + 1, { shouldValidate: true });
      }
      return;
    }

    form.setValue('niveau', 1, { shouldValidate: true });
  }, [selectedParentId, comptes, form]);

  const handleSubmit = async (data: CompteFormData) => {
    await onSubmit({
      ...data,
      parentId: data.parentId || undefined,
      effectiveStartDate: data.effectiveStartDate || undefined,
      effectiveEndDate: data.effectiveEndDate || undefined,
      changeReason: data.changeReason?.trim() || undefined
    });
    form.reset(getDefaultValues());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{compte ? 'Modifier le compte' : 'Nouveau compte'}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 min-h-0">
          <Form {...form}>
            <form className="space-y-4 py-4">
              {compte && (
                <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={compte.versionStatus === 'published' ? 'default' : 'secondary'}>
                      v{compte.versionNumber} · {VERSION_STATUS_OPTIONS.find((option) => option.value === compte.versionStatus)?.label}
                    </Badge>
                    <span className="text-muted-foreground">Groupe {compte.versionGroupId.slice(0, 8)}</span>
                  </div>
                  {compte.changeReason && <p className="mt-2 text-muted-foreground">Motif actuel : {compte.changeReason}</p>}
                </div>
              )}

              {submitError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="numero"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numéro *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 601000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="parentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Compte parent (optionnel)</FormLabel>
                      <Select onValueChange={(value) => field.onChange(value === '__none__' ? undefined : value)} value={field.value || '__none__'}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Aucun parent (compte racine)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">Aucun parent (compte racine)</SelectItem>
                          {comptes
                            .filter((c) => c.id !== compte?.id)
                            .sort((a, b) => a.numero.localeCompare(b.numero))
                            .map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.numero} - {c.libelle}
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
                  name="niveau"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Niveau *</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={9} {...field} disabled />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="versionStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Statut de version *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {VERSION_STATUS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="libelle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Libellé *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Achats de matières premières" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {loadingTypes ? (
                            <SelectItem value="__loading__" disabled>
                              Chargement...
                            </SelectItem>
                          ) : compteTypes.length === 0 ? (
                            <SelectItem value="__empty__" disabled>
                              Aucun type disponible
                            </SelectItem>
                          ) : (
                            compteTypes.map((type) => (
                              <SelectItem key={type.id} value={type.code}>
                                {type.libelle}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="categorie"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Catégorie *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {loadingCategories ? (
                            <SelectItem value="__loading__" disabled>
                              Chargement...
                            </SelectItem>
                          ) : compteCategories.length === 0 ? (
                            <SelectItem value="__empty__" disabled>
                              Aucune catégorie disponible
                            </SelectItem>
                          ) : (
                            compteCategories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.code}>
                                {cat.libelle}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="effectiveStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date d'effet de début</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="effectiveEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date d'effet de fin</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="changeReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motif du changement{versionStatus !== 'draft' ? ' *' : ''}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ex: Publication du plan comptable 2026 après validation comptable"
                        className="min-h-[96px]"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        <div className="flex justify-end gap-2 flex-shrink-0 pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="button" onClick={form.handleSubmit(handleSubmit)}>
            {compte ? 'Créer une nouvelle version' : 'Créer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { CompteDialog };
