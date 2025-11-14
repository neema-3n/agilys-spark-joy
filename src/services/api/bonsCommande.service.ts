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
        projets(id, nom)
      `)
      .eq('client_id', clientId)
      .order('date_commande', { ascending: false });

    if (exerciceId) {
      query = query.eq('exercice_id', exerciceId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data.map(mapBonCommandeFromDB);
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
    const { data: userData } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('bons_commande')
      .insert({
        ...mapBonCommandeToDB(bonCommande),
        created_by: userData.user?.id,
      })
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

  async update(id: string, bonCommande: UpdateBonCommandeInput): Promise<BonCommande> {
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
};
