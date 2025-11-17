import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ParametreReferentiel } from '@/types/referentiel.types';
import { Badge } from '@/components/ui/badge';

const referentielSchema = z.object({
  code: z.string().min(1, 'Le code est requis').max(50, 'Maximum 50 caractères'),
  libelle: z.string().min(1, 'Le libellé est requis').max(200, 'Maximum 200 caractères'),
  description: z.string().max(500, 'Maximum 500 caractères').optional(),
  ordre: z.number().int().min(0, 'Doit être positif'),
  actif: z.boolean()
});

type ReferentielFormData = z.infer<typeof referentielSchema>;

interface ReferentielDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ReferentielFormData) => Promise<void>;
  referentiel?: ParametreReferentiel;
  categorieLabel: string;
}

export const ReferentielDialog = ({
  open,
  onOpenChange,
  onSubmit,
  referentiel,
  categorieLabel
}: ReferentielDialogProps) => {
  const isSystemValue = referentiel && !referentiel.modifiable;

  const form = useForm<ReferentielFormData>({
    resolver: zodResolver(referentielSchema),
    defaultValues: {
      code: referentiel?.code || '',
      libelle: referentiel?.libelle || '',
      description: referentiel?.description || '',
      ordre: referentiel?.ordre || 0,
      actif: referentiel?.actif ?? true
    }
  });

  const handleSubmit = async (data: ReferentielFormData) => {
    await onSubmit(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {referentiel ? 'Modifier' : 'Nouveau'} - {categorieLabel}
            {isSystemValue && (
              <Badge variant="secondary" className="ml-2">Système</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          <Form {...form}>
            <form className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: TYPE_01" 
                        {...field} 
                        disabled={!!referentiel || isSystemValue}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ordre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ordre d'affichage</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        disabled={isSystemValue}
                      />
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
                    <Input 
                      placeholder="Ex: Type de compte" 
                      {...field}
                      disabled={isSystemValue}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Description optionnelle..." 
                      className="resize-none" 
                      rows={3}
                      {...field}
                      disabled={isSystemValue}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="actif"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Actif</FormLabel>
                    <FormDescription>
                      Les éléments inactifs n'apparaissent pas dans les listes de sélection
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSystemValue}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {isSystemValue && (
              <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                Cette valeur système ne peut pas être modifiée.
              </div>
            )}

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
          <Button type="button" disabled={isSystemValue} onClick={form.handleSubmit(handleSubmit)}>
            {referentiel ? 'Mettre à jour' : 'Créer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
