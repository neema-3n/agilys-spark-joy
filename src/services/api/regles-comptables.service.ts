import { supabase } from '@/integrations/supabase/client';
import type { RegleComptable, CreateRegleComptableInput, UpdateRegleComptableInput, TypeOperation } from '@/types/regle-comptable.types';

const mapDbToRegle = (data: any): RegleComptable => ({
  id: data.id,
  clientId: data.client_id,
  code: data.code,
  nom: data.nom,
  description: data.description,
  dateDebut: data.date_debut,
  dateFin: data.date_fin,
  permanente: data.permanente,
  typeOperation: data.type_operation,
  pointComptable: data.point_comptable,
  roleLigne: data.role_ligne,
  sourceMontant: data.source_montant,
  debitSource: data.debit_source,
  creditSource: data.credit_source,
  sensVentilation: data.sens_ventilation || undefined,
  natureVentilation: data.nature_ventilation || undefined,
  conditions: data.conditions || [],
  compteDebitId: data.compte_debit_id,
  compteCreditId: data.compte_credit_id,
  actif: data.actif,
  ordre: data.ordre,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
  createdBy: data.created_by,
  compteDebit: data.compte_debit ? {
    numero: data.compte_debit.numero,
    libelle: data.compte_debit.libelle
  } : undefined,
  compteCredit: data.compte_credit ? {
    numero: data.compte_credit.numero,
    libelle: data.compte_credit.libelle
  } : undefined
});

export const reglesComptablesService = {
  async getAll(clientId: string, typeOperation?: TypeOperation): Promise<RegleComptable[]> {
    let query = supabase
      .from('regles_comptables')
      .select(`
        *,
        compte_debit:comptes!compte_debit_id(numero, libelle),
        compte_credit:comptes!compte_credit_id(numero, libelle)
      `)
      .eq('client_id', clientId)
      .order('ordre', { ascending: true });

    if (typeOperation) {
      query = query.eq('type_operation', typeOperation);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map(mapDbToRegle);
  },

  async getById(id: string): Promise<RegleComptable> {
    const { data, error } = await supabase
      .from('regles_comptables')
      .select(`
        *,
        compte_debit:comptes!compte_debit_id(numero, libelle),
        compte_credit:comptes!compte_credit_id(numero, libelle)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return mapDbToRegle(data);
  },

  async create(input: CreateRegleComptableInput): Promise<RegleComptable> {
    const { data: userData } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('regles_comptables')
      .insert({
        client_id: input.clientId,
        code: input.code,
        nom: input.nom,
        description: input.description,
        date_debut: input.dateDebut,
        date_fin: input.dateFin,
        permanente: input.permanente,
        type_operation: input.typeOperation,
        point_comptable: input.pointComptable,
        role_ligne: input.roleLigne,
        source_montant: input.sourceMontant,
        debit_source: input.debitSource,
        credit_source: input.creditSource,
        sens_ventilation: input.sensVentilation,
        nature_ventilation: input.natureVentilation,
        conditions: input.conditions as any,
        compte_debit_id: input.compteDebitId ?? null,
        compte_credit_id: input.compteCreditId ?? null,
        actif: input.actif ?? true,
        ordre: input.ordre ?? 0,
        created_by: userData.user?.id
      } as any)
      .select(`
        *,
        compte_debit:comptes!compte_debit_id(numero, libelle),
        compte_credit:comptes!compte_credit_id(numero, libelle)
      `)
      .single();

    if (error) throw error;
    return mapDbToRegle(data);
  },

  async update(id: string, input: UpdateRegleComptableInput): Promise<RegleComptable> {
    const updateData: any = {};
    
    if (input.nom !== undefined) updateData.nom = input.nom;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.dateDebut !== undefined) updateData.date_debut = input.dateDebut;
    if (input.dateFin !== undefined) updateData.date_fin = input.dateFin;
    if (input.permanente !== undefined) updateData.permanente = input.permanente;
    if (input.pointComptable !== undefined) updateData.point_comptable = input.pointComptable;
    if (input.roleLigne !== undefined) updateData.role_ligne = input.roleLigne;
    if (input.sourceMontant !== undefined) updateData.source_montant = input.sourceMontant;
    if (input.debitSource !== undefined) updateData.debit_source = input.debitSource;
    if (input.creditSource !== undefined) updateData.credit_source = input.creditSource;
    if (input.sensVentilation !== undefined) updateData.sens_ventilation = input.sensVentilation;
    if (input.natureVentilation !== undefined) updateData.nature_ventilation = input.natureVentilation;
    if (input.conditions !== undefined) updateData.conditions = input.conditions;
    if (input.compteDebitId !== undefined) updateData.compte_debit_id = input.compteDebitId || null;
    if (input.compteCreditId !== undefined) updateData.compte_credit_id = input.compteCreditId || null;
    if (input.actif !== undefined) updateData.actif = input.actif;
    if (input.ordre !== undefined) updateData.ordre = input.ordre;

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('regles_comptables')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        compte_debit:comptes!compte_debit_id(numero, libelle),
        compte_credit:comptes!compte_credit_id(numero, libelle)
      `)
      .single();

    if (error) throw error;
    return mapDbToRegle(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('regles_comptables')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async reorder(clientId: string, typeOperation: TypeOperation, orderedIds: string[]): Promise<void> {
    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await supabase
        .from('regles_comptables')
        .update({ ordre: i, updated_at: new Date().toISOString() })
        .eq('id', orderedIds[i])
        .eq('client_id', clientId)
        .eq('type_operation', typeOperation);

      if (error) throw error;
    }
  }
};
