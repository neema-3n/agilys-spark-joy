import { useEffect } from 'react';
import { Programme, Section } from '@/types/budget.types';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const programmeSchema = z.object({
  section_id: z.string().min(1, "Veuillez sélectionner une section"),
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

interface ProgrammeDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Programme, 'id' | 'created_at' | 'updated_at'>) => void;
  programme?: Programme | null;
  sections: Section[];
  clientId: string;
  exerciceId: string;
}

export const ProgrammeDialog = ({
  open,
  onClose,
  onSubmit,
  programme,
  sections,
  clientId,
  exerciceId,
}: ProgrammeDialogProps) => {
  const form = useForm<z.infer<typeof programmeSchema>>({
    resolver: zodResolver(programmeSchema),
    defaultValues: {
      section_id: '',
      code: '',
      libelle: '',
      ordre: 0,
    },
  });

  useEffect(() => {
    if (programme) {
      form.reset({
        section_id: programme.section_id,
        code: programme.code,
        libelle: programme.libelle,
        ordre: programme.ordre,
      });
    } else {
      form.reset({
        section_id: '',
        code: '',
        libelle: '',
        ordre: 0,
      });
    }
  }, [programme, open, form]);

  const handleSubmit = (values: z.infer<typeof programmeSchema>) => {
    onSubmit({
      section_id: values.section_id,
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
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {programme ? 'Modifier le programme' : 'Nouveau programme'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          <Form {...form}>
            <form className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="section_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une section" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sections.map((section) => (
                          <SelectItem key={section.id} value={section.id}>
                            {section.code} - {section.libelle}
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
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: P01" {...field} />
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
                      <Input placeholder="Ex: Administration Générale" {...field} />
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
        </div>
        
        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button 
            type="button"
            disabled={!form.formState.isValid}
            onClick={form.handleSubmit(handleSubmit)}
          >
            {programme ? 'Modifier' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
