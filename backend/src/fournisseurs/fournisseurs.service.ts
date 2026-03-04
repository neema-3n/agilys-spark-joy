import { Injectable, NotFoundException } from '@nestjs/common';
import { PostgresService } from '../common/postgres.service';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import type { CreateFournisseurDto, UpdateFournisseurDto } from './dto/fournisseurs.dto';

interface FournisseurRow {
  id: string;
  client_id: string;
  code: string;
  nom: string;
  nom_court: string | null;
  type_fournisseur: string;
  categorie: string | null;
  email: string | null;
  telephone: string | null;
  telephone_mobile: string | null;
  adresse: string | null;
  ville: string | null;
  pays: string | null;
  site_web: string | null;
  numero_contribuable: string | null;
  registre_commerce: string | null;
  forme_juridique: string | null;
  banque: string | null;
  numero_compte: string | null;
  code_swift: string | null;
  iban: string | null;
  conditions_paiement: string | null;
  delai_livraison_moyen: number | null;
  note_evaluation: string | number | null;
  statut: string;
  date_premiere_collaboration: string | null;
  dernier_engagement_date: string | null;
  montant_total_engage: string | number | null;
  nombre_engagements: number | null;
  contact_nom: string | null;
  contact_prenom: string | null;
  contact_fonction: string | null;
  contact_email: string | null;
  contact_telephone: string | null;
  commentaires: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  created_by: string | null;
}

interface FournisseurView {
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

@Injectable()
export class FournisseursService {
  constructor(private readonly postgresService: PostgresService) {}

  async getAll(actor: AuthenticatedUser, statut?: string): Promise<FournisseurView[]> {
    const values: unknown[] = [actor.tenantId];
    let query = `
      SELECT *
      FROM public.fournisseurs
      WHERE client_id = $1
    `;

    if (statut) {
      query += ` AND statut = $2`;
      values.push(statut);
    }

    query += ` ORDER BY nom ASC`;

    const result = await this.postgresService.query<FournisseurRow>(query, values);
    return result.rows.map((row) => this.mapRowToView(row));
  }

  async getById(actor: AuthenticatedUser, id: string): Promise<FournisseurView> {
    const result = await this.postgresService.query<FournisseurRow>(
      `
        SELECT *
        FROM public.fournisseurs
        WHERE id = $1
          AND client_id = $2
        LIMIT 1
      `,
      [id, actor.tenantId]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException('Fournisseur introuvable');
    }

    return this.mapRowToView(row);
  }

  async create(actor: AuthenticatedUser, payload: CreateFournisseurDto): Promise<FournisseurView> {
    const result = await this.postgresService.query<FournisseurRow>(
      `
        INSERT INTO public.fournisseurs (
          client_id, code, nom, nom_court, type_fournisseur, categorie, email, telephone, telephone_mobile, adresse, ville, pays,
          site_web, numero_contribuable, registre_commerce, forme_juridique, banque, numero_compte, code_swift, iban,
          conditions_paiement, delai_livraison_moyen, note_evaluation, statut, date_premiere_collaboration,
          contact_nom, contact_prenom, contact_fonction, contact_email, contact_telephone, commentaires, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
          $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25,
          $26, $27, $28, $29, $30, $31, $32
        )
        RETURNING *
      `,
      [
        actor.tenantId,
        payload.code,
        payload.nom,
        payload.nomCourt ?? null,
        payload.typeFournisseur,
        payload.categorie ?? null,
        payload.email ?? null,
        payload.telephone ?? null,
        payload.telephoneMobile ?? null,
        payload.adresse ?? null,
        payload.ville ?? null,
        payload.pays ?? null,
        payload.siteWeb ?? null,
        payload.numeroContribuable ?? null,
        payload.registreCommerce ?? null,
        payload.formeJuridique ?? null,
        payload.banque ?? null,
        payload.numeroCompte ?? null,
        payload.codeSwift ?? null,
        payload.iban ?? null,
        payload.conditionsPaiement ?? null,
        payload.delaiLivraisonMoyen ?? null,
        payload.noteEvaluation ?? null,
        payload.statut ?? 'actif',
        payload.datePremiereCollaboration ?? null,
        payload.contactNom ?? null,
        payload.contactPrenom ?? null,
        payload.contactFonction ?? null,
        payload.contactEmail ?? null,
        payload.contactTelephone ?? null,
        payload.commentaires ?? null,
        actor.sub
      ]
    );

    return this.mapRowToView(result.rows[0]);
  }

  async update(actor: AuthenticatedUser, id: string, payload: UpdateFournisseurDto): Promise<FournisseurView> {
    const keys = Object.keys(payload) as Array<keyof UpdateFournisseurDto>;
    if (keys.length === 0) {
      return this.getById(actor, id);
    }

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    for (const key of keys) {
      const value = payload[key];
      if (value === undefined) {
        continue;
      }
      setClauses.push(`${this.mapUpdateKeyToColumn(key)} = $${index}`);
      values.push(value);
      index += 1;
    }

    setClauses.push('updated_at = now()');
    values.push(id, actor.tenantId);

    const result = await this.postgresService.query<FournisseurRow>(
      `
        UPDATE public.fournisseurs
        SET ${setClauses.join(', ')}
        WHERE id = $${index}
          AND client_id = $${index + 1}
        RETURNING *
      `,
      values
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException('Fournisseur introuvable');
    }

    return this.mapRowToView(row);
  }

  async delete(actor: AuthenticatedUser, id: string): Promise<void> {
    const result = await this.postgresService.query(
      `
        DELETE FROM public.fournisseurs
        WHERE id = $1
          AND client_id = $2
      `,
      [id, actor.tenantId]
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new NotFoundException('Fournisseur introuvable');
    }
  }

  private mapUpdateKeyToColumn(key: keyof UpdateFournisseurDto): string {
    const map: Record<keyof UpdateFournisseurDto, string> = {
      code: 'code',
      nom: 'nom',
      typeFournisseur: 'type_fournisseur',
      nomCourt: 'nom_court',
      categorie: 'categorie',
      email: 'email',
      telephone: 'telephone',
      telephoneMobile: 'telephone_mobile',
      adresse: 'adresse',
      ville: 'ville',
      pays: 'pays',
      siteWeb: 'site_web',
      numeroContribuable: 'numero_contribuable',
      registreCommerce: 'registre_commerce',
      formeJuridique: 'forme_juridique',
      banque: 'banque',
      numeroCompte: 'numero_compte',
      codeSwift: 'code_swift',
      iban: 'iban',
      conditionsPaiement: 'conditions_paiement',
      delaiLivraisonMoyen: 'delai_livraison_moyen',
      noteEvaluation: 'note_evaluation',
      statut: 'statut',
      datePremiereCollaboration: 'date_premiere_collaboration',
      contactNom: 'contact_nom',
      contactPrenom: 'contact_prenom',
      contactFonction: 'contact_fonction',
      contactEmail: 'contact_email',
      contactTelephone: 'contact_telephone',
      commentaires: 'commentaires'
    };

    return map[key];
  }

  private mapRowToView(row: FournisseurRow): FournisseurView {
    return {
      id: row.id,
      clientId: row.client_id,
      code: row.code,
      nom: row.nom,
      nomCourt: row.nom_court ?? undefined,
      typeFournisseur: row.type_fournisseur,
      categorie: row.categorie ?? undefined,
      email: row.email ?? undefined,
      telephone: row.telephone ?? undefined,
      telephoneMobile: row.telephone_mobile ?? undefined,
      adresse: row.adresse ?? undefined,
      ville: row.ville ?? undefined,
      pays: row.pays ?? undefined,
      siteWeb: row.site_web ?? undefined,
      numeroContribuable: row.numero_contribuable ?? undefined,
      registreCommerce: row.registre_commerce ?? undefined,
      formeJuridique: row.forme_juridique ?? undefined,
      banque: row.banque ?? undefined,
      numeroCompte: row.numero_compte ?? undefined,
      codeSwift: row.code_swift ?? undefined,
      iban: row.iban ?? undefined,
      conditionsPaiement: row.conditions_paiement ?? undefined,
      delaiLivraisonMoyen: row.delai_livraison_moyen ?? undefined,
      noteEvaluation: row.note_evaluation === null ? undefined : Number(row.note_evaluation),
      statut: row.statut,
      datePremiereCollaboration: row.date_premiere_collaboration ?? undefined,
      dernierEngagementDate: row.dernier_engagement_date ?? undefined,
      montantTotalEngage: Number(row.montant_total_engage ?? 0),
      nombreEngagements: row.nombre_engagements ?? 0,
      contactNom: row.contact_nom ?? undefined,
      contactPrenom: row.contact_prenom ?? undefined,
      contactFonction: row.contact_fonction ?? undefined,
      contactEmail: row.contact_email ?? undefined,
      contactTelephone: row.contact_telephone ?? undefined,
      commentaires: row.commentaires ?? undefined,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      createdBy: row.created_by ?? undefined
    };
  }
}
