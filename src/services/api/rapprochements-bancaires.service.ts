import { supabase } from '@/integrations/supabase/client';
import type { RapprochementBancaire, RapprochementBancaireFormData } from '@/types/rapprochement-bancaire.types';

const mapDbToRapprochement = (data: any): RapprochementBancaire => ({
  id: data.id,
  clientId: data.client_id,
  exerciceId: data.exercice_id,
  numero: data.numero,
  compteId: data.compte_id,
  dateDebut: data.date_debut,
  dateFin: data.date_fin,
  soldeReleve: data.solde_releve,
  soldeComptable: data.solde_comptable,
  ecart: data.ecart,
  statut: data.statut,
  dateValidation: data.date_validation,
  validePar: data.valide_par,
  observations: data.observations,
  createdBy: data.created_by,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
  compte: data.compte ? {
    code: data.compte.code,
    libelle: data.compte.libelle,
    type: data.compte.type,
  } : undefined,
});

export const rapprochementsBancairesService = {
  async getAll(clientId: string, exerciceId: string): Promise<RapprochementBancaire[]> {
    const { data, error } = await supabase
      .from('rapprochements_bancaires')
      .select(`
        *,
        compte:comptes_tresorerie!compte_id(code, libelle, type)
      `)
      .eq('client_id', clientId)
      .eq('exercice_id', exerciceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapDbToRapprochement);
  },

  async getById(id: string): Promise<RapprochementBancaire> {
    const { data, error } = await supabase
      .from('rapprochements_bancaires')
      .select(`
        *,
        compte:comptes_tresorerie!compte_id(code, libelle, type)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return mapDbToRapprochement(data);
  },

  async create(
    clientId: string,
    exerciceId: string,
    rapprochement: RapprochementBancaireFormData
  ): Promise<RapprochementBancaire> {
    // Calculer le solde comptable
    const { data: operations } = await supabase
      .from('operations_tresorerie')
      .select('type_operation, montant')
      .eq('compte_id', rapprochement.compteId)
      .gte('date_operation', rapprochement.dateDebut)
      .lte('date_operation', rapprochement.dateFin)
      .neq('statut', 'annulee');

    let soldeComptable = 0;
    operations?.forEach((op) => {
      if (op.type_operation === 'encaissement') {
        soldeComptable += op.montant;
      } else if (op.type_operation === 'decaissement') {
        soldeComptable -= op.montant;
      }
    });

    const ecart = rapprochement.soldeReleve - soldeComptable;

    // Générer le numéro
    const { data: lastRapprochement } = await supabase
      .from('rapprochements_bancaires')
      .select('numero')
      .eq('client_id', clientId)
      .order('numero', { ascending: false })
      .limit(1)
      .single();

    let nextNumber = 1;
    if (lastRapprochement?.numero) {
      const match = lastRapprochement.numero.match(/RAP(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    const numero = `RAP${String(nextNumber).padStart(5, '0')}`;

    const { data, error } = await supabase
      .from('rapprochements_bancaires')
      .insert({
        client_id: clientId,
        exercice_id: exerciceId,
        numero,
        compte_id: rapprochement.compteId,
        date_debut: rapprochement.dateDebut,
        date_fin: rapprochement.dateFin,
        solde_releve: rapprochement.soldeReleve,
        solde_comptable: soldeComptable,
        ecart,
        observations: rapprochement.observations,
      })
      .select(`
        *,
        compte:comptes_tresorerie!compte_id(code, libelle, type)
      `)
      .single();

    if (error) throw error;
    return mapDbToRapprochement(data);
  },

  async valider(id: string): Promise<void> {
    const { error } = await supabase
      .from('rapprochements_bancaires')
      .update({
        statut: 'valide',
        date_validation: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
  },
};
