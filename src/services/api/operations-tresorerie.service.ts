import { supabase } from '@/integrations/supabase/client';
import type { OperationTresorerie, OperationTresorerieFormData, OperationsTresorerieStats } from '@/types/operation-tresorerie.types';

const mapDbToOperation = (data: any): OperationTresorerie => ({
  id: data.id,
  clientId: data.client_id,
  exerciceId: data.exercice_id,
  numero: data.numero,
  dateOperation: data.date_operation,
  typeOperation: data.type_operation,
  compteId: data.compte_id,
  compteContrepartieId: data.compte_contrepartie_id,
  montant: data.montant,
  modePaiement: data.mode_paiement,
  referenceBancaire: data.reference_bancaire,
  libelle: data.libelle,
  categorie: data.categorie,
  pieceJustificative: data.piece_justificative,
  paiementId: data.paiement_id,
  recetteId: data.recette_id,
  depenseId: data.depense_id,
  statut: data.statut,
  rapproche: data.rapproche,
  dateRapprochement: data.date_rapprochement,
  observations: data.observations,
  createdBy: data.created_by,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
  compte: data.compte ? {
    code: data.compte.code,
    libelle: data.compte.libelle,
    type: data.compte.type,
  } : undefined,
  compteContrepartie: data.compte_contrepartie ? {
    code: data.compte_contrepartie.code,
    libelle: data.compte_contrepartie.libelle,
    type: data.compte_contrepartie.type,
  } : undefined,
  paiement: data.paiement ? {
    id: data.paiement.id,
    numero: data.paiement.numero,
    depense: data.paiement.depense ? {
      id: data.paiement.depense.id,
      numero: data.paiement.depense.numero,
      objet: data.paiement.depense.objet,
      ligneBudgetaire: data.paiement.depense.ligne_budgetaire ? {
        id: data.paiement.depense.ligne_budgetaire.id,
        libelle: data.paiement.depense.ligne_budgetaire.libelle,
        action: data.paiement.depense.ligne_budgetaire.action,
      } : undefined,
    } : undefined,
  } : undefined,
});

export const operationsTresorerieService = {
  async getAll(clientId: string, exerciceId: string): Promise<OperationTresorerie[]> {
    const { data, error } = await supabase
      .from('operations_tresorerie')
      .select(`
        *,
        compte:comptes_tresorerie!compte_id(code, libelle, type),
        compte_contrepartie:comptes_tresorerie!compte_contrepartie_id(code, libelle, type),
        paiement:paiements(
          id,
          numero,
          depense:depenses(
            id,
            numero,
            objet,
            ligne_budgetaire:lignes_budgetaires(
              id,
              libelle,
              action:actions(code, libelle)
            )
          )
        )
      `)
      .eq('client_id', clientId)
      .eq('exercice_id', exerciceId)
      .order('date_operation', { ascending: false })
      .order('numero', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapDbToOperation);
  },

  async getByCompte(compteId: string): Promise<OperationTresorerie[]> {
    const { data, error } = await supabase
      .from('operations_tresorerie')
      .select(`
        *,
        compte:comptes_tresorerie!compte_id(code, libelle, type),
        compte_contrepartie:comptes_tresorerie!compte_contrepartie_id(code, libelle, type)
      `)
      .eq('compte_id', compteId)
      .order('date_operation', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapDbToOperation);
  },

  async create(
    clientId: string,
    exerciceId: string,
    operation: OperationTresorerieFormData
  ): Promise<OperationTresorerie> {
    const { data, error } = await supabase.functions.invoke('create-operation-tresorerie', {
      body: {
        clientId,
        exerciceId,
        ...operation,
      },
    });

    if (error) throw error;
    return data;
  },

  async rapprocher(operationIds: string[]): Promise<void> {
    const { error } = await supabase
      .from('operations_tresorerie')
      .update({
        rapproche: true,
        statut: 'rapprochee',
        date_rapprochement: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      })
      .in('id', operationIds);

    if (error) throw error;
  },

  async getStats(clientId: string, exerciceId: string): Promise<OperationsTresorerieStats> {
    const { data, error } = await supabase
      .from('operations_tresorerie')
      .select('type_operation, montant, statut, rapproche')
      .eq('client_id', clientId)
      .eq('exercice_id', exerciceId)
      .neq('statut', 'annulee');

    if (error) throw error;

    const stats: OperationsTresorerieStats = {
      nombreTotal: data?.length || 0,
      nombreEncaissements: 0,
      nombreDecaissements: 0,
      nombreTransferts: 0,
      montantEncaissements: 0,
      montantDecaissements: 0,
      montantTransferts: 0,
      soldeNet: 0,
      operationsNonRapprochees: 0,
    };

    data?.forEach((op) => {
      if (op.type_operation === 'encaissement') {
        stats.nombreEncaissements++;
        stats.montantEncaissements += op.montant;
        stats.soldeNet += op.montant;
      } else if (op.type_operation === 'decaissement') {
        stats.nombreDecaissements++;
        stats.montantDecaissements += op.montant;
        stats.soldeNet -= op.montant;
      } else if (op.type_operation === 'transfert') {
        stats.nombreTransferts++;
        stats.montantTransferts += op.montant;
      }

      if (!op.rapproche) {
        stats.operationsNonRapprochees++;
      }
    });

    return stats;
  },
};
