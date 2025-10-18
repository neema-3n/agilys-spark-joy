import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Structure } from '@/types/structure.types';
import { useReferentiels } from '@/hooks/useReferentiels';

const structureSchema = z.object({
  code: z.string().min(1, 'Le code est requis').max(20, 'Maximum 20 caractères'),
  nom: z.string().min(3, 'Le nom doit contenir au moins 3 caractères').max(100, 'Maximum 100 caractères'),
  type: z.string().min(1, 'Le type est requis'),
  responsable: z.string().max(100).optional(),
  statut: z.string().min(1, 'Le statut est requis')
});

type StructureFormData = z.infer<typeof structureSchema>;

interface StructureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: StructureFormData) => Promise<void>;
  structure?: Structure;
  structures?: Structure[];
}

const StructureDialog = ({ 
  open, 
  onOpenChange, 
  onSubmit, 
  structure,
  structures = []
}: StructureDialogProps) => {
  const { data: structureTypes = [], isLoading: loadingTypes } = useReferentiels('structure_type');
  const { data: statuts = [], isLoading: loadingStatuts } = useReferentiels('statut_general');
  const form = useForm<StructureFormData>({
    resolver: zodResolver(structureSchema),
    defaultValues: {
      code: structure?.code || '',
      nom: structure?.nom || '',
      type: structure?.type || 'service',
      responsable: structure?.responsable || '',
      statut: structure?.statut || 'actif'
    }
  });

  const handleSubmit = async (data: StructureFormData) => {
    await onSubmit(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {structure ? 'Modifier la structure' : 'Nouvelle structure'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: DIR-01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                        ) : structureTypes.length === 0 ? (
                          <SelectItem value="" disabled>Aucun type disponible</SelectItem>
                        ) : (
                          structureTypes.map((type) => (
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
            </div>

            <FormField
              control={form.control}
              name="nom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Direction des Ressources Humaines" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="responsable"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsable</FormLabel>
                  <FormControl>
                    <Input placeholder="Nom du responsable" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button type="submit">
                {structure ? 'Mettre à jour' : 'Créer'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export { StructureDialog };
