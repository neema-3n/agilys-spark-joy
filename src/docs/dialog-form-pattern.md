# Pattern Dialog Form

## Règle d'or

**Tous les formulaires de création/édition doivent utiliser `react-hook-form` + Zod pour la validation, et appeler les edge functions pour la génération automatique des numéros.**

## Pourquoi ce pattern ?

1. **Validation cohérente** : Zod garantit que les données sont validées côté client avant l'envoi
2. **Génération de numéros** : Les edge functions assurent l'unicité des numéros même en cas de concurrence
3. **UX optimale** : Feedback immédiat, gestion des erreurs, états de chargement
4. **Maintenabilité** : Structure identique dans tous les dialogues
5. **Sécurité** : Validation serveur + client, pas de manipulation directe des IDs

## Structure de base

### 1. Imports et types

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
```

### 2. Schéma de validation Zod

```typescript
const formSchema = z.object({
  objet: z.string().min(1, "L'objet est requis"),
  montant: z.coerce.number().positive("Le montant doit être positif"),
  fournisseur_id: z.string().min(1, "Le fournisseur est requis"),
  ligne_budgetaire_id: z.string().min(1, "La ligne budgétaire est requise"),
  date_facture: z.string().min(1, "La date est requise"),
  observations: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;
```

### 3. Props du dialogue

```typescript
interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingId?: string;  // Pour édition, undefined pour création
  onSuccess?: () => void;
}
```

### 4. Initialisation du formulaire

```typescript
const { currentClient } = useClient();
const { currentExercice } = useExercice();

const form = useForm<FormValues>({
  resolver: zodResolver(formSchema),
  defaultValues: {
    objet: '',
    montant: 0,
    fournisseur_id: '',
    ligne_budgetaire_id: '',
    date_facture: new Date().toISOString().split('T')[0],
    observations: '',
  },
});

// Charger les données en mode édition
useEffect(() => {
  if (editingId && open) {
    // Charger l'entité
    const loadData = async () => {
      const data = await service.getById(editingId);
      form.reset({
        objet: data.objet,
        montant: data.montant,
        // ... autres champs
      });
    };
    loadData();
  } else if (!open) {
    form.reset();
  }
}, [editingId, open]);
```

### 5. Soumission du formulaire

```typescript
const onSubmit = async (values: FormValues) => {
  try {
    if (editingId) {
      // Mode édition - simple update
      await updateMutation.mutateAsync({
        id: editingId,
        updates: {
          ...values,
          client_id: currentClient!.id,
          exercice_id: currentExercice!.id,
        },
      });
    } else {
      // Mode création - utiliser l'edge function pour générer le numéro
      await createMutation.mutateAsync({
        ...values,
        client_id: currentClient!.id,
        exercice_id: currentExercice!.id,
      });
    }
    
    onOpenChange(false);
    form.reset();
    onSuccess?.();
  } catch (error) {
    console.error('Erreur:', error);
    toast.error('Une erreur est survenue');
  }
};
```

## Exemples corrects vs incorrects

### ❌ INCORRECT - Génération manuelle du numéro

```typescript
const onSubmit = async (values: FormValues) => {
  // ❌ Ne jamais générer le numéro côté client
  const numero = `FAC-${Date.now()}`;
  
  await supabase.from('factures').insert({
    ...values,
    numero,
  });
};
```

### ✅ CORRECT - Utilisation de l'edge function

```typescript
const onSubmit = async (values: FormValues) => {
  // ✅ L'edge function génère le numéro de façon sécurisée
  const { data, error } = await supabase.functions.invoke('create-facture', {
    body: values,
  });
  
  if (error) throw error;
  return data;
};
```

### ❌ INCORRECT - Validation manuelle

```typescript
const onSubmit = async (values: any) => {
  // ❌ Validation manuelle, fragile et incomplète
  if (!values.objet || values.objet.length === 0) {
    toast.error("L'objet est requis");
    return;
  }
  if (values.montant <= 0) {
    toast.error("Le montant doit être positif");
    return;
  }
};
```

### ✅ CORRECT - Validation Zod

```typescript
const formSchema = z.object({
  objet: z.string().min(1, "L'objet est requis"),
  montant: z.coerce.number().positive("Le montant doit être positif"),
});

const form = useForm<FormValues>({
  resolver: zodResolver(formSchema),
});
```

## Gestion des calculs automatiques

Pour les champs calculés (comme `montant_ttc` = `montant_ht` + `montant_tva`) :

```typescript
const montantHT = form.watch('montant_ht');
const montantTVA = form.watch('montant_tva');

useEffect(() => {
  const ttc = (montantHT || 0) + (montantTVA || 0);
  form.setValue('montant_ttc', ttc);
}, [montantHT, montantTVA]);
```

## Gestion des relations (Select)

```typescript
const { fournisseurs } = useFournisseurs();

<FormField
  control={form.control}
  name="fournisseur_id"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Fournisseur</FormLabel>
      <Select onValueChange={field.onChange} value={field.value}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionnez un fournisseur" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {fournisseurs.map((f) => (
            <SelectItem key={f.id} value={f.id}>
              {f.nom}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

## États conditionnels (lecture seule)

Certains champs deviennent en lecture seule selon le statut :

```typescript
const isReadOnly = editingId && item?.statut !== 'brouillon';

<FormField
  control={form.control}
  name="montant"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Montant</FormLabel>
      <FormControl>
        <Input
          type="number"
          {...field}
          disabled={isReadOnly}
          className={isReadOnly ? 'bg-muted' : ''}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

## Structure HTML du dialogue

```typescript
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>
        {editingId ? 'Modifier' : 'Créer'} une facture
      </DialogTitle>
    </DialogHeader>

    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Champs du formulaire */}
        
        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </Form>
  </DialogContent>
</Dialog>
```

## Points d'attention

- ⚠️ **Toujours utiliser `zodResolver`** : Ne jamais faire de validation manuelle
- ⚠️ **Reset du formulaire** : Appeler `form.reset()` à la fermeture et après succès
- ⚠️ **Génération de numéros** : Toujours passer par les edge functions
- ⚠️ **Client et Exercice** : Toujours inclure `client_id` et `exercice_id` dans les données
- ⚠️ **États de chargement** : Utiliser `form.formState.isSubmitting` pour désactiver le bouton
- ⚠️ **Gestion d'erreurs** : Toujours avoir un try/catch et afficher un toast
- ⚠️ **Relations** : Charger les données de référence (fournisseurs, etc.) avant l'affichage
- ⚠️ **Calculs** : Utiliser `form.watch()` et `useEffect` pour les champs calculés

## Composants implémentant ce pattern

- ✅ `src/components/factures/FactureDialog.tsx`
- ✅ `src/components/engagements/EngagementDialog.tsx`
- ✅ `src/components/depenses/DepenseDialog.tsx`
- ✅ `src/components/bonsCommande/BonCommandeDialog.tsx`
- ✅ `src/components/reservations/ReservationDialog.tsx`
- ✅ `src/components/fournisseurs/FournisseurDialog.tsx`
- ✅ `src/components/projets/ProjetDialog.tsx`
- ✅ `src/components/budget/LigneBudgetaireDialog.tsx`
- ✅ `src/components/budget/ModificationBudgetaireDialog.tsx`
- ✅ `src/components/budget/ProgrammeDialog.tsx`
- ✅ `src/components/budget/SectionDialog.tsx`
- ✅ `src/components/budget/ActionDialog.tsx`
- ✅ `src/components/parametres/EnveloppeDialog.tsx`
- ✅ `src/components/parametres/ExerciceDialog.tsx`
- ✅ `src/components/parametres/ReferentielDialog.tsx`

## Checklist pour nouveaux dialogues

Lors de la création d'un nouveau dialogue de formulaire, vérifier :

- [ ] Le schéma Zod est défini avec tous les champs requis
- [ ] Le formulaire utilise `react-hook-form` avec `zodResolver`
- [ ] La création utilise l'edge function pour générer le numéro
- [ ] L'édition charge les données existantes dans `useEffect`
- [ ] Le formulaire se reset à la fermeture et après succès
- [ ] Les champs calculés utilisent `form.watch()` et `useEffect`
- [ ] Les selects de relations sont alimentés par les hooks appropriés
- [ ] Les états conditionnels (lecture seule) sont gérés selon le statut
- [ ] Les messages d'erreur sont clairs et en français
- [ ] Les boutons ont des états de chargement (`isSubmitting`)
- [ ] Le dialogue a une hauteur max et scroll si nécessaire (`max-h-[90vh] overflow-y-auto`)
- [ ] Un toast de succès/erreur est affiché après soumission
