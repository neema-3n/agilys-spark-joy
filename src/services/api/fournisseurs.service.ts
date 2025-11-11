import { supabase } from '@/integrations/supabase/client';
import {
  Fournisseur,
  CreateFournisseurInput,
  UpdateFournisseurInput,
  FournisseurStats,
} from '@/types/fournisseur.types';

const mapFromDatabase = (row: any): Fournisseur => ({
  id: row.id,
  clientId: row.client_id,
  code: row.code,
  nom: row.nom,
  nomCourt: row.nom_court,
  typeFournisseur: row.type_fournisseur,
  categorie: row.categorie,
  email: row.email,
  telephone: row.telephone,
  telephoneMobile: row.telephone_mobile,
  adresse: row.adresse,
  ville: row.ville,
  pays: row.pays,
  siteWeb: row.site_web,
  numeroContribuable: row.numero_contribuable,
  registreCommerce: row.registre_commerce,
  formeJuridique: row.forme_juridique,
  banque: row.banque,
  numeroCompte: row.numero_compte,
  codeSwift: row.code_swift,
  iban: row.iban,
  conditionsPaiement: row.conditions_paiement,
  delaiLivraisonMoyen: row.delai_livraison_moyen,
  noteEvaluation: row.note_evaluation ? parseFloat(row.note_evaluation) : undefined,
  statut: row.statut,
  datePremiereCollaboration: row.date_premiere_collaboration,
  dernierEngagementDate: row.dernier_engagement_date,
  montantTotalEngage: parseFloat(row.montant_total_engage || 0),
  nombreEngagements: row.nombre_engagements || 0,
  contactNom: row.contact_nom,
  contactPrenom: row.contact_prenom,
  contactFonction: row.contact_fonction,
  contactEmail: row.contact_email,
  contactTelephone: row.contact_telephone,
  commentaires: row.commentaires,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  createdBy: row.created_by,
});

const mapToDatabase = (input: CreateFournisseurInput | UpdateFournisseurInput) => {
  const payload: any = {};
  
  if ('code' in input) payload.code = input.code;
  if ('nom' in input) payload.nom = input.nom;
  if ('nomCourt' in input) payload.nom_court = input.nomCourt;
  if ('typeFournisseur' in input) payload.type_fournisseur = input.typeFournisseur;
  if ('categorie' in input) payload.categorie = input.categorie;
  if ('email' in input) payload.email = input.email;
  if ('telephone' in input) payload.telephone = input.telephone;
  if ('telephoneMobile' in input) payload.telephone_mobile = input.telephoneMobile;
  if ('adresse' in input) payload.adresse = input.adresse;
  if ('ville' in input) payload.ville = input.ville;
  if ('pays' in input) payload.pays = input.pays;
  if ('siteWeb' in input) payload.site_web = input.siteWeb;
  if ('numeroContribuable' in input) payload.numero_contribuable = input.numeroContribuable;
  if ('registreCommerce' in input) payload.registre_commerce = input.registreCommerce;
  if ('formeJuridique' in input) payload.forme_juridique = input.formeJuridique;
  if ('banque' in input) payload.banque = input.banque;
  if ('numeroCompte' in input) payload.numero_compte = input.numeroCompte;
  if ('codeSwift' in input) payload.code_swift = input.codeSwift;
  if ('iban' in input) payload.iban = input.iban;
  if ('conditionsPaiement' in input) payload.conditions_paiement = input.conditionsPaiement;
  if ('delaiLivraisonMoyen' in input) payload.delai_livraison_moyen = input.delaiLivraisonMoyen;
  if ('noteEvaluation' in input) payload.note_evaluation = input.noteEvaluation;
  if ('statut' in input) payload.statut = input.statut;
  if ('datePremiereCollaboration' in input) payload.date_premiere_collaboration = input.datePremiereCollaboration;
  if ('contactNom' in input) payload.contact_nom = input.contactNom;
  if ('contactPrenom' in input) payload.contact_prenom = input.contactPrenom;
  if ('contactFonction' in input) payload.contact_fonction = input.contactFonction;
  if ('contactEmail' in input) payload.contact_email = input.contactEmail;
  if ('contactTelephone' in input) payload.contact_telephone = input.contactTelephone;
  if ('commentaires' in input) payload.commentaires = input.commentaires;
  
  return payload;
};

export const fournisseursService = {
  async getAll(clientId: string): Promise<Fournisseur[]> {
    const { data, error } = await supabase
      .from('fournisseurs')
      .select('*')
      .eq('client_id', clientId)
      .order('nom', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapFromDatabase);
  },

  async getById(id: string): Promise<Fournisseur> {
    const { data, error } = await supabase
      .from('fournisseurs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return mapFromDatabase(data);
  },

  async getByStatut(clientId: string, statut: string): Promise<Fournisseur[]> {
    const { data, error } = await supabase
      .from('fournisseurs')
      .select('*')
      .eq('client_id', clientId)
      .eq('statut', statut)
      .order('nom', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapFromDatabase);
  },

  async create(input: CreateFournisseurInput & { clientId: string }): Promise<Fournisseur> {
    const payload = {
      ...mapToDatabase(input),
      client_id: input.clientId,
    };

    console.log('🔍 Création fournisseur - Payload:', payload);

    const { data, error } = await supabase
      .from('fournisseurs')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('❌ Erreur création fournisseur:', error);
      throw error;
    }
    
    console.log('✅ Fournisseur créé:', data);
    return mapFromDatabase(data);
  },

  async update(id: string, input: UpdateFournisseurInput): Promise<Fournisseur> {
    const payload = mapToDatabase(input);

    const { data, error } = await supabase
      .from('fournisseurs')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapFromDatabase(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('fournisseurs')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getStatistics(clientId: string): Promise<FournisseurStats> {
    const fournisseurs = await this.getAll(clientId);

    return {
      nombreTotal: fournisseurs.length,
      nombreActifs: fournisseurs.filter(f => f.statut === 'actif').length,
      nombreInactifs: fournisseurs.filter(f => f.statut === 'inactif').length,
      nombreBlacklistes: fournisseurs.filter(f => f.statut === 'blackliste').length,
      montantTotalEngage: fournisseurs.reduce((sum, f) => sum + f.montantTotalEngage, 0),
      nombreEngagementsTotal: fournisseurs.reduce((sum, f) => sum + f.nombreEngagements, 0),
      topFournisseurs: fournisseurs
        .sort((a, b) => b.montantTotalEngage - a.montantTotalEngage)
        .slice(0, 5)
        .map(f => ({
          id: f.id,
          nom: f.nom,
          montantTotal: f.montantTotalEngage,
          nombreEngagements: f.nombreEngagements,
        })),
    };
  },
};
