# AGENTS - Workflows Pratiques

> **🎯 Objectif** : Guides pratiques pour modifications courantes dans AGILYS
> **👥 Pour qui** : Agents IA intervenant sur le code
> **⏱️ Dernière MAJ** : 2025-01-21

## 📍 Navigation Rapide

- [Ajouter une Nouvelle Entité](#-workflow-1--ajouter-une-nouvelle-entité)
- [Ajouter un Champ à une Entité](#-workflow-2--ajouter-un-champ-à-une-entité-existante)
- [Ajouter un Calcul/Statistique](#-workflow-3--ajouter-un-nouveau-calculstatistique)
- [Modifier un Workflow de Validation](#-workflow-4--modifier-un-workflow-de-validation)
- [Ajouter un Rapport](#-workflow-5--ajouter-un-nouveau-rapport)
- [Corriger un Bug](#-workflow-6--corriger-un-bug)

---

## 🆕 Workflow 1 : Ajouter une Nouvelle Entité

### Exemple : Ajouter l'entité "Documents"

Permet de gérer les documents attachés aux engagements, factures, etc.

---

### Étape 1 : Migration Supabase

**Fichier** : Créer via outil de migration Lovable

```sql
-- Table documents
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  exercice_id UUID REFERENCES exercices(id) ON DELETE CASCADE,
  
  -- Identification
  numero TEXT NOT NULL UNIQUE,
  nom_fichier TEXT NOT NULL,
  type_document TEXT NOT NULL, -- 'contrat', 'facture_scan', 'rapport', etc.
  taille_octets BIGINT NOT NULL,
  
  -- Relations
  entite_type TEXT NOT NULL, -- 'engagement', 'facture', 'depense', etc.
  entite_id UUID NOT NULL,
  
  -- Métadonnées
  description TEXT,
  url_stockage TEXT NOT NULL,
  
  -- Dates
  date_upload TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Index
CREATE INDEX idx_documents_client ON documents(client_id);
CREATE INDEX idx_documents_exercice ON documents(exercice_id);
CREATE INDEX idx_documents_entite ON documents(entite_type, entite_id);

-- RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their client's documents"
ON documents FOR SELECT
USING (
  client_id IN (
    SELECT client_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Authorized users can insert documents"
ON documents FOR INSERT
WITH CHECK (
  client_id IN (
    SELECT client_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Authorized users can update their documents"
ON documents FOR UPDATE
USING (
  client_id IN (
    SELECT client_id FROM profiles WHERE id = auth.uid()
  )
  AND created_by = auth.uid()
);

CREATE POLICY "Authorized users can delete their documents"
ON documents FOR DELETE
USING (
  client_id IN (
    SELECT client_id FROM profiles WHERE id = auth.uid()
  )
  AND created_by = auth.uid()
);

-- Trigger updated_at
CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON documents
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

---

### Étape 2 : Types TypeScript

**Fichier** : `src/types/document.types.ts`

```typescript
export type TypeDocument = 
  | 'contrat'
  | 'facture_scan'
  | 'rapport'
  | 'bon_commande'
  | 'autre';

export type EntiteType = 
  | 'engagement'
  | 'facture'
  | 'depense'
  | 'projet';

export interface Document {
  id: string;
  clientId: string;
  exerciceId: string;
  numero: string;
  nomFichier: string;
  typeDocument: TypeDocument;
  tailleOctets: number;
  entiteType: EntiteType;
  entiteId: string;
  description?: string;
  urlStockage: string;
  dateUpload: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface CreateDocumentInput {
  clientId: string;
  exerciceId: string;
  nomFichier: string;
  typeDocument: TypeDocument;
  tailleOctets: number;
  entiteType: EntiteType;
  entiteId: string;
  description?: string;
  urlStockage: string;
}

export interface UpdateDocumentInput {
  nomFichier?: string;
  typeDocument?: TypeDocument;
  description?: string;
}
```

---

### Étape 3 : Service API

**Fichier** : `src/services/api/documents.service.ts`

```typescript
import { supabase } from '@/integrations/supabase/client';
import { Document, CreateDocumentInput, UpdateDocumentInput } from '@/types/document.types';

const mapFromDatabase = (row: any): Document => ({
  id: row.id,
  clientId: row.client_id,
  exerciceId: row.exercice_id,
  numero: row.numero,
  nomFichier: row.nom_fichier,
  typeDocument: row.type_document,
  tailleOctets: parseInt(row.taille_octets || 0),
  entiteType: row.entite_type,
  entiteId: row.entite_id,
  description: row.description,
  urlStockage: row.url_stockage,
  dateUpload: row.date_upload,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  createdBy: row.created_by,
});

const mapToDatabase = (input: CreateDocumentInput | UpdateDocumentInput) => ({
  client_id: (input as any).clientId,
  exercice_id: (input as any).exerciceId,
  nom_fichier: (input as any).nomFichier,
  type_document: (input as any).typeDocument,
  taille_octets: (input as any).tailleOctets,
  entite_type: (input as any).entiteType,
  entite_id: (input as any).entiteId,
  description: (input as any).description,
  url_stockage: (input as any).urlStockage,
});

export const documentsService = {
  async getByEntite(entiteType: string, entiteId: string): Promise<Document[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('entite_type', entiteType)
      .eq('entite_id', entiteId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapFromDatabase);
  },

  async create(input: CreateDocumentInput): Promise<Document> {
    // Génération numéro
    const numero = `DOC/${new Date().getFullYear()}/${Date.now()}`;
    
    const { data, error } = await supabase
      .from('documents')
      .insert({
        ...mapToDatabase(input),
        numero,
      })
      .select()
      .single();

    if (error) throw error;
    return mapFromDatabase(data);
  },

  async update(id: string, input: UpdateDocumentInput): Promise<Document> {
    const dbData = mapToDatabase(input);
    const { data, error } = await supabase
      .from('documents')
      .update(dbData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapFromDatabase(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
```

---

### Étape 4 : Hook Personnalisé

**Fichier** : `src/hooks/useDocuments.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsService } from '@/services/api/documents.service';
import { CreateDocumentInput, UpdateDocumentInput } from '@/types/document.types';
import { toast } from 'sonner';

export const useDocuments = (entiteType: string, entiteId: string) => {
  const queryClient = useQueryClient();
  const queryKey = ['documents', entiteType, entiteId];

  const { data: documents = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => documentsService.getByEntite(entiteType, entiteId),
    enabled: !!entiteId,
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateDocumentInput) => documentsService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Document ajouté avec succès');
    },
    onError: (error) => {
      console.error('Error creating document:', error);
      toast.error('Erreur lors de l\'ajout du document');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDocumentInput }) =>
      documentsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Document mis à jour');
    },
    onError: (error) => {
      console.error('Error updating document:', error);
      toast.error('Erreur lors de la mise à jour');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Document supprimé');
    },
    onError: (error) => {
      console.error('Error deleting document:', error);
      toast.error('Erreur lors de la suppression');
    },
  });

  return {
    documents,
    isLoading,
    createDocument: createMutation.mutateAsync,
    updateDocument: updateMutation.mutateAsync,
    deleteDocument: deleteMutation.mutateAsync,
  };
};
```

---

### Étape 5 : Composants UI

#### Table

**Fichier** : `src/components/documents/DocumentTable.tsx`

```typescript
import { ColumnDef } from '@tanstack/react-table';
import { Document } from '@/types/document.types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export const useDocumentColumns = (
  onDownload: (doc: Document) => void,
  onDelete: (id: string) => void
): ColumnDef<Document>[] => [
  {
    accessorKey: 'nomFichier',
    header: 'Fichier',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{row.getValue('nomFichier')}</span>
      </div>
    ),
  },
  {
    accessorKey: 'typeDocument',
    header: 'Type',
    cell: ({ row }) => (
      <Badge variant="outline">{row.getValue('typeDocument')}</Badge>
    ),
  },
  {
    accessorKey: 'description',
    header: 'Description',
  },
  {
    accessorKey: 'dateUpload',
    header: 'Date',
    cell: ({ row }) => formatDate(row.getValue('dateUpload')),
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDownload(row.original)}
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(row.original.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    ),
  },
];
```

#### Dialog Upload

**Fichier** : `src/components/documents/DocumentUploadDialog.tsx`

```typescript
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDocuments } from '@/hooks/useDocuments';
import { supabase } from '@/integrations/supabase/client';

interface DocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entiteType: string;
  entiteId: string;
  clientId: string;
  exerciceId: string;
}

export const DocumentUploadDialog = ({
  open,
  onOpenChange,
  entiteType,
  entiteId,
  clientId,
  exerciceId,
}: DocumentUploadDialogProps) => {
  const { createDocument } = useDocuments(entiteType, entiteId);
  const [file, setFile] = useState<File | null>(null);
  const [typeDocument, setTypeDocument] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file || !typeDocument) return;

    setUploading(true);
    try {
      // Upload vers Supabase Storage
      const filePath = `${clientId}/${exerciceId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Créer l'entrée en DB
      await createDocument({
        clientId,
        exerciceId,
        nomFichier: file.name,
        typeDocument: typeDocument as any,
        tailleOctets: file.size,
        entiteType: entiteType as any,
        entiteId,
        description,
        urlStockage: filePath,
      });

      onOpenChange(false);
      setFile(null);
      setTypeDocument('');
      setDescription('');
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un document</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Fichier</Label>
            <Input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <div>
            <Label>Type de document</Label>
            <Select value={typeDocument} onValueChange={setTypeDocument}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contrat">Contrat</SelectItem>
                <SelectItem value="facture_scan">Facture scannée</SelectItem>
                <SelectItem value="rapport">Rapport</SelectItem>
                <SelectItem value="bon_commande">Bon de commande</SelectItem>
                <SelectItem value="autre">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description (optionnel)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <Button onClick={handleUpload} disabled={!file || !typeDocument || uploading}>
            {uploading ? 'Upload en cours...' : 'Ajouter'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

---

### Étape 6 : Intégration dans Pages Existantes

**Fichier** : `src/pages/app/Engagements.tsx` (ajouter section documents)

```typescript
import { DocumentUploadDialog } from '@/components/documents/DocumentUploadDialog';
import { DocumentTable } from '@/components/documents/DocumentTable';
import { useDocuments } from '@/hooks/useDocuments';

// Dans le composant
const [showDocuments, setShowDocuments] = useState(false);
const { documents } = useDocuments('engagement', selectedEngagement?.id);

// Dans le JSX (dans EngagementSnapshot ou à côté)
{showDocuments && (
  <div>
    <h3>Documents attachés</h3>
    <DocumentTable documents={documents} />
    <DocumentUploadDialog
      entiteType="engagement"
      entiteId={selectedEngagement.id}
      clientId={clientId}
      exerciceId={exerciceId}
    />
  </div>
)}
```

---

### ✅ Checklist Finale

- [ ] Migration SQL exécutée et validée
- [ ] Types TypeScript créés (document.types.ts)
- [ ] Service API implémenté (documents.service.ts)
- [ ] Hook personnalisé créé (useDocuments.ts)
- [ ] Composants UI créés (Table, Dialog)
- [ ] Intégration dans pages existantes
- [ ] RLS policies activées et testées
- [ ] Upload vers Supabase Storage fonctionnel
- [ ] Download fonctionnel
- [ ] Suppression fonctionnelle
- [ ] Tests manuels réalisés

---

## ➕ Workflow 2 : Ajouter un Champ à une Entité Existante

### Exemple : Ajouter "priorite" à l'entité "Engagement"

---

### Étape 1 : Migration SQL

```sql
-- Ajouter colonne priorite
ALTER TABLE engagements
ADD COLUMN priorite TEXT DEFAULT 'moyenne' CHECK (priorite IN ('basse', 'moyenne', 'haute', 'critique'));

-- Mettre à jour les engagements existants
UPDATE engagements SET priorite = 'moyenne' WHERE priorite IS NULL;
```

---

### Étape 2 : Mettre à Jour les Types

**Fichier** : `src/types/engagement.types.ts`

```typescript
export type PrioriteEngagement = 'basse' | 'moyenne' | 'haute' | 'critique';

export interface Engagement {
  // ... existing fields
  priorite: PrioriteEngagement; // ✅ Ajouter
}

export interface CreateEngagementInput {
  // ... existing fields
  priorite?: PrioriteEngagement; // ✅ Ajouter (optionnel)
}

export interface UpdateEngagementInput {
  // ... existing fields
  priorite?: PrioriteEngagement; // ✅ Ajouter
}
```

---

### Étape 3 : Mettre à Jour le Service API

**Fichier** : `src/services/api/engagements.service.ts`

```typescript
const mapFromDatabase = (row: any): Engagement => ({
  // ... existing mappings
  priorite: row.priorite as PrioriteEngagement, // ✅ Ajouter
});

const mapToDatabase = (input: CreateEngagementInput | UpdateEngagementInput) => ({
  // ... existing mappings
  priorite: (input as any).priorite, // ✅ Ajouter
});
```

---

### Étape 4 : Mettre à Jour le Dialog (Formulaire)

**Fichier** : `src/components/engagements/EngagementDialog.tsx`

```typescript
// Schéma Zod
const formSchema = z.object({
  // ... existing fields
  priorite: z.enum(['basse', 'moyenne', 'haute', 'critique']).optional(), // ✅ Ajouter
});

// defaultValues
const form = useForm({
  // ...
  defaultValues: {
    // ... existing
    priorite: engagement?.priorite || 'moyenne', // ✅ Ajouter
  },
});

// JSX - Ajouter champ Select
<FormField
  control={form.control}
  name="priorite"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Priorité</FormLabel>
      <Select onValueChange={field.onChange} value={field.value}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="basse">Basse</SelectItem>
          <SelectItem value="moyenne">Moyenne</SelectItem>
          <SelectItem value="haute">Haute</SelectItem>
          <SelectItem value="critique">Critique</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

---

### Étape 5 : Mettre à Jour la Table

**Fichier** : `src/components/engagements/EngagementTable.tsx`

```typescript
// Ajouter colonne priorite
{
  accessorKey: 'priorite',
  header: 'Priorité',
  cell: ({ row }) => {
    const priorite = row.getValue('priorite') as string;
    const variant =
      priorite === 'critique' ? 'destructive' :
      priorite === 'haute' ? 'warning' :
      priorite === 'moyenne' ? 'default' :
      'secondary';
    
    return <Badge variant={variant}>{priorite}</Badge>;
  },
}
```

---

### Étape 6 : Mettre à Jour le Snapshot

**Fichier** : `src/components/engagements/EngagementSnapshot.tsx`

```typescript
// Ajouter affichage priorite
<div className="grid grid-cols-2 gap-4">
  {/* ... existing fields */}
  <div>
    <label className="text-sm text-muted-foreground">Priorité</label>
    <Badge variant={
      engagement.priorite === 'critique' ? 'destructive' :
      engagement.priorite === 'haute' ? 'warning' :
      'default'
    }>
      {engagement.priorite}
    </Badge>
  </div>
</div>
```

---

### ✅ Checklist

- [ ] Migration SQL exécutée
- [ ] Types TypeScript mis à jour
- [ ] Service API mis à jour (mapFromDatabase, mapToDatabase)
- [ ] Dialog form mis à jour (Zod + defaultValues + JSX)
- [ ] Table mise à jour (nouvelle colonne)
- [ ] Snapshot mis à jour (affichage)
- [ ] Tests manuels (création, modification, affichage)

---

## 📊 Workflow 3 : Ajouter un Nouveau Calcul/Statistique

### Exemple : Ajouter "Taux de réalisation" dans le Dashboard

---

### Étape 1 : Identifier l'Emplacement

- Dashboard principal (`src/pages/app/Dashboard.tsx`)
- Stats d'une entité (`src/components/engagements/EngagementStats.tsx`)

---

### Étape 2 : Implémenter le Calcul

**Fichier** : `src/pages/app/Dashboard.tsx`

```typescript
import { useMemo } from 'react';
import { StatsCard } from '@/components/ui/stats-card';
import { TrendingUp } from 'lucide-react';
import { formatPercentage } from '@/lib/utils';

// Dans le composant
const tauxRealisation = useMemo(() => {
  if (!lignesBudgetaires.length) return 0;
  
  const totalInitial = lignesBudgetaires.reduce(
    (sum, ligne) => sum + ligne.montantInitial,
    0
  );
  
  const totalPaye = lignesBudgetaires.reduce(
    (sum, ligne) => sum + ligne.montantPaye,
    0
  );
  
  return totalInitial > 0 ? (totalPaye / totalInitial) * 100 : 0;
}, [lignesBudgetaires]);

// JSX
<StatsCard
  title="Taux de Réalisation"
  value={formatPercentage(tauxRealisation)}
  icon={TrendingUp}
  trend={tauxRealisation > 80 ? { value: 10, isPositive: true } : undefined}
  variant={tauxRealisation > 80 ? 'success' : 'default'}
/>
```

---

### Étape 3 : Créer Helper de Formatage (si nécessaire)

**Fichier** : `src/lib/utils.ts`

```typescript
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)} %`;
}
```

---

### ✅ Checklist

- [ ] useMemo utilisé pour calcul
- [ ] StatsCard du design system
- [ ] Variant sémantique approprié
- [ ] Formatage cohérent
- [ ] Performance vérifiée (pas de recalcul inutile)

---

## ✏️ Workflow 4 : Modifier un Workflow de Validation

### Exemple : Ajouter "Validation Directeur Financier" après "En Attente"

---

### Étape 1 : Comprendre le Flux Existant

```
brouillon → en_attente → valide
```

**Nouveau flux souhaité** :

```
brouillon → en_attente → validation_df → valide
```

---

### Étape 2 : Modifier le Type Statut

**Fichier** : `src/types/engagement.types.ts`

```typescript
export type StatutEngagement =
  | 'brouillon'
  | 'en_attente'
  | 'validation_df'  // ✅ Nouveau
  | 'valide'
  | 'annule';
```

---

### Étape 3 : Modifier l'Edge Function

**Fichier** : `supabase/functions/create-engagement/index.ts`

```typescript
// Ajouter logique de validation DF
if (action === 'soumettre') {
  // Vérifier rôle utilisateur
  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  const roles = userRoles?.map(r => r.role) || [];

  // Si admin/DF → validation directe
  if (roles.includes('admin_client') || roles.includes('directeur_financier')) {
    newStatut = 'valide';
  } else {
    // Sinon → en attente validation DF
    newStatut = 'validation_df';
  }
}

// Ajouter action valider_df
if (action === 'valider_df') {
  // Vérifier rôle DF
  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  if (!userRoles?.some(r => ['admin_client', 'directeur_financier'].includes(r.role))) {
    throw new Error('Rôle insuffisant');
  }

  newStatut = 'valide';
  dateValidation = new Date().toISOString();
}
```

---

### Étape 4 : Mettre à Jour les Badges

**Fichier** : Partout où statuts affichés (Table, Snapshot, etc.)

```typescript
const statutVariant =
  statut === 'valide' ? 'success' :
  statut === 'validation_df' ? 'warning' :  // ✅ Nouveau
  statut === 'en_attente' ? 'default' :
  'secondary';
```

---

### Étape 5 : Mettre à Jour les Actions Disponibles

**Fichier** : `src/components/engagements/EngagementSnapshot.tsx`

```typescript
// Bouton "Valider" (DF uniquement)
{engagement.statut === 'validation_df' && hasRole(['directeur_financier', 'admin_client']) && (
  <Button onClick={() => onValider(engagement.id)}>
    Valider (DF)
  </Button>
)}
```

---

### ✅ Checklist

- [ ] Type StatutEngagement mis à jour
- [ ] Edge function modifiée
- [ ] Badges mis à jour
- [ ] Actions conditionnelles mises à jour
- [ ] RLS policies vérifiées (si nécessaire)
- [ ] Tests manuels du nouveau workflow

---

## 📋 Workflow 5 : Ajouter un Nouveau Rapport

### Exemple : Rapport "Suivi des Engagements par Fournisseur"

---

### Étape 1 : Créer la Page Rapport

**Fichier** : `src/pages/app/RapportEngagementsFournisseurs.tsx`

```typescript
import { useEngagements } from '@/hooks/useEngagements';
import { useFournisseurs } from '@/hooks/useFournisseurs';
import { useMemo } from 'react';

export const RapportEngagementsFournisseurs = () => {
  const { engagements, isLoading: loadingEng } = useEngagements();
  const { fournisseurs, isLoading: loadingFour } = useFournisseurs();

  const rapport = useMemo(() => {
    // Grouper par fournisseur
    const grouped = engagements.reduce((acc, eng) => {
      const fourId = eng.fournisseurId || 'sans_fournisseur';
      if (!acc[fourId]) {
        acc[fourId] = {
          fournisseur: fournisseurs.find(f => f.id === fourId),
          engagements: [],
          montantTotal: 0,
          nombreEngagements: 0,
        };
      }
      acc[fourId].engagements.push(eng);
      acc[fourId].montantTotal += eng.montant;
      acc[fourId].nombreEngagements++;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped);
  }, [engagements, fournisseurs]);

  if (loadingEng || loadingFour) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Suivi Engagements par Fournisseur</h1>
      
      {rapport.map((item: any) => (
        <Card key={item.fournisseur?.id || 'sans'}>
          <CardHeader>
            <CardTitle>{item.fournisseur?.nom || 'Sans fournisseur'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <StatsCard
                title="Nombre d'engagements"
                value={item.nombreEngagements}
              />
              <StatsCard
                title="Montant total"
                value={formatCurrency(item.montantTotal)}
              />
            </div>
            <Table>
              {/* Liste des engagements */}
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
```

---

### Étape 2 : Ajouter la Route

**Fichier** : `src/pages/app/AppLayout.tsx`

```typescript
import { RapportEngagementsFournisseurs } from './RapportEngagementsFournisseurs';

// Dans les routes
<Route path="rapports/engagements-fournisseurs" element={<RapportEngagementsFournisseurs />} />
```

---

### Étape 3 : Ajouter le Lien dans le Menu

**Fichier** : `src/components/app/AppHeader.tsx`

```typescript
<NavigationMenuItem>
  <Link to="/app/rapports/engagements-fournisseurs">
    Engagements par Fournisseur
  </Link>
</NavigationMenuItem>
```

---

### ✅ Checklist

- [ ] Page rapport créée
- [ ] Calculs avec useMemo
- [ ] Route ajoutée dans AppLayout
- [ ] Lien menu ajouté
- [ ] Tests manuels (données, performance)

---

## 🐛 Workflow 6 : Corriger un Bug

### Exemple : "Le montant disponible ne se met pas à jour après validation engagement"

---

### Étape 1 : Reproduire le Bug

1. Noter les étapes exactes
2. Identifier les données concernées
3. Vérifier les logs console/réseau

---

### Étape 2 : Identifier la Cause

**Hypothèses** :
- Le trigger DB ne s'exécute pas ?
- Le calcul est incorrect ?
- Le cache n'est pas invalidé ?

**Vérification DB** :
```sql
-- Vérifier trigger
SELECT * FROM pg_trigger WHERE tgname LIKE '%ligne_budgetaire%';

-- Tester calcul manuel
SELECT
  montant_initial,
  montant_modifie,
  montant_reserve,
  montant_engage,
  disponible,
  (montant_initial + montant_modifie - montant_reserve - montant_engage) AS disponible_calcule
FROM lignes_budgetaires
WHERE id = 'xxx';
```

---

### Étape 3 : Corriger

**Cas 1 : Trigger manquant/cassé**

```sql
-- Recréer trigger
CREATE OR REPLACE FUNCTION update_ligne_budgetaire_montants()
RETURNS TRIGGER AS $$
BEGIN
  NEW.disponible := NEW.montant_initial + NEW.montant_modifie 
                    - NEW.montant_reserve - NEW.montant_engage;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_lignes_budgetaires_montants ON lignes_budgetaires;

CREATE TRIGGER update_lignes_budgetaires_montants
BEFORE INSERT OR UPDATE ON lignes_budgetaires
FOR EACH ROW
EXECUTE FUNCTION update_ligne_budgetaire_montants();
```

**Cas 2 : Cache non invalidé**

```typescript
// Dans hook useEngagements
const createMutation = useMutation({
  mutationFn: (input: CreateEngagementInput) => engagementsService.create(input),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['engagements'] });
    queryClient.invalidateQueries({ queryKey: ['lignes-budgetaires'] }); // ✅ Ajouter
    toast.success('Engagement créé');
  },
});
```

---

### Étape 4 : Tester la Correction

1. Réexécuter les étapes du bug
2. Vérifier que le problème est résolu
3. Tester les cas limites

---

### ✅ Checklist

- [ ] Bug reproduit et documenté
- [ ] Cause identifiée
- [ ] Correction appliquée
- [ ] Tests manuels OK
- [ ] Cas limites vérifiés
- [ ] Pas de régression

---

## 🔗 Voir Aussi

- **[AGENTS.md](../AGENTS.md)** - Vue d'ensemble du projet
- **[AGENTS-PATTERNS.md](./AGENTS-PATTERNS.md)** - Patterns de code
- **[AGENTS-BUSINESS.md](./AGENTS-BUSINESS.md)** - Règles métier
- **[AGENTS-GOTCHAS.md](./AGENTS-GOTCHAS.md)** - Pièges à éviter

---

**✨ Ces workflows couvrent 90% des modifications courantes dans AGILYS.**
