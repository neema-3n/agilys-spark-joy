import { requestJson } from '@/services/api/api-utils';
import {
  CreateFournisseurInput,
  Fournisseur,
  FournisseurStats,
  UpdateFournisseurInput
} from '@/types/fournisseur.types';

interface FournisseurApiModel {
  id: string;
  clientId: string;
  code: string;
  nom: string;
  nomCourt?: string;
  typeFournisseur: string;
  categorie?: string;
  email?: string;
  telephone?: string;
  telephoneMobile?: string;
  adresse?: string;
  ville?: string;
  pays?: string;
  siteWeb?: string;
  numeroContribuable?: string;
  registreCommerce?: string;
  formeJuridique?: string;
  banque?: string;
  numeroCompte?: string;
  codeSwift?: string;
  iban?: string;
  conditionsPaiement?: string;
  delaiLivraisonMoyen?: number;
  noteEvaluation?: number;
  statut: string;
  datePremiereCollaboration?: string;
  dernierEngagementDate?: string;
  montantTotalEngage: number;
  nombreEngagements: number;
  contactNom?: string;
  contactPrenom?: string;
  contactFonction?: string;
  contactEmail?: string;
  contactTelephone?: string;
  commentaires?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

const mapFromApi = (row: FournisseurApiModel): Fournisseur => ({
  id: row.id,
  clientId: row.clientId,
  code: row.code,
  nom: row.nom,
  nomCourt: row.nomCourt,
  typeFournisseur: row.typeFournisseur as Fournisseur['typeFournisseur'],
  categorie: row.categorie,
  email: row.email,
  telephone: row.telephone,
  telephoneMobile: row.telephoneMobile,
  adresse: row.adresse,
  ville: row.ville,
  pays: row.pays,
  siteWeb: row.siteWeb,
  numeroContribuable: row.numeroContribuable,
  registreCommerce: row.registreCommerce,
  formeJuridique: row.formeJuridique,
  banque: row.banque,
  numeroCompte: row.numeroCompte,
  codeSwift: row.codeSwift,
  iban: row.iban,
  conditionsPaiement: row.conditionsPaiement,
  delaiLivraisonMoyen: row.delaiLivraisonMoyen,
  noteEvaluation: row.noteEvaluation,
  statut: row.statut as Fournisseur['statut'],
  datePremiereCollaboration: row.datePremiereCollaboration,
  dernierEngagementDate: row.dernierEngagementDate,
  montantTotalEngage: Number(row.montantTotalEngage || 0),
  nombreEngagements: Number(row.nombreEngagements || 0),
  contactNom: row.contactNom,
  contactPrenom: row.contactPrenom,
  contactFonction: row.contactFonction,
  contactEmail: row.contactEmail,
  contactTelephone: row.contactTelephone,
  commentaires: row.commentaires,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  createdBy: row.createdBy
});

export const fournisseursService = {
  async getAll(_clientId: string): Promise<Fournisseur[]> {
    const payload = await requestJson<FournisseurApiModel[]>(
      '/fournisseurs',
      { method: 'GET' },
      'Erreur lors de la récupération des fournisseurs'
    );

    return payload.map(mapFromApi);
  },

  async getById(id: string): Promise<Fournisseur> {
    const payload = await requestJson<FournisseurApiModel>(
      `/fournisseurs/${encodeURIComponent(id)}`,
      { method: 'GET' },
      'Erreur lors de la récupération du fournisseur'
    );

    return mapFromApi(payload);
  },

  async getByStatut(_clientId: string, statut: string): Promise<Fournisseur[]> {
    const payload = await requestJson<FournisseurApiModel[]>(
      `/fournisseurs?statut=${encodeURIComponent(statut)}`,
      { method: 'GET' },
      'Erreur lors de la récupération des fournisseurs'
    );

    return payload.map(mapFromApi);
  },

  async create(input: CreateFournisseurInput & { clientId: string }): Promise<Fournisseur> {
    const payload = await requestJson<FournisseurApiModel>(
      '/fournisseurs',
      {
        method: 'POST',
        body: JSON.stringify({
          code: input.code,
          nom: input.nom,
          nomCourt: input.nomCourt,
          typeFournisseur: input.typeFournisseur,
          categorie: input.categorie,
          email: input.email,
          telephone: input.telephone,
          telephoneMobile: input.telephoneMobile,
          adresse: input.adresse,
          ville: input.ville,
          pays: input.pays,
          siteWeb: input.siteWeb,
          numeroContribuable: input.numeroContribuable,
          registreCommerce: input.registreCommerce,
          formeJuridique: input.formeJuridique,
          banque: input.banque,
          numeroCompte: input.numeroCompte,
          codeSwift: input.codeSwift,
          iban: input.iban,
          conditionsPaiement: input.conditionsPaiement,
          delaiLivraisonMoyen: input.delaiLivraisonMoyen,
          noteEvaluation: input.noteEvaluation,
          statut: input.statut,
          datePremiereCollaboration: input.datePremiereCollaboration,
          contactNom: input.contactNom,
          contactPrenom: input.contactPrenom,
          contactFonction: input.contactFonction,
          contactEmail: input.contactEmail,
          contactTelephone: input.contactTelephone,
          commentaires: input.commentaires
        })
      },
      'Erreur lors de la création du fournisseur'
    );

    return mapFromApi(payload);
  },

  async update(id: string, input: UpdateFournisseurInput): Promise<Fournisseur> {
    const payload = await requestJson<FournisseurApiModel>(
      `/fournisseurs/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          code: input.code,
          nom: input.nom,
          nomCourt: input.nomCourt,
          typeFournisseur: input.typeFournisseur,
          categorie: input.categorie,
          email: input.email,
          telephone: input.telephone,
          telephoneMobile: input.telephoneMobile,
          adresse: input.adresse,
          ville: input.ville,
          pays: input.pays,
          siteWeb: input.siteWeb,
          numeroContribuable: input.numeroContribuable,
          registreCommerce: input.registreCommerce,
          formeJuridique: input.formeJuridique,
          banque: input.banque,
          numeroCompte: input.numeroCompte,
          codeSwift: input.codeSwift,
          iban: input.iban,
          conditionsPaiement: input.conditionsPaiement,
          delaiLivraisonMoyen: input.delaiLivraisonMoyen,
          noteEvaluation: input.noteEvaluation,
          statut: input.statut,
          datePremiereCollaboration: input.datePremiereCollaboration,
          contactNom: input.contactNom,
          contactPrenom: input.contactPrenom,
          contactFonction: input.contactFonction,
          contactEmail: input.contactEmail,
          contactTelephone: input.contactTelephone,
          commentaires: input.commentaires
        })
      },
      'Erreur lors de la mise à jour du fournisseur'
    );

    return mapFromApi(payload);
  },

  async delete(id: string): Promise<void> {
    await requestJson(
      `/fournisseurs/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      'Erreur lors de la suppression du fournisseur'
    );
  },

  async getStatistics(clientId: string): Promise<FournisseurStats> {
    const fournisseurs = await this.getAll(clientId);

    return {
      nombreTotal: fournisseurs.length,
      nombreActifs: fournisseurs.filter((f) => f.statut === 'actif').length,
      nombreInactifs: fournisseurs.filter((f) => f.statut === 'inactif').length,
      nombreBlacklistes: fournisseurs.filter((f) => f.statut === 'blackliste').length,
      montantTotalEngage: fournisseurs.reduce((sum, f) => sum + f.montantTotalEngage, 0),
      nombreEngagementsTotal: fournisseurs.reduce((sum, f) => sum + f.nombreEngagements, 0),
      topFournisseurs: fournisseurs
        .slice()
        .sort((a, b) => b.montantTotalEngage - a.montantTotalEngage)
        .slice(0, 5)
        .map((f) => ({
          id: f.id,
          nom: f.nom,
          montantTotal: f.montantTotalEngage,
          nombreEngagements: f.nombreEngagements
        }))
    };
  }
};
