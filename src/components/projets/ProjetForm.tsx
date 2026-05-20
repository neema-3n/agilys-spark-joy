import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Projet } from '@/types/projet.types';
import { useReferentiels } from '@/hooks/useReferentiels';
import { useEnveloppes } from '@/hooks/useEnveloppes';
import { SinglePageFormFooter } from '@/components/shared/SinglePageFormFooter';

export const projetFormSchema = z.object({
  code: z.string().min(1, 'Le code est requis'),
  nom: z.string().min(1, 'Le nom est requis'),
  description: z.string().optional(),
  responsable: z.string().optional(),
  dateDebut: z.date({ required_error: 'La date de début est requise' }),
  dateFin: z.date({ required_error: 'La date de fin est requise' }),
  budgetAlloue: z.coerce.number().min(0, 'Le budget doit être positif'),
  enveloppeId: z.string().optional().or(z.literal(undefined)),
  statut: z.string(),
  typeProjet: z.string().optional(),
  priorite: z.string(),
  tauxAvancement: z.number().min(0).max(100),
}).refine((data) => data.dateFin >= data.dateDebut, {
  message: 'La date de fin doit être après la date de début',
  path: ['dateFin'],
});

type ProjetFormValues = z.infer<typeof projetFormSchema>;
export type ProjetFormSubmitData = Omit<ProjetFormValues, 'dateDebut' | 'dateFin'> & {
  dateDebut: string;
  dateFin: string;
};

const defaultValues: ProjetFormValues = {
  code: '',
  nom: '',
  description: '',
  responsable: '',
  dateDebut: new Date(),
  dateFin: new Date(),
  budgetAlloue: 0,
  enveloppeId: undefined,
  statut: 'planifie',
  typeProjet: undefined,
  priorite: '',
  tauxAvancement: 0,
};

const getInitialValues = (projet?: Projet | null): ProjetFormValues =>
  projet
    ? {
        code: projet.code,
        nom: projet.nom,
        description: projet.description || '',
        responsable: projet.responsable || '',
        dateDebut: new Date(projet.dateDebut),
        dateFin: new Date(projet.dateFin),
        budgetAlloue: projet.budgetAlloue,
        enveloppeId: projet.enveloppeId,
        statut: projet.statut,
        typeProjet: projet.typeProjet,
        priorite: projet.priorite || '',
        tauxAvancement: projet.tauxAvancement,
      }
    : defaultValues;

interface ProjetFormProps {
  projet?: Projet | null;
  onSubmit: (data: ProjetFormSubmitData) => Promise<void>;
  onCancel: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
  submitLabel?: string;
}

export const ProjetForm = ({ projet, onSubmit, onCancel, onDirtyChange, submitLabel }: ProjetFormProps) => {
  const { data: typesProjet = [] } = useReferentiels('type_projet');
  const { data: statutsProjet = [] } = useReferentiels('statut_projet');
  const { data: priorites = [] } = useReferentiels('priorite_projet');
  const { enveloppes } = useEnveloppes();

  const form = useForm<ProjetFormValues>({
    resolver: zodResolver(projetFormSchema),
    defaultValues,
  });

  useEffect(() => {
    form.reset(getInitialValues(projet));
  }, [projet, form]);

  useEffect(() => {
    onDirtyChange?.(form.formState.isDirty);
  }, [form.formState.isDirty, onDirtyChange]);

  useEffect(() => {
    return () => onDirtyChange?.(false);
  }, [onDirtyChange]);

  const handleSubmit = async (values: ProjetFormValues) => {
    await onSubmit({
      ...values,
      dateDebut: format(values.dateDebut, 'yyyy-MM-dd'),
      dateFin: format(values.dateFin, 'yyyy-MM-dd'),
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem>
                  <FormLabel>Code *</FormLabel>
                  <FormControl><Input placeholder="PROJ-001" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="nom" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom *</FormLabel>
                  <FormControl><Input placeholder="Nom du projet" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Textarea placeholder="Description du projet" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField control={form.control} name="responsable" render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsable</FormLabel>
                  <FormControl><Input placeholder="Nom du responsable" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="budgetAlloue" render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget alloué *</FormLabel>
                  <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField control={form.control} name="dateDebut" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date de début *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className={cn('pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>
                          {field.value ? format(field.value, 'PPP') : <span>Choisir une date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus className="pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="dateFin" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date de fin *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className={cn('pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>
                          {field.value ? format(field.value, 'PPP') : <span>Choisir une date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus className="pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField control={form.control} name="enveloppeId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Enveloppe budgétaire</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner une enveloppe" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">Aucune enveloppe</SelectItem>
                      {enveloppes.map((enveloppe) => (
                        <SelectItem key={enveloppe.id} value={enveloppe.id}>{enveloppe.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="typeProjet" render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de projet</FormLabel>
                  <Select onValueChange={(value) => field.onChange(value === 'none' ? undefined : value)} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner un type" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">Aucun type</SelectItem>
                      {typesProjet.map((type) => (
                        <SelectItem key={type.id} value={type.code}>{type.libelle}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField control={form.control} name="statut" render={({ field }) => (
                <FormItem>
                  <FormLabel>Statut</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {statutsProjet.map((statut) => (
                        <SelectItem key={statut.id} value={statut.code}>{statut.libelle}</SelectItem>
                      ))}
                      {statutsProjet.length === 0 && <SelectItem value="planifie">Planifié</SelectItem>}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="priorite" render={({ field }) => (
                <FormItem>
                  <FormLabel>Priorité</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner une priorité" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {priorites.map((priorite) => (
                        <SelectItem key={priorite.id} value={priorite.code}>{priorite.libelle}</SelectItem>
                      ))}
                      {priorites.length === 0 && (
                        <>
                          <SelectItem value="haute">Haute</SelectItem>
                          <SelectItem value="moyenne">Moyenne</SelectItem>
                          <SelectItem value="basse">Basse</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="tauxAvancement" render={({ field }) => (
              <FormItem>
                <FormLabel>Taux d'avancement: {field.value}%</FormLabel>
                <FormControl>
                  <Slider min={0} max={100} step={5} value={[field.value]} onValueChange={(value) => field.onChange(value[0])} className="py-4" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        <SinglePageFormFooter
          mode={projet ? 'edit' : 'create'}
          onCancel={onCancel}
          isSubmitting={form.formState.isSubmitting}
          submitLabel={submitLabel}
        />
      </form>
    </Form>
  );
};
