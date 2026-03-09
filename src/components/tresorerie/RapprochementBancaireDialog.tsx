import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useComptesTresorerie } from '@/hooks/useComptesTresorerie';
import type { RapprochementBancaireFormData } from '@/types/rapprochement-bancaire.types';

const lineSchema = z.object({
  dateOperation: z.string().min(1, 'Date requise'),
  libelle: z.string().min(1, 'Libellé requis'),
  referenceBancaire: z.string().optional(),
  montant: z.coerce.number().positive('Montant requis'),
  typeFlux: z.enum(['encaissement', 'decaissement']),
});

const rapprochementSchema = z.object({
  compteId: z.string().min(1, 'Compte requis'),
  dateDebut: z.string().min(1, 'Date de début requise'),
  dateFin: z.string().min(1, 'Date de fin requise'),
  soldeReleve: z.coerce.number().min(0, 'Solde relevé requis'),
  observations: z.string().optional(),
  statementLines: z.array(lineSchema).min(1, 'Ajoutez au moins une ligne de relevé'),
});

interface RapprochementBancaireDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: RapprochementBancaireFormData) => Promise<void>;
  pending?: boolean;
}

export const RapprochementBancaireDialog = ({
  open,
  onOpenChange,
  onSubmit,
  pending = false,
}: RapprochementBancaireDialogProps) => {
  const { comptesActifs, isLoading } = useComptesTresorerie();
  const form = useForm<RapprochementBancaireFormData>({
    resolver: zodResolver(rapprochementSchema),
    defaultValues: {
      compteId: '',
      dateDebut: new Date().toISOString().slice(0, 10),
      dateFin: new Date().toISOString().slice(0, 10),
      soldeReleve: 0,
      observations: '',
      statementLines: [
        {
          dateOperation: new Date().toISOString().slice(0, 10),
          libelle: '',
          referenceBancaire: '',
          montant: 0,
          typeFlux: 'encaissement',
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'statementLines',
  });

  const handleSubmit = async (data: RapprochementBancaireFormData) => {
    await onSubmit(data);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Nouveau rapprochement bancaire</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="compteId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Compte de trésorerie</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={isLoading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un compte" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {comptesActifs.map((compte) => (
                          <SelectItem key={compte.id} value={compte.id}>
                            {compte.code} - {compte.libelle}
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
                name="soldeReleve"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Solde relevé</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateDebut"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de début</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateFin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de fin</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
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
                    <Textarea rows={3} placeholder="Contexte, remarques, source du relevé..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Lignes du relevé bancaire</h3>
                  <p className="text-sm text-muted-foreground">
                    Chaque ligne alimente le moteur de propositions déterministes côté backend.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({
                      dateOperation: form.getValues('dateFin') || new Date().toISOString().slice(0, 10),
                      libelle: '',
                      referenceBancaire: '',
                      montant: 0,
                      typeFlux: 'encaissement',
                    })
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter une ligne
                </Button>
              </div>

              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="rounded-lg border p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-sm font-medium">Ligne {index + 1}</span>
                      {fields.length > 1 ? (
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name={`statementLines.${index}.dateOperation`}
                        render={({ field: itemField }) => (
                          <FormItem>
                            <FormLabel>Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...itemField} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`statementLines.${index}.typeFlux`}
                        render={({ field: itemField }) => (
                          <FormItem>
                            <FormLabel>Type de flux</FormLabel>
                            <Select value={itemField.value} onValueChange={itemField.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="encaissement">Encaissement</SelectItem>
                                <SelectItem value="decaissement">Décaissement</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`statementLines.${index}.montant`}
                        render={({ field: itemField }) => (
                          <FormItem>
                            <FormLabel>Montant</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...itemField} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`statementLines.${index}.referenceBancaire`}
                        render={({ field: itemField }) => (
                          <FormItem>
                            <FormLabel>Référence bancaire</FormLabel>
                            <FormControl>
                              <Input placeholder="VIR-2026-001..." {...itemField} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name={`statementLines.${index}.libelle`}
                      render={({ field: itemField }) => (
                        <FormItem className="mt-4">
                          <FormLabel>Libellé</FormLabel>
                          <FormControl>
                            <Input placeholder="Libellé du mouvement relevé" {...itemField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={pending || form.formState.isSubmitting}>
                Lancer les propositions
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
