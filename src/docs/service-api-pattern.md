# Pattern Service API

## Règle d'or

**Tous les services API doivent avoir des méthodes `fromDB` / `toDB` pour transformer les données, et implémenter les 5 opérations CRUD standard.**

## Pourquoi ce pattern ?

1. **Séparation des préoccupations** : Le format DB (snake_case, UUID) != format frontend (camelCase, types métier)
2. **Type safety** : Les transformations garantissent que les types sont corrects
3. **Réutilisabilité** : Tous les services ont la même structure, facile à comprendre
4. **Filtrage cohérent** : Toujours filtrer par `client_id` et `exercice_id` pour le multi-tenant
5. **Gestion d'erreurs** : Pattern uniforme pour capter et logger les erreurs

## Structure de base

### 1. Imports et types

```typescript
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { Facture } from '@/types/facture.types';

type FactureDB = Database['public']['Tables']['factures']['Row'];
type FactureInsert = Database['public']['Tables']['factures']['Insert'];
type FactureUpdate = Database['public']['Tables']['factures']['Update'];
```

### 2. Méthodes de transformation

```typescript
/**
 * Transforme une facture DB en facture frontend
 */
const fromDB = (dbFacture: FactureDB): Facture => {
  return {
    id: dbFacture.id,
    numero: dbFacture.numero,
    objet: dbFacture.objet,
    montantHT: dbFacture.montant_ht,
    montantTVA: dbFacture.montant_tva,
    montantTTC: dbFacture.montant_ttc,
    dateFacture: dbFacture.date_facture,
    dateEcheance: dbFacture.date_echeance,
    fournisseurId: dbFacture.fournisseur_id,
    ligneBudgetaireId: dbFacture.ligne_budgetaire_id,
    projetId: dbFacture.projet_id,
    engagementId: dbFacture.engagement_id,
    statut: dbFacture.statut,
    observations: dbFacture.observations,
    clientId: dbFacture.client_id,
    exerciceId: dbFacture.exercice_id,
    createdAt: dbFacture.created_at,
    updatedAt: dbFacture.updated_at,
  };
};

/**
 * Transforme une facture frontend en format DB pour insertion/update
 */
const toDB = (facture: Partial<Facture>): Partial<FactureInsert | FactureUpdate> => {
  return {
    numero: facture.numero,
    objet: facture.objet,
    montant_ht: facture.montantHT,
    montant_tva: facture.montantTVA,
    montant_ttc: facture.montantTTC,
    date_facture: facture.dateFacture,
    date_echeance: facture.dateEcheance,
    fournisseur_id: facture.fournisseurId,
    ligne_budgetaire_id: facture.ligneBudgetaireId,
    projet_id: facture.projetId,
    engagement_id: facture.engagementId,
    statut: facture.statut,
    observations: facture.observations,
    client_id: facture.clientId,
    exercice_id: facture.exerciceId,
  };
};
```

### 3. Opérations CRUD

```typescript
export const facturesService = {
  /**
   * Récupère toutes les factures pour un client et exercice
   */
  async getAll(clientId: string, exerciceId: string): Promise<Facture[]> {
    const { data, error } = await supabase
      .from('factures')
      .select('*')
      .eq('client_id', clientId)
      .eq('exercice_id', exerciceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur lors de la récupération des factures:', error);
      throw error;
    }

    return (data || []).map(fromDB);
  },

  /**
   * Récupère une facture par son ID
   */
  async getById(id: string): Promise<Facture> {
    const { data, error } = await supabase
      .from('factures')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erreur lors de la récupération de la facture:', error);
      throw error;
    }

    return fromDB(data);
  },

  /**
   * Crée une nouvelle facture via l'edge function
   */
  async create(facture: Omit<Facture, 'id' | 'numero' | 'created_at' | 'updated_at'>): Promise<Facture> {
    const { data, error } = await supabase.functions.invoke('create-facture', {
      body: toDB(facture),
    });

    if (error) {
      console.error('Erreur lors de la création de la facture:', error);
      throw error;
    }

    return fromDB(data.facture);
  },

  /**
   * Met à jour une facture existante
   */
  async update(id: string, updates: Partial<Facture>): Promise<void> {
    const { error } = await supabase
      .from('factures')
      .update(toDB(updates))
      .eq('id', id);

    if (error) {
      console.error('Erreur lors de la mise à jour de la facture:', error);
      throw error;
    }
  },

  /**
   * Supprime une facture
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('factures')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erreur lors de la suppression de la facture:', error);
      throw error;
    }
  },
};
```

## Exemples corrects vs incorrects

### ❌ INCORRECT - Pas de transformation

```typescript
// ❌ Retourne directement les données DB avec snake_case
async getAll(clientId: string) {
  const { data } = await supabase
    .from('factures')
    .select('*')
    .eq('client_id', clientId);
  
  return data; // montant_ht, date_facture, etc.
}
```

### ✅ CORRECT - Transformation via fromDB

```typescript
// ✅ Transforme en camelCase et types métier
async getAll(clientId: string): Promise<Facture[]> {
  const { data } = await supabase
    .from('factures')
    .select('*')
    .eq('client_id', clientId);
  
  return (data || []).map(fromDB); // montantHT, dateFacture, etc.
}
```

### ❌ INCORRECT - Création directe

```typescript
// ❌ Insertion directe sans numéro auto-généré
async create(facture: Facture) {
  const { data } = await supabase
    .from('factures')
    .insert(facture)
    .select()
    .single();
  
  return data;
}
```

### ✅ CORRECT - Via edge function

```typescript
// ✅ L'edge function génère le numéro de façon sécurisée
async create(facture: Omit<Facture, 'id' | 'numero' | 'created_at' | 'updated_at'>) {
  const { data } = await supabase.functions.invoke('create-facture', {
    body: toDB(facture),
  });
  
  return fromDB(data.facture);
}
```

## Gestion des relations (foreign keys)

Quand vous devez charger des données liées :

```typescript
/**
 * Récupère une facture avec ses relations
 */
async getByIdWithRelations(id: string): Promise<FactureWithRelations> {
  const { data, error } = await supabase
    .from('factures')
    .select(`
      *,
      fournisseur:fournisseurs(*),
      ligne_budgetaire:lignes_budgetaires(*),
      engagement:engagements(*),
      projet:projets(*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;

  return {
    ...fromDB(data),
    fournisseur: data.fournisseur,
    ligneBudgetaire: data.ligne_budgetaire,
    engagement: data.engagement,
    projet: data.projet,
  };
}
```

## Filtrage avancé

Pour des filtres complexes :

```typescript
/**
 * Récupère les factures avec filtres optionnels
 */
async getFiltered(
  clientId: string,
  exerciceId: string,
  filters?: {
    statut?: string;
    fournisseurId?: string;
    dateDebut?: string;
    dateFin?: string;
  }
): Promise<Facture[]> {
  let query = supabase
    .from('factures')
    .select('*')
    .eq('client_id', clientId)
    .eq('exercice_id', exerciceId);

  // Filtres optionnels
  if (filters?.statut) {
    query = query.eq('statut', filters.statut);
  }
  if (filters?.fournisseurId) {
    query = query.eq('fournisseur_id', filters.fournisseurId);
  }
  if (filters?.dateDebut) {
    query = query.gte('date_facture', filters.dateDebut);
  }
  if (filters?.dateFin) {
    query = query.lte('date_facture', filters.dateFin);
  }

  const { data, error } = await query.order('date_facture', { ascending: false });

  if (error) throw error;

  return (data || []).map(fromDB);
}
```

## Méthodes métier spécifiques

Au-delà du CRUD, ajoutez des méthodes métier :

```typescript
export const facturesService = {
  // ... CRUD methods
  
  /**
   * Valide une facture (changement de statut)
   */
  async valider(id: string): Promise<void> {
    const { error } = await supabase
      .from('factures')
      .update({
        statut: 'validee',
        date_validation: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Récupère les statistiques des factures
   */
  async getStats(clientId: string, exerciceId: string) {
    const factures = await this.getAll(clientId, exerciceId);
    
    return {
      total: factures.length,
      totalMontant: factures.reduce((sum, f) => sum + f.montantTTC, 0),
      enAttente: factures.filter(f => f.statut === 'brouillon').length,
      validees: factures.filter(f => f.statut === 'validee').length,
    };
  },
};
```

## Points d'attention

- ⚠️ **Toujours transformer** : Utiliser `fromDB` en sortie, `toDB` en entrée
- ⚠️ **Filtrer par client** : Toujours inclure `client_id` et `exercice_id` dans les requêtes
- ⚠️ **Gestion d'erreurs** : Logger les erreurs et les rethrow
- ⚠️ **Typage strict** : Utiliser les types générés par Supabase
- ⚠️ **Edge functions** : Pour la création avec numéro auto-généré
- ⚠️ **Select optimal** : Ne sélectionner que les colonnes nécessaires (sauf cas simple)
- ⚠️ **Order by** : Toujours trier les listes (généralement par `created_at desc`)
- ⚠️ **Null safety** : Utiliser `data || []` pour éviter les erreurs sur null

## Services implémentant ce pattern

- ✅ `src/services/api/factures.service.ts`
- ✅ `src/services/api/engagements.service.ts`
- ✅ `src/services/api/depenses.service.ts`
- ✅ `src/services/api/bonsCommande.service.ts`
- ✅ `src/services/api/reservations.service.ts`
- ✅ `src/services/api/fournisseurs.service.ts`
- ✅ `src/services/api/projets.service.ts`
- ✅ `src/services/api/budget.service.ts`
- ✅ `src/services/api/programmes.service.ts`
- ✅ `src/services/api/sections.service.ts`
- ✅ `src/services/api/actions.service.ts`
- ✅ `src/services/api/enveloppes.service.ts`
- ✅ `src/services/api/comptes.service.ts`
- ✅ `src/services/api/referentiels.service.ts`

## Checklist pour nouveaux services

Lors de la création d'un nouveau service API, vérifier :

- [ ] Les types DB sont importés depuis `@/integrations/supabase/types`
- [ ] Les types métier sont importés depuis `@/types/`
- [ ] La méthode `fromDB` transforme snake_case → camelCase
- [ ] La méthode `toDB` transforme camelCase → snake_case
- [ ] `getAll` filtre par `client_id` et `exercice_id`
- [ ] `getAll` trie les résultats (`order`)
- [ ] `getById` utilise `.single()` et retourne un objet
- [ ] `create` utilise l'edge function si numéro auto-généré
- [ ] `update` n'accepte que des `Partial<Type>`
- [ ] `delete` vérifie les contraintes avant suppression (si applicable)
- [ ] Toutes les méthodes loggent les erreurs
- [ ] Toutes les méthodes ont un typage de retour explicite
- [ ] Les méthodes métier spécifiques sont documentées
