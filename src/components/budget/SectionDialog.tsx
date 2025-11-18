import { useEffect } from 'react';
import { Section } from '@/types/budget.types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const sectionSchema = z.object({
  code: z.string()
    .min(2, "Le code doit contenir au moins 2 caractères")
    .max(10, "Le code ne peut pas dépasser 10 caractères"),
  libelle: z.string()
    .min(3, "Le libellé doit contenir au moins 3 caractères")
    .max(200, "Le libellé ne peut pas dépasser 200 caractères"),
  ordre: z.coerce.number()
    .int("L'ordre doit être un nombre entier")
    .min(0, "L'ordre doit être positif ou zéro"),
});

interface SectionDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Section, 'id' | 'created_at' | 'updated_at'>) => void;
  section?: Section | null;
  clientId: string;
  exerciceId: string;
}

export const SectionDialog = ({
  open,
  onClose,
  onSubmit,
  section,
  clientId,
  exerciceId,
}: SectionDialogProps) => {
  const form = useForm<z.infer<typeof sectionSchema>>({
    resolver: zodResolver(sectionSchema),
    defaultValues: {
      code: '',
      libelle: '',
      ordre: 0,
    },
  });

  useEffect(() => {
    if (section) {
      form.reset({
        code: section.code,
        libelle: section.libelle,
        ordre: section.ordre,
      });
    } else {
      form.reset({
        code: '',
        libelle: '',
        ordre: 0,
      });
    }
  }, [section, open, form]);

  const handleSubmit = (values: z.infer<typeof sectionSchema>) => {
    onSubmit({
      code: values.code,
      libelle: values.libelle,
      ordre: values.ordre,
      client_id: clientId,
      exercice_id: exerciceId,
      statut: 'actif',
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {section ? 'Modifier la section' : 'Nouvelle section'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-1 min-h-0">
          <Form {...form}>
            <form className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: S01" {...field} />
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
                    <FormLabel>Libellé</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Fonctionnement" {...field} />
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
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </ScrollArea>
        
        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button 
            type="button"
            disabled={!form.formState.isValid}
            onClick={form.handleSubmit(handleSubmit)}
          >
            {section ? 'Modifier' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
