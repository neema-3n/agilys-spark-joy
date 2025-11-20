# Tests de Charge - Génération Concurrente de Numéros

## Description

Ce test vérifie que la génération de numéros séquentiels pour les factures et bons de commande est **thread-safe** et ne produit pas de doublons lors d'accès concurrents.

## Prérequis

```bash
npm install @supabase/supabase-js
npm install -D tsx
```

## Configuration

Avant de lancer le test, vérifiez/adaptez les paramètres dans `concurrent-numero-generation.test.ts`:

- `TEST_CLIENT_ID`: ID du client de test
- `TEST_EXERCICE_ID`: ID de l'exercice de test
- `email` et `password`: Credentials d'un utilisateur de test
- `fournisseurId`: UUID d'un fournisseur existant dans votre base

## Exécution

```bash
# Avec tsx (recommandé)
npx tsx tests/concurrent-numero-generation.test.ts

# Ou avec ts-node
npx ts-node tests/concurrent-numero-generation.test.ts
```

## Résultats Attendus

✅ **Test réussi:**
- Tous les appels sont en succès
- Aucun doublon de numéro détecté
- Les numéros sont séquentiels et consécutifs

❌ **Test échoué:**
- Présence de doublons dans les numéros générés
- Erreurs lors de la création

## Nettoyage

Après le test, pensez à supprimer les données de test créées:

```sql
-- Supprimer les factures de test
DELETE FROM factures 
WHERE objet LIKE 'Test concurrent facture%';

-- Supprimer les bons de commande de test
DELETE FROM bons_commande 
WHERE objet LIKE 'Test concurrent BC%';
```

## Architecture Technique

Le test vérifie que les edge functions utilisent correctement:
- Les fonctions PostgreSQL avec `FOR UPDATE` pour le lock
- La génération atomique des numéros
- La gestion des transactions
