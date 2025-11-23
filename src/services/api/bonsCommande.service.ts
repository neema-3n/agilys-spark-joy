import { supabase } from '@/integrations/supabase/client';
import { BonCommande, CreateBonCommandeInput, UpdateBonCommandeInput } from '@/types/bonCommande.types';

const mapBonCommandeFromDB = (data: any): BonCommande => ({
  id: data.id,
  clientId: data.client_id,
  exerciceId: data.exercice_id,
  numero: data.numero,
  dateCommande: data.date_commande,
  fournisseurId: data.fournisseur_id,
  engagementId: data.engagement_id,
  ligneBudgetaireId: data.ligne_budgetaire_id,
  projetId: data.projet_id,
  objet: data.objet,
  montant: Number(data.montant),
  statut: data.statut,
  dateValidation: data.date_validation,
  dateLivraisonPrevue: data.date_livraison_prevue,
  dateLivraisonReelle: data.date_livraison_reelle,
  conditionsLivraison: data.conditions_livraison,
  observations: data.observations,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
  createdBy: data.created_by,
  ecrituresCount: data.ecritures_comptables?.[0]?.count || 0,
  fournisseur: data.fournisseurs ? {
    id: data.fournisseurs.id,
    nom: data.fournisseurs.nom,
    code: data.fournisseurs.code,
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
});

const mapBonCommandeToDB = (data: CreateBonCommandeInput | UpdateBonCommandeInput) => ({
  client_id: 'clientId' in data ? data.clientId : undefined,
  exercice_id: 'exerciceId' in data ? data.exerciceId : undefined,
  numero: data.numero,
  date_commande: data.dateCommande,
  fournisseur_id: data.fournisseurId,
  engagement_id: data.engagementId,
  ligne_budgetaire_id: data.ligneBudgetaireId,
  projet_id: data.projetId,
  objet: data.objet,
  montant: data.montant,
  statut: data.statut,
  date_validation: data.dateValidation,
  date_livraison_prevue: data.dateLivraisonPrevue,
  date_livraison_reelle: data.dateLivraisonReelle,
  conditions_livraison: data.conditionsLivraison,
  observations: data.observations,
});

export const bonsCommandeService = {
  async getAll(clientId: string, exerciceId?: string): Promise<BonCommande[]> {
    let query = supabase
      .from('bons_commande')
      .select(`
        *,
        fournisseurs(id, nom, code),
        engagements(id, numero),
        lignes_budgetaires(id, libelle),
        projets(id, nom),
        ecritures_comptables!bon_commande_id(count)
      `)
      .eq('client_id', clientId)
      .order('date_commande', { ascending: false });

    if (exerciceId) {
      query = query.eq('exercice_id', exerciceId);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (!data) return [];

    // Récupérer les montants facturés pour chaque BC
    const bcIds = data.map(bc => bc.id);
    const { data: facturesData } = await supabase
      .from('factures')
      .select('bon_commande_id, montant_ttc')
      .in('bon_commande_id', bcIds)
      .neq('statut', 'annulee');

    // Calculer le montant facturé par BC
    const montantsFactures = new Map<string, number>();
    facturesData?.forEach(facture => {
      const current = montantsFactures.get(facture.bon_commande_id) || 0;
      montantsFactures.set(
        facture.bon_commande_id, 
        current + parseFloat(facture.montant_ttc.toString())
      );
    });

    return data.map(item => ({
      ...mapBonCommandeFromDB(item),
      montantFacture: montantsFactures.get(item.id) || 0,
    }));
  },

  async getById(id: string): Promise<BonCommande> {
    const { data, error } = await supabase
      .from('bons_commande')
      .select(`
        *,
        fournisseurs(id, nom, code),
        engagements(id, numero),
        lignes_budgetaires(id, libelle),
        projets(id, nom)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return mapBonCommandeFromDB(data);
  },

  async create(bonCommande: CreateBonCommandeInput): Promise<BonCommande> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      // Appeler l'edge function pour créer le bon de commande avec numéro généré atomiquement
      const { data, error } = await supabase.functions.invoke('create-bon-commande', {
        body: {
          exerciceId: bonCommande.exerciceId,
          clientId: bonCommande.clientId,
          fournisseurId: bonCommande.fournisseurId,
          objet: bonCommande.objet,
          montant: bonCommande.montant,
          dateCommande: bonCommande.dateCommande,
          dateLivraisonPrevue: bonCommande.dateLivraisonPrevue,
          conditionsLivraison: bonCommande.conditionsLivraison,
          engagementId: bonCommande.engagementId,
          ligneBudgetaireId: bonCommande.ligneBudgetaireId,
          projetId: bonCommande.projetId,
          observations: bonCommande.observations,
        }
      });

      if (error) throw error;
      if (!data) throw new Error('Bon de commande non créé');

      return data as BonCommande;
    } catch (error) {
      console.error('Erreur lors de la création du bon de commande:', error);
      throw error;
    }
  },

  async update(id: string, bonCommande: UpdateBonCommandeInput): Promise<BonCommande> {
    // Vérifier que le bon de commande est en brouillon ou validé avant modification
    const { data: currentBC, error: fetchError } = await supabase
      .from('bons_commande')
      .select('statut')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    
    if (currentBC.statut !== 'brouillon' && currentBC.statut !== 'valide') {
      throw new Error('Seuls les bons de commande en brouillon ou validés peuvent être modifiés');
    }

    const { data, error } = await supabase
      .from('bons_commande')
      .update(mapBonCommandeToDB(bonCommande))
      .eq('id', id)
      .select(`
        *,
        fournisseurs(id, nom, code),
        engagements(id, numero),
        lignes_budgetaires(id, libelle),
        projets(id, nom)
      `)
      .single();

    if (error) throw error;
    return mapBonCommandeFromDB(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('bons_commande')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async genererNumero(clientId: string, exerciceId: string): Promise<string> {
    const { data, error } = await supabase
      .from('bons_commande')
      .select('numero')
      .eq('client_id', clientId)
      .eq('exercice_id', exerciceId)
      .order('numero', { ascending: false })
      .limit(1);

    if (error) throw error;

    if (!data || data.length === 0) {
      return 'BC-00001';
    }

    const lastNumero = data[0].numero;
    const numeroMatch = lastNumero.match(/BC-(\d+)/);
    if (numeroMatch) {
      const nextNum = parseInt(numeroMatch[1]) + 1;
      return `BC-${nextNum.toString().padStart(5, '0')}`;
    }

    return 'BC-00001';
  },

  async validerBonCommande(id: string): Promise<BonCommande> {
    // Récupérer le BC avec ses relations pour validation
    const { data: bc, error: fetchError } = await supabase
      .from('bons_commande')
      .select(`
        *,
        engagements(id, numero, montant)
      `)
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (bc.statut !== 'brouillon') {
      throw new Error('Seuls les bons de commande en brouillon peuvent être validés');
    }

    // Validation métier : vérifier que le montant ne dépasse pas l'engagement si lié
    if (bc.engagement_id && bc.engagements) {
      const engagement = bc.engagements;
      
      if (bc.montant > engagement.montant) {
        throw new Error(
          `Le montant du BC (${bc.montant}) dépasse le montant de l'engagement ${engagement.numero} (${engagement.montant})`
        );
      }
    }

    // Mettre à jour le statut
    const { data, error } = await supabase
      .from('bons_commande')
      .update({
        statut: 'valide',
        date_validation: new Date().toISOString().split('T')[0],
      })
      .eq('id', id)
      .select(`
        *,
        fournisseurs(id, nom, code),
        engagements(id, numero),
        lignes_budgetaires(id, libelle),
        projets(id, nom)
      `)
      .single();

    if (error) throw error;

    // Générer les écritures comptables automatiquement
    try {
      await supabase.functions.invoke('generate-ecritures-comptables', {
        body: {
          typeOperation: 'bon_commande',
          sourceId: id,
          clientId: bc.client_id,
          exerciceId: bc.exercice_id
        }
      });
    } catch (error) {
      console.error('Erreur lors de la génération des écritures:', error);
    }

    return mapBonCommandeFromDB(data);
  },

  async mettreEnCours(id: string): Promise<BonCommande> {
    const { data: bc, error: fetchError } = await supabase
      .from('bons_commande')
      .select('statut, client_id, exercice_id')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (bc.statut !== 'valide') {
      throw new Error('Seuls les bons de commande validés peuvent être mis en cours');
    }

    const { data, error } = await supabase
      .from('bons_commande')
      .update({ statut: 'en_cours' })
      .eq('id', id)
      .select(`
        *,
        fournisseurs(id, nom, code),
        engagements(id, numero),
        lignes_budgetaires(id, libelle),
        projets(id, nom)
      `)
      .single();

    if (error) throw error;

    // Générer les écritures comptables automatiquement
    try {
      await supabase.functions.invoke('generate-ecritures-comptables', {
        body: {
          typeOperation: 'bon_commande',
          sourceId: id,
          clientId: bc.client_id,
          exerciceId: bc.exercice_id
        }
      });
    } catch (error) {
      console.error('Erreur lors de la génération des écritures:', error);
    }

    return mapBonCommandeFromDB(data);
  },

  async receptionner(id: string, dateLivraisonReelle: string): Promise<BonCommande> {
    const { data: bc, error: fetchError } = await supabase
      .from('bons_commande')
      .select('statut, client_id, exercice_id')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (bc.statut !== 'en_cours') {
      throw new Error('Seuls les bons de commande en cours peuvent être réceptionnés');
    }

    const { data, error } = await supabase
      .from('bons_commande')
      .update({
        statut: 'receptionne',
        date_livraison_reelle: dateLivraisonReelle,
      })
      .eq('id', id)
      .select(`
        *,
        fournisseurs(id, nom, code),
        engagements(id, numero),
        lignes_budgetaires(id, libelle),
        projets(id, nom)
      `)
      .single();

    if (error) throw error;

    // Générer les écritures comptables automatiquement
    try {
      await supabase.functions.invoke('generate-ecritures-comptables', {
        body: {
          typeOperation: 'bon_commande',
          sourceId: id,
          clientId: bc.client_id,
          exerciceId: bc.exercice_id
        }
      });
    } catch (error) {
      console.error('Erreur lors de la génération des écritures:', error);
    }

    return mapBonCommandeFromDB(data);
  },

  async annuler(id: string, motif: string): Promise<BonCommande> {
    const { data: bc, error: fetchError } = await supabase
      .from('bons_commande')
      .select('statut')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (bc.statut === 'facture') {
      throw new Error('Impossible d\'annuler un bon de commande déjà facturé');
    }
    if (bc.statut === 'annule') {
      throw new Error('Ce bon de commande est déjà annulé');
    }

    const { data, error } = await supabase
      .from('bons_commande')
      .update({
        statut: 'annule',
        observations: motif,
      })
      .eq('id', id)
      .select(`
        *,
        fournisseurs(id, nom, code),
        engagements(id, numero),
        lignes_budgetaires(id, libelle),
        projets(id, nom)
      `)
      .single();

    if (error) throw error;
    return mapBonCommandeFromDB(data);
  },
};
