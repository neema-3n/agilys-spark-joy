import { supabase } from '@/integrations/supabase/client';
import { Facture, CreateFactureInput, UpdateFactureInput } from '@/types/facture.types';

function mapFactureFromDB(data: any): Facture {
  return {
    id: data.id,
    clientId: data.client_id,
    exerciceId: data.exercice_id,
    numero: data.numero,
    dateFacture: data.date_facture,
    dateEcheance: data.date_echeance,
    fournisseurId: data.fournisseur_id,
    bonCommandeId: data.bon_commande_id,
    engagementId: data.engagement_id,
    ligneBudgetaireId: data.ligne_budgetaire_id,
    projetId: data.projet_id,
    objet: data.objet,
    numeroFactureFournisseur: data.numero_facture_fournisseur,
    montantHT: parseFloat(data.montant_ht) || 0,
    montantTVA: parseFloat(data.montant_tva) || 0,
    montantTTC: parseFloat(data.montant_ttc) || 0,
    statut: data.statut,
    dateValidation: data.date_validation,
    observations: data.observations,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    createdBy: data.created_by,
    fournisseur: data.fournisseurs ? {
      id: data.fournisseurs.id,
      nom: data.fournisseurs.nom,
      code: data.fournisseurs.code,
    } : undefined,
    bonCommande: data.bons_commande ? {
      id: data.bons_commande.id,
      numero: data.bons_commande.numero,
    } : undefined,
    engagement: data.engagements ? {
      id: data.engagements.id,
      numero: data.engagements.numero,
    } : undefined,
    ligneBudgetaire: data.lignes_budgetaires ? {
      id: data.lignes_budgetaires.id,
      libelle: data.lignes_budgetaires.libelle,
    } : undefined,
    projet: data.projets ? {
      id: data.projets.id,
      nom: data.projets.nom,
    } : undefined,
  };
}

function mapFactureToDB(data: CreateFactureInput | UpdateFactureInput) {
  return {
    client_id: 'clientId' in data ? data.clientId : undefined,
    exercice_id: 'exerciceId' in data ? data.exerciceId : undefined,
    numero: data.numero,
    date_facture: data.dateFacture,
    date_echeance: data.dateEcheance || null,
    fournisseur_id: data.fournisseurId,
    bon_commande_id: data.bonCommandeId || null,
    engagement_id: data.engagementId || null,
    ligne_budgetaire_id: data.ligneBudgetaireId || null,
    projet_id: data.projetId || null,
    objet: data.objet,
    numero_facture_fournisseur: data.numeroFactureFournisseur || null,
    montant_ht: data.montantHT,
    montant_tva: data.montantTVA,
    montant_ttc: data.montantTTC,
    statut: data.statut,
    date_validation: data.dateValidation || null,
    observations: data.observations || null,
  };
}

export const facturesService = {
  async getAll(clientId: string, exerciceId?: string): Promise<Facture[]> {
    let query = supabase
      .from('factures')
      .select(`
        *,
        fournisseurs (id, nom, code),
        bons_commande (id, numero),
        engagements (id, numero),
        lignes_budgetaires (id, libelle),
        projets (id, nom)
      `)
      .eq('client_id', clientId)
      .order('date_facture', { ascending: false });

    if (exerciceId) {
      query = query.eq('exercice_id', exerciceId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data.map(mapFactureFromDB);
  },

  async getById(id: string): Promise<Facture> {
    const { data, error } = await supabase
      .from('factures')
      .select(`
        *,
        fournisseurs (id, nom, code),
        bons_commande (id, numero),
        engagements (id, numero),
        lignes_budgetaires (id, libelle),
        projets (id, nom)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return mapFactureFromDB(data);
  },

  async create(facture: CreateFactureInput): Promise<Facture> {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('factures')
      .insert({
        ...mapFactureToDB(facture),
        created_by: user?.id,
      })
      .select(`
        *,
        fournisseurs (id, nom, code),
        bons_commande (id, numero),
        engagements (id, numero),
        lignes_budgetaires (id, libelle),
        projets (id, nom)
      `)
      .single();

    if (error) throw error;
    return mapFactureFromDB(data);
  },

  async update(id: string, facture: UpdateFactureInput): Promise<Facture> {
    // Vérifier que la facture est en brouillon avant modification
    const { data: currentFacture, error: fetchError } = await supabase
      .from('factures')
      .select('statut')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    
    if (currentFacture.statut !== 'brouillon') {
      throw new Error('Seules les factures en brouillon peuvent être modifiées');
    }

    const { data, error } = await supabase
      .from('factures')
      .update(mapFactureToDB(facture))
      .eq('id', id)
      .select(`
        *,
        fournisseurs (id, nom, code),
        bons_commande (id, numero),
        engagements (id, numero),
        lignes_budgetaires (id, libelle),
        projets (id, nom)
      `)
      .single();

    if (error) throw error;
    return mapFactureFromDB(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('factures')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async genererNumero(clientId: string, exerciceId: string): Promise<string> {
    const { data, error } = await supabase
      .from('factures')
      .select('numero')
      .eq('client_id', clientId)
      .eq('exercice_id', exerciceId)
      .order('numero', { ascending: false })
      .limit(1);

    if (error) throw error;

    if (data && data.length > 0) {
      const lastNumero = data[0].numero;
      const match = lastNumero.match(/FAC(\d+)/);
      if (match) {
        const nextNumber = parseInt(match[1]) + 1;
        return `FAC${nextNumber.toString().padStart(6, '0')}`;
      }
    }

    return 'FAC000001';
  },

  async validerFacture(id: string): Promise<Facture> {
    const facture = await this.getById(id);

    if (facture.statut !== 'brouillon') {
      throw new Error('Seules les factures en brouillon peuvent être validées');
    }

    return this.update(id, {
      statut: 'validee',
      dateValidation: new Date().toISOString().split('T')[0],
    });
  },

  async marquerPayee(id: string): Promise<Facture> {
    const facture = await this.getById(id);

    if (facture.statut !== 'validee') {
      throw new Error('Seules les factures validées peuvent être marquées comme payées');
    }

    return this.update(id, {
      statut: 'payee',
    });
  },

  async annuler(id: string, motif: string): Promise<Facture> {
    const facture = await this.getById(id);

    if (facture.statut === 'payee') {
      throw new Error('Les factures payées ne peuvent pas être annulées');
    }

    return this.update(id, {
      statut: 'annulee',
      observations: motif,
    });
  },
};
