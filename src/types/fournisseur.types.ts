export type TypeFournisseur = 'personne_physique' | 'personne_morale';
export type StatutFournisseur = 'actif' | 'inactif' | 'blackliste' | 'en_attente_validation';

export interface Fournisseur {
  id: string;
  clientId: string;
  code: string;
  nom: string;
  nomCourt?: string;
  typeFournisseur: TypeFournisseur;
  categorie?: string;
  
  // Coordonnées
  email?: string;
  telephone?: string;
  telephoneMobile?: string;
  adresse?: string;
  ville?: string;
  pays?: string;
  siteWeb?: string;
  
  // Informations légales
  numeroContribuable?: string;
  registreCommerce?: string;
  formeJuridique?: string;
  
  // Informations bancaires
  banque?: string;
  numeroCompte?: string;
  codeSwift?: string;
  iban?: string;
  
  // Informations commerciales
  conditionsPaiement?: string;
  delaiLivraisonMoyen?: number;
  noteEvaluation?: number;
  
  // Suivi
  statut: StatutFournisseur;
  datePremiereCollaboration?: string;
  dernierEngagementDate?: string;
  montantTotalEngage: number;
  nombreEngagements: number;
  
  // Contact
  contactNom?: string;
  contactPrenom?: string;
  contactFonction?: string;
  contactEmail?: string;
  contactTelephone?: string;
  
  // Notes
  commentaires?: string;
  
  // Audit
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export type CreateFournisseurInput = Omit<
  Fournisseur,
  'id' | 'montantTotalEngage' | 'nombreEngagements' | 'createdAt' | 'updatedAt' | 'createdBy'
>;

export type UpdateFournisseurInput = Partial<CreateFournisseurInput>;

export interface FournisseurStats {
  nombreTotal: number;
  nombreActifs: number;
  nombreInactifs: number;
  nombreBlacklistes: number;
  montantTotalEngage: number;
  nombreEngagementsTotal: number;
  topFournisseurs: Array<{
    id: string;
    nom: string;
    montantTotal: number;
    nombreEngagements: number;
  }>;
}
