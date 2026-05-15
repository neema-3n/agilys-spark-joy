import { supabase } from '@/integrations/supabase/client';
import type {
  CreateTaxeFiscaleInput,
  TaxeFiscale,
  UpdateTaxeFiscaleInput,
} from '@/types/fiscalite.types';

const mapTaxeFiscale = (row: any): TaxeFiscale => ({
  id: row.id,
  clientId: row.client_id,
  code: row.code,
  libelle: row.libelle,
  description: row.description || undefined,
  nature: row.nature,
  sensDefaut: row.sens_defaut,
  tauxDefaut: row.taux_defaut ?? undefined,
  montantFixeDefaut: row.montant_fixe_defaut ?? undefined,
  compteComptableId: row.compte_comptable_id || undefined,
  ordre: row.ordre ?? 0,
  actif: row.actif ?? true,
  dateDebutValidite: row.date_debut_validite || undefined,
  dateFinValidite: row.date_fin_validite || undefined,
  compteComptable: row.compte_comptable
    ? {
        id: row.compte_comptable.id,
        numero: row.compte_comptable.numero,
        libelle: row.compte_comptable.libelle,
        type: row.compte_comptable.type,
        categorie: row.compte_comptable.categorie,
      }
    : undefined,
});

export const taxesFiscalesService = {
  async getAll(clientId: string, actifOnly = true): Promise<TaxeFiscale[]> {
    let query = supabase
      .from('taxes_fiscales')
      .select(`
        *,
        compte_comptable:comptes!compte_comptable_id(id, numero, libelle, type, categorie)
      `)
      .eq('client_id', clientId)
      .order('ordre', { ascending: true })
      .order('libelle', { ascending: true });

    if (actifOnly) {
      query = query.eq('actif', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapTaxeFiscale);
  },

  async create(input: CreateTaxeFiscaleInput): Promise<TaxeFiscale> {
    const { data, error } = await supabase
      .from('taxes_fiscales')
      .insert({
        client_id: input.clientId,
        code: input.code,
        libelle: input.libelle,
        description: input.description ?? null,
        nature: input.nature,
        sens_defaut: input.sensDefaut,
        taux_defaut: input.tauxDefaut ?? null,
        montant_fixe_defaut: input.montantFixeDefaut ?? null,
        compte_comptable_id: input.compteComptableId ?? null,
        ordre: input.ordre,
        actif: input.actif,
        date_debut_validite: input.dateDebutValidite ?? null,
        date_fin_validite: input.dateFinValidite ?? null,
      })
      .select(`
        *,
        compte_comptable:comptes!compte_comptable_id(id, numero, libelle, type, categorie)
      `)
      .single();

    if (error) throw error;
    return mapTaxeFiscale(data);
  },

  async update(id: string, input: UpdateTaxeFiscaleInput): Promise<TaxeFiscale> {
    const payload = {
      ...(input.code !== undefined ? { code: input.code } : {}),
      ...(input.libelle !== undefined ? { libelle: input.libelle } : {}),
      ...(input.description !== undefined ? { description: input.description || null } : {}),
      ...(input.nature !== undefined ? { nature: input.nature } : {}),
      ...(input.sensDefaut !== undefined ? { sens_defaut: input.sensDefaut } : {}),
      ...(input.tauxDefaut !== undefined ? { taux_defaut: input.tauxDefaut ?? null } : {}),
      ...(input.montantFixeDefaut !== undefined ? { montant_fixe_defaut: input.montantFixeDefaut ?? null } : {}),
      ...(input.compteComptableId !== undefined ? { compte_comptable_id: input.compteComptableId || null } : {}),
      ...(input.ordre !== undefined ? { ordre: input.ordre } : {}),
      ...(input.actif !== undefined ? { actif: input.actif } : {}),
      ...(input.dateDebutValidite !== undefined ? { date_debut_validite: input.dateDebutValidite || null } : {}),
      ...(input.dateFinValidite !== undefined ? { date_fin_validite: input.dateFinValidite || null } : {}),
    };

    const { data, error } = await supabase
      .from('taxes_fiscales')
      .update(payload)
      .eq('id', id)
      .select(`
        *,
        compte_comptable:comptes!compte_comptable_id(id, numero, libelle, type, categorie)
      `)
      .single();

    if (error) throw error;
    return mapTaxeFiscale(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('taxes_fiscales').delete().eq('id', id);
    if (error) throw error;
  },
};
