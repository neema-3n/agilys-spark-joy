import { supabase } from '@/integrations/supabase/client';
import type { EcritureComptable, EcrituresStats, EcrituresFilters } from '@/types/ecriture-comptable.types';
import type { TypeOperation } from '@/types/regle-comptable.types';

const mapDbToEcriture = (data: any): EcritureComptable => ({
  id: data.id,
  clientId: data.client_id,
  exerciceId: data.exercice_id,
  numeroPiece: data.numero_piece,
  numeroLigne: data.numero_ligne,
  dateEcriture: data.date_ecriture,
  compteDebitId: data.compte_debit_id,
  compteCreditId: data.compte_credit_id,
  montant: data.montant,
  libelle: data.libelle,
  typeOperation: data.type_operation,
  sourceId: data.source_id,
  regleComptableId: data.regle_comptable_id,
  createdAt: data.created_at,
  createdBy: data.created_by,
  updatedAt: data.updated_at,
  compteDebit: data.compte_debit ? {
    numero: data.compte_debit.numero,
    libelle: data.compte_debit.libelle
  } : undefined,
  compteCredit: data.compte_credit ? {
    numero: data.compte_credit.numero,
    libelle: data.compte_credit.libelle
  } : undefined,
  regleComptable: data.regle_comptable ? {
    code: data.regle_comptable.code,
    nom: data.regle_comptable.nom
  } : undefined
});

export const ecrituresComptablesService = {
  async getAll(clientId: string, exerciceId?: string, filters?: EcrituresFilters): Promise<EcritureComptable[]> {
    let query = supabase
      .from('ecritures_comptables')
      .select(`
        *,
        compte_debit:comptes!compte_debit_id(numero, libelle),
        compte_credit:comptes!compte_credit_id(numero, libelle),
        regle_comptable:regles_comptables(code, nom)
      `)
      .eq('client_id', clientId)
      .order('date_ecriture', { ascending: false })
      .order('numero_piece', { ascending: false })
      .order('numero_ligne', { ascending: true });

    if (exerciceId) {
      query = query.eq('exercice_id', exerciceId);
    }

    if (filters?.dateDebut) {
      query = query.gte('date_ecriture', filters.dateDebut);
    }

    if (filters?.dateFin) {
      query = query.lte('date_ecriture', filters.dateFin);
    }

    if (filters?.typeOperation) {
      query = query.eq('type_operation', filters.typeOperation);
    }

    if (filters?.numeroPiece) {
      query = query.ilike('numero_piece', `%${filters.numeroPiece}%`);
    }

    if (filters?.compteId) {
      query = query.or(`compte_debit_id.eq.${filters.compteId},compte_credit_id.eq.${filters.compteId}`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map(mapDbToEcriture);
  },

  async getBySource(typeOperation: TypeOperation, sourceId: string): Promise<EcritureComptable[]> {
    const { data, error } = await supabase
      .from('ecritures_comptables')
      .select(`
        *,
        compte_debit:comptes!compte_debit_id(numero, libelle),
        compte_credit:comptes!compte_credit_id(numero, libelle),
        regle_comptable:regles_comptables(code, nom)
      `)
      .eq('type_operation', typeOperation)
      .eq('source_id', sourceId)
      .order('numero_ligne', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapDbToEcriture);
  },

  async getStats(clientId: string, exerciceId?: string): Promise<EcrituresStats> {
    let query = supabase
      .from('ecritures_comptables')
      .select('montant, type_operation')
      .eq('client_id', clientId);

    if (exerciceId) {
      query = query.eq('exercice_id', exerciceId);
    }

    const { data, error } = await query;

    if (error) throw error;

    const stats: EcrituresStats = {
      nombreTotal: data?.length || 0,
      montantTotalDebit: 0,
      montantTotalCredit: 0,
      parTypeOperation: {
        reservation: { nombre: 0, montant: 0 },
        engagement: { nombre: 0, montant: 0 },
        bon_commande: { nombre: 0, montant: 0 },
        facture: { nombre: 0, montant: 0 },
        depense: { nombre: 0, montant: 0 },
        paiement: { nombre: 0, montant: 0 }
      }
    };

    data?.forEach(item => {
      stats.montantTotalDebit += item.montant;
      stats.montantTotalCredit += item.montant;
      
      if (item.type_operation) {
        stats.parTypeOperation[item.type_operation].nombre++;
        stats.parTypeOperation[item.type_operation].montant += item.montant;
      }
    });

    return stats;
  },

  async generateForOperation(
    typeOperation: TypeOperation,
    sourceId: string,
    clientId: string,
    exerciceId: string
  ): Promise<any> {
    const { data, error } = await supabase.functions.invoke('generate-ecritures-comptables', {
      body: {
        typeOperation,
        sourceId,
        clientId,
        exerciceId
      }
    });

    if (error) throw error;
    return data;
  }
};
