import { supabase } from '@/integrations/supabase/client';
import type {
  CreateModeleFiscalInput,
  ModeleFiscal,
  ModeleFiscalLigne,
  UpdateModeleFiscalInput,
} from '@/types/fiscalite.types';

const mapModeleFiscalLigne = (row: any): ModeleFiscalLigne => ({
  id: row.id,
  taxeFiscaleId: row.taxe_fiscale_id,
  ordre: row.ordre ?? 0,
  tauxDefautOverride: row.taux_defaut_override ?? undefined,
  montantDefautOverride: row.montant_defaut_override ?? undefined,
  taxeFiscale: row.taxe_fiscale
    ? {
        id: row.taxe_fiscale.id,
        clientId: row.taxe_fiscale.client_id,
        code: row.taxe_fiscale.code,
        libelle: row.taxe_fiscale.libelle,
        description: row.taxe_fiscale.description || undefined,
        nature: row.taxe_fiscale.nature,
        sensDefaut: row.taxe_fiscale.sens_defaut,
        tauxDefaut: row.taxe_fiscale.taux_defaut ?? undefined,
        montantFixeDefaut: row.taxe_fiscale.montant_fixe_defaut ?? undefined,
        compteComptableId: row.taxe_fiscale.compte_comptable_id || undefined,
        ordre: row.taxe_fiscale.ordre ?? 0,
        actif: row.taxe_fiscale.actif ?? true,
        dateDebutValidite: row.taxe_fiscale.date_debut_validite || undefined,
        dateFinValidite: row.taxe_fiscale.date_fin_validite || undefined,
      }
    : undefined,
});

const mapModeleFiscal = (row: any): ModeleFiscal => ({
  id: row.id,
  clientId: row.client_id,
  code: row.code,
  libelle: row.libelle,
  description: row.description || undefined,
  actif: row.actif ?? true,
  ordre: row.ordre ?? 0,
  lignes: Array.isArray(row.lignes)
    ? row.lignes
        .map(mapModeleFiscalLigne)
        .sort((a, b) => a.ordre - b.ordre)
    : [],
});

export const modelesFiscauxService = {
  async getAll(clientId: string, actifOnly = true): Promise<ModeleFiscal[]> {
    let query = supabase
      .from('modeles_fiscaux')
      .select(`
        *,
        lignes:modele_fiscal_lignes(
          *,
          taxe_fiscale:taxes_fiscales(*)
        )
      `)
      .eq('client_id', clientId)
      .order('ordre', { ascending: true })
      .order('libelle', { ascending: true });

    if (actifOnly) {
      query = query.eq('actif', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapModeleFiscal);
  },

  async create(input: CreateModeleFiscalInput): Promise<ModeleFiscal> {
    const { data: modele, error: modeleError } = await supabase
      .from('modeles_fiscaux')
      .insert({
        client_id: input.clientId,
        code: input.code,
        libelle: input.libelle,
        description: input.description ?? null,
        actif: input.actif,
        ordre: input.ordre,
      })
      .select()
      .single();

    if (modeleError) throw modeleError;

    if (input.lignes.length > 0) {
      const { error: lignesError } = await supabase.from('modele_fiscal_lignes').insert(
        input.lignes.map((ligne, index) => ({
          modele_fiscal_id: modele.id,
          taxe_fiscale_id: ligne.taxeFiscaleId,
          ordre: ligne.ordre ?? index,
          taux_defaut_override: ligne.tauxDefautOverride ?? null,
          montant_defaut_override: ligne.montantDefautOverride ?? null,
        }))
      );

      if (lignesError) throw lignesError;
    }

    const [created] = await this.getAll(input.clientId, false).then((rows) => rows.filter((row) => row.id === modele.id));
    if (!created) {
      throw new Error('Modele fiscal introuvable apres creation');
    }
    return created;
  },

  async update(id: string, input: UpdateModeleFiscalInput): Promise<ModeleFiscal> {
    const payload = {
      ...(input.code !== undefined ? { code: input.code } : {}),
      ...(input.libelle !== undefined ? { libelle: input.libelle } : {}),
      ...(input.description !== undefined ? { description: input.description || null } : {}),
      ...(input.actif !== undefined ? { actif: input.actif } : {}),
      ...(input.ordre !== undefined ? { ordre: input.ordre } : {}),
    };

    const { data: modele, error } = await supabase
      .from('modeles_fiscaux')
      .update(payload)
      .eq('id', id)
      .select('id, client_id')
      .single();

    if (error) throw error;

    if (input.lignes !== undefined) {
      const { error: deleteError } = await supabase.from('modele_fiscal_lignes').delete().eq('modele_fiscal_id', id);
      if (deleteError) throw deleteError;

      if (input.lignes.length > 0) {
        const { error: insertError } = await supabase.from('modele_fiscal_lignes').insert(
          input.lignes.map((ligne, index) => ({
            modele_fiscal_id: id,
            taxe_fiscale_id: ligne.taxeFiscaleId,
            ordre: ligne.ordre ?? index,
            taux_defaut_override: ligne.tauxDefautOverride ?? null,
            montant_defaut_override: ligne.montantDefautOverride ?? null,
          }))
        );
        if (insertError) throw insertError;
      }
    }

    const [updated] = await this.getAll(modele.client_id, false).then((rows) => rows.filter((row) => row.id === id));
    if (!updated) {
      throw new Error('Modele fiscal introuvable apres mise a jour');
    }
    return updated;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('modeles_fiscaux').delete().eq('id', id);
    if (error) throw error;
  },
};
