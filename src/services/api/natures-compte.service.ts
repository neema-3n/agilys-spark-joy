import { supabase } from '@/integrations/supabase/client';
import type { NatureCompte } from '@/types/nature-compte.types';
import type { Compte } from '@/types/compte.types';

const mapNatureCompte = (row: any): NatureCompte => ({
  id: row.id,
  clientId: row.client_id,
  code: row.code,
  libelle: row.libelle,
  description: row.description || undefined,
  compteDefautId: row.compte_defaut_id || undefined,
  ordre: row.ordre ?? 0,
  actif: row.actif ?? true,
  compteDefaut: row.compte_defaut
    ? {
        id: row.compte_defaut_id,
        numero: row.compte_defaut.numero,
        libelle: row.compte_defaut.libelle,
        type: row.compte_defaut.type,
        categorie: row.compte_defaut.categorie,
      }
    : undefined,
});

const mapFallbackNature = (compte: Compte): NatureCompte => ({
  id: `fallback-${compte.id}`,
  clientId: compte.clientId,
  code: compte.numero,
  libelle: compte.libelle,
  compteDefautId: compte.id,
  ordre: 9999,
  actif: compte.statut === 'actif',
  compteDefaut: {
    id: compte.id,
    numero: compte.numero,
    libelle: compte.libelle,
    type: compte.type,
    categorie: compte.categorie,
  },
  isFallback: true,
});

export const naturesCompteService = {
  async getAll(clientId: string): Promise<NatureCompte[]> {
    const { data, error } = await supabase
      .from('natures_compte')
      .select(`
        *,
        compte_defaut:comptes!compte_defaut_id(id, numero, libelle, type, categorie)
      `)
      .eq('client_id', clientId)
      .eq('actif', true)
      .order('ordre', { ascending: true })
      .order('libelle', { ascending: true });

    if (error) {
      throw error;
    }

    const natures = (data || []).map(mapNatureCompte);
    if (natures.length > 0) {
      return natures;
    }

    const { data: comptesData, error: comptesError } = await supabase
      .from('comptes')
      .select('*')
      .eq('client_id', clientId)
      .eq('statut', 'actif')
      .eq('type', 'charge')
      .order('numero', { ascending: true });

    if (comptesError) {
      throw comptesError;
    }

    return (comptesData || []).map((compte) =>
      mapFallbackNature({
        id: compte.id,
        clientId: compte.client_id,
        numero: compte.numero,
        libelle: compte.libelle,
        type: compte.type,
        categorie: compte.categorie,
        parentId: compte.parent_id || undefined,
        niveau: compte.niveau,
        statut: compte.statut,
        createdAt: compte.created_at,
        updatedAt: compte.updated_at,
      })
    );
  },
};
