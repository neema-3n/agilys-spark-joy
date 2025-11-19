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
    montantPaye: parseFloat(data.montant_paye) || 0,
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
    montant_paye: 'montantPaye' in data ? data.montantPaye : 0,
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
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      // Appeler l'edge function pour créer la facture avec numéro généré atomiquement
      const { data, error } = await supabase.functions.invoke('create-facture', {
        body: {
          exerciceId: facture.exerciceId,
          clientId: facture.clientId,
          fournisseurId: facture.fournisseurId,
          objet: facture.objet,
          dateFacture: facture.dateFacture,
          dateEcheance: facture.dateEcheance,
          montantHT: facture.montantHT,
          montantTVA: facture.montantTVA,
          montantTTC: facture.montantTTC,
          numeroFactureFournisseur: facture.numeroFactureFournisseur,
          bonCommandeId: facture.bonCommandeId,
          engagementId: facture.engagementId,
          ligneBudgetaireId: facture.ligneBudgetaireId,
          projetId: facture.projetId,
          observations: facture.observations,
        }
      });

      if (error) {
        // Extraire le vrai message d'erreur depuis l'edge function
        let errorMessage = error.message;
        
        // Si c'est une FunctionsHttpError, extraire le body JSON
        if (error.context) {
          try {
            const errorBody = await error.context.json();
            if (errorBody.error) {
              errorMessage = errorBody.error;
            }
          } catch (e) {
            console.error('Impossible de parser l\'erreur:', e);
          }
        }
        
        throw new Error(errorMessage);
      }
      if (!data) throw new Error('Facture non créée');

      return data as Facture;
    } catch (error) {
      console.error('Erreur lors de la création de la facture:', error);
      throw error;
    }
  },

  async update(id: string, facture: UpdateFactureInput): Promise<Facture> {
    // Vérifier que la facture est en brouillon avant modification
    const { data: currentFacture, error: fetchError } = await supabase
      .from('factures')
      .select('statut, bon_commande_id, montant_ttc')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    
    if (currentFacture.statut !== 'brouillon' && currentFacture.statut !== 'validee') {
      throw new Error('Seules les factures en brouillon ou validées peuvent être modifiées');
    }

    // Vérifier le montant si un BC est lié (dans l'ancienne OU la nouvelle facture)
    const bonCommandeId = facture.bonCommandeId || currentFacture.bon_commande_id;
    
    if (bonCommandeId) {
      // 1. Récupérer le montant du BC
      const { data: bc, error: bcError } = await supabase
        .from('bons_commande')
        .select('montant')
        .eq('id', bonCommandeId)
        .single();
      
      if (bcError) throw bcError;
      
      // 2. Calculer le montant déjà facturé (hors facture actuelle et hors annulées)
      const { data: facturesExistantes, error: facturesError } = await supabase
        .from('factures')
        .select('montant_ttc')
        .eq('bon_commande_id', bonCommandeId)
        .neq('statut', 'annulee')
        .neq('id', id);
      
      if (facturesError) throw facturesError;
      
      const montantDejaFacture = facturesExistantes?.reduce(
        (sum, f) => sum + parseFloat(f.montant_ttc.toString()), 
        0
      ) || 0;
      
      // 3. Calculer le nouveau montant total
      const nouveauMontant = facture.montantTTC !== undefined 
        ? facture.montantTTC 
        : parseFloat(currentFacture.montant_ttc.toString());
      
      const montantTotal = montantDejaFacture + nouveauMontant;
      
      if (montantTotal > bc.montant) {
        throw new Error(
          `Le montant total des factures (${montantTotal.toLocaleString('fr-FR')} €) ` +
          `dépasserait le montant du bon de commande (${bc.montant.toLocaleString('fr-FR')} €). ` +
          `Montant déjà facturé : ${montantDejaFacture.toLocaleString('fr-FR')} €. ` +
          `Montant disponible : ${(bc.montant - montantDejaFacture).toLocaleString('fr-FR')} €.`
        );
      }
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
