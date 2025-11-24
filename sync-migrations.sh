#!/bin/bash

# Script d'automatisation de synchronisation des migrations Supabase
# Ce script répare l'historique des migrations et synchronise avec la base distante

set -e  # Arrête le script en cas d'erreur

echo "🔧 Début de la réparation des migrations..."
echo ""

# Marquer les migrations comme "reverted" (locales à ignorer)
echo "📝 Marquage des migrations locales comme 'reverted'..."
supabase migration repair --status reverted 20251122202256
supabase migration repair --status reverted 20251122214021
supabase migration repair --status reverted 20251122220352
supabase migration repair --status reverted 20251123020035
supabase migration repair --status reverted 20251123151032
supabase migration repair --status reverted 20251123160439
supabase migration repair --status reverted 20251123163341

echo ""

# Marquer les migrations comme "applied" (distantes à reconnaître)
echo "✅ Marquage des migrations distantes comme 'applied'..."
supabase migration repair --status applied 20251122202258
supabase migration repair --status applied 20251122214023
supabase migration repair --status applied 20251122220354
supabase migration repair --status applied 20251123020036
supabase migration repair --status applied 20251123151034
supabase migration repair --status applied 20251123160440
supabase migration repair --status applied 20251123163342

echo ""

# Synchroniser avec la base distante
echo "🔄 Synchronisation avec la base distante..."
supabase db pull

echo ""
echo "✨ Synchronisation terminée avec succès!"
echo ""
echo "💡 Vous pouvez maintenant travailler en local avec 'supabase start'"
