import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useReferentiels } from '@/hooks/useReferentiels';
import type { Compte } from '@/types/compte.types';

const createCompteSchema = (comptes: Compte[]) =>
  z
    .object({
      numero: z.string().min(1, 'Le numero est requis').max(20, 'Maximum 20 caracteres'),
      libelle: z.string().min(3, 'Le libelle doit contenir au moins 3 caracteres').max(200, 'Maximum 200 caracteres'),
      type: z.string().min(1, 'Le type est requis'),
      categorie: z.string().min(1, 'La categorie est requise'),
      parentId: z.string().optional(),
      niveau: z.coerce.number().min(1).max(9).default(1),
      statut: z.string().optional().default('actif'),
    })
    .refine((data) => {
      if (!data.parentId) return true;
      const parent = comptes.find((compte) => compte.id === data.parentId);
      if (!parent) return true;
      return data.numero.startsWith(parent.numero);
    }, {
      message: 'Le numero du compte doit commencer par le numero du parent',
      path: ['numero'],
    });

export type CompteFormData = {
  numero: string;
  libelle: string;
  type: string;
  categorie: string;
  parentId?: string;
  niveau: number;
  statut?: string;
};

interface CompteFormProps {
  compte?: Compte;
  comptes: Compte[];
  onSubmit: (data: CompteFormData) => Promise<void>;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export function CompteForm({ compte, comptes, onSubmit, onCancel, onDirtyChange }: CompteFormProps) {
  const { data: compteTypes = [], isLoading: loadingTypes } = useReferentiels('compte_type');
  const { data: compteCategories = [], isLoading: loadingCategories } = useReferentiels('compte_categorie');
  const compteSchema = createCompteSchema(comptes);

  const form = useForm<CompteFormData>({
    resolver: zodResolver(compteSchema),
    defaultValues: {
      numero: compte?.numero || '',
      libelle: compte?.libelle || '',
      type: compte?.type || 'charge',
      categorie: compte?.categorie || 'exploitation',
      parentId: compte?.parentId || '',
      niveau: compte?.niveau || 1,
      statut: compte?.statut || 'actif',
    },
  });

  useEffect(() => {
    form.reset({
      numero: compte?.numero || '',
      libelle: compte?.libelle || '',
      type: compte?.type || 'charge',
      categorie: compte?.categorie || 'exploitation',
      parentId: compte?.parentId || '',
      niveau: compte?.niveau || 1,
      statut: compte?.statut || 'actif',
    });
  }, [compte, form]);

  const selectedParentId = form.watch('parentId');

  useEffect(() => {
    if (selectedParentId) {
      const parent = comptes.find((item) => item.id === selectedParentId);
      if (parent) {
        form.setValue('niveau', parent.niveau + 1, { shouldDirty: true });
      }
      return;
    }
    form.setValue('niveau', 1, { shouldDirty: true });
  }, [selectedParentId, comptes, form]);

  useEffect(() => {
    onDirtyChange?.(form.formState.isDirty);
  }, [form.formState.isDirty, onDirtyChange]);

  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  const handleSubmit = async (data: CompteFormData) => {
    await onSubmit(data);
    form.reset(data);
  };

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="numero"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Numero *</FormLabel>
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
                <FormLabel>Compte parent</FormLabel>
                <Select onValueChange={(value) => field.onChange(value === '__none__' ? undefined : value)} value={field.value || '__none__'}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Aucun parent" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__none__">Aucun parent (compte racine)</SelectItem>
                    {comptes
                      .filter((item) => item.id !== compte?.id)
                      .sort((a, b) => a.numero.localeCompare(b.numero))
                      .map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.numero} - {item.libelle}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
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
            name="libelle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Libelle *</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Achats de matieres premieres" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
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
                      <SelectItem value="__loading__" disabled>Chargement...</SelectItem>
                    ) : compteTypes.length === 0 ? (
                      <SelectItem value="__empty__" disabled>Aucun type disponible</SelectItem>
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
                <FormLabel>Categorie *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {loadingCategories ? (
                      <SelectItem value="__loading__" disabled>Chargement...</SelectItem>
                    ) : compteCategories.length === 0 ? (
                      <SelectItem value="__empty__" disabled>Aucune categorie disponible</SelectItem>
                    ) : (
                      compteCategories.map((category) => (
                        <SelectItem key={category.id} value={category.code}>
                          {category.libelle}
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

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="submit">
            {compte ? 'Mettre a jour' : 'Creer'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
