import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Compte } from '@/types/compte.types';
import { useReferentiels } from '@/hooks/useReferentiels';
import { useEffect } from 'react';

const compteSchema = z.object({
  numero: z.string().min(1, 'Le numéro est requis').max(20, 'Maximum 20 caractères'),
  libelle: z.string().min(3, 'Le libellé doit contenir au moins 3 caractères').max(200, 'Maximum 200 caractères'),
  type: z.string().min(1, 'Le type est requis'),
  categorie: z.string().min(1, 'La catégorie est requise'),
  parentId: z.string().optional(),
  niveau: z.coerce.number().min(1).max(9).default(1),
  statut: z.string().min(1, 'Le statut est requis')
});

type CompteFormData = z.infer<typeof compteSchema>;

interface CompteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CompteFormData) => Promise<void>;
  compte?: Compte;
  comptes: Compte[];
}

const CompteDialog = ({ 
  open, 
  onOpenChange, 
  onSubmit, 
  compte,
  comptes
}: CompteDialogProps) => {
  const { data: compteTypes = [], isLoading: loadingTypes } = useReferentiels('compte_type');
  const { data: compteCategories = [], isLoading: loadingCategories } = useReferentiels('compte_categorie');
  const { data: statuts = [], isLoading: loadingStatuts } = useReferentiels('statut_general');
  
  const form = useForm<CompteFormData>({
    resolver: zodResolver(compteSchema),
    defaultValues: {
      numero: compte?.numero || '',
      libelle: compte?.libelle || '',
      type: compte?.type || 'charge',
      categorie: compte?.categorie || 'exploitation',
      parentId: compte?.parentId || '',
      niveau: compte?.niveau || 1,
      statut: compte?.statut || 'actif'
    }
  });

  // Réinitialiser le formulaire quand le compte change ou que le dialog s'ouvre
  useEffect(() => {
    if (open && compte) {
      form.reset({
        numero: compte.numero || '',
        libelle: compte.libelle || '',
        type: compte.type || 'charge',
        categorie: compte.categorie || 'exploitation',
        parentId: compte.parentId || '',
        niveau: compte.niveau || 1,
        statut: compte.statut || 'actif'
      });
    } else if (open && !compte) {
      form.reset({
        numero: '',
        libelle: '',
        type: 'charge',
        categorie: 'exploitation',
        parentId: '',
        niveau: 1,
        statut: 'actif'
      });
    }
  }, [open, compte, form]);

  // Calculer automatiquement le niveau basé sur le parent
  const selectedParentId = form.watch('parentId');
  
  useEffect(() => {
    if (selectedParentId) {
      const parent = comptes.find(c => c.id === selectedParentId);
      if (parent) {
        form.setValue('niveau', parent.niveau + 1);
      }
    } else {
      form.setValue('niveau', 1);
    }
  }, [selectedParentId, comptes, form]);

  const handleSubmit = async (data: CompteFormData) => {
    await onSubmit(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {compte ? 'Modifier le compte' : 'Nouveau compte'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 min-h-0">
          <Form {...form}>
            <form className="space-y-4 py-4">
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
                <Select 
                  onValueChange={(value) => field.onChange(value === "__none__" ? undefined : value)} 
                  value={field.value || "__none__"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Aucun parent (compte racine)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__none__">Aucun parent (compte racine)</SelectItem>
                    {comptes
                      .filter(c => c.id !== compte?.id)
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
                          <SelectItem value="" disabled>Chargement...</SelectItem>
                        ) : compteTypes.length === 0 ? (
                          <SelectItem value="" disabled>Aucun type disponible</SelectItem>
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
                          <SelectItem value="" disabled>Chargement...</SelectItem>
                        ) : compteCategories.length === 0 ? (
                          <SelectItem value="" disabled>Aucune catégorie disponible</SelectItem>
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

            <FormField
              control={form.control}
              name="statut"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Statut</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {loadingStatuts ? (
                          <SelectItem value="" disabled>Chargement...</SelectItem>
                        ) : statuts.length === 0 ? (
                          <SelectItem value="" disabled>Aucun statut disponible</SelectItem>
                        ) : (
                          statuts.map((statut) => (
                            <SelectItem key={statut.id} value={statut.code}>
                              {statut.libelle}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            </form>
          </Form>
        </div>
        
        <div className="flex justify-end gap-2 flex-shrink-0 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button type="button" onClick={form.handleSubmit(handleSubmit)}>
            {compte ? 'Mettre à jour' : 'Créer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { CompteDialog };
