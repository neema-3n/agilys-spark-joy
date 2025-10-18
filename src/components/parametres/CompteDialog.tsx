import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Compte } from '@/types/compte.types';

const compteSchema = z.object({
  numero: z.string().min(1, 'Le numéro est requis').max(20, 'Maximum 20 caractères'),
  libelle: z.string().min(3, 'Le libellé doit contenir au moins 3 caractères').max(200, 'Maximum 200 caractères'),
  type: z.enum(['actif', 'passif', 'charge', 'produit', 'resultat']),
  categorie: z.enum(['immobilisation', 'stock', 'creance', 'tresorerie', 'dette', 'capital', 'exploitation', 'financier', 'exceptionnel', 'autre']),
  niveau: z.coerce.number().min(1).max(9).default(1),
  statut: z.enum(['actif', 'inactif'])
});

type CompteFormData = z.infer<typeof compteSchema>;

interface CompteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CompteFormData) => Promise<void>;
  compte?: Compte;
}

const CompteDialog = ({ 
  open, 
  onOpenChange, 
  onSubmit, 
  compte
}: CompteDialogProps) => {
  const form = useForm<CompteFormData>({
    resolver: zodResolver(compteSchema),
    defaultValues: {
      numero: compte?.numero || '',
      libelle: compte?.libelle || '',
      type: compte?.type || 'charge',
      categorie: compte?.categorie || 'exploitation',
      niveau: compte?.niveau || 1,
      statut: compte?.statut || 'actif'
    }
  });

  const handleSubmit = async (data: CompteFormData) => {
    await onSubmit(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {compte ? 'Modifier le compte' : 'Nouveau compte'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
                name="niveau"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Niveau *</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={9} {...field} />
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
                        <SelectItem value="actif">Actif</SelectItem>
                        <SelectItem value="passif">Passif</SelectItem>
                        <SelectItem value="charge">Charge</SelectItem>
                        <SelectItem value="produit">Produit</SelectItem>
                        <SelectItem value="resultat">Résultat</SelectItem>
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
                        <SelectItem value="immobilisation">Immobilisation</SelectItem>
                        <SelectItem value="stock">Stock</SelectItem>
                        <SelectItem value="creance">Créance</SelectItem>
                        <SelectItem value="tresorerie">Trésorerie</SelectItem>
                        <SelectItem value="dette">Dette</SelectItem>
                        <SelectItem value="capital">Capital</SelectItem>
                        <SelectItem value="exploitation">Exploitation</SelectItem>
                        <SelectItem value="financier">Financier</SelectItem>
                        <SelectItem value="exceptionnel">Exceptionnel</SelectItem>
                        <SelectItem value="autre">Autre</SelectItem>
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
                      <SelectItem value="actif">Actif</SelectItem>
                      <SelectItem value="inactif">Inactif</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button type="submit">
                {compte ? 'Mettre à jour' : 'Créer'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export { CompteDialog };
