import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PostgresService } from '../common/postgres.service';
import { EcrituresComptablesService } from '../ecritures-comptables/ecritures-comptables.service';
import type { CreateBonCommandeDto, UpdateBonCommandeDto } from './dto/bons-commande.dto';

interface BonCommandeRow {
  id: string;
  client_id: string;
  exercice_id: string;
  numero: string;
  date_commande: Date | string;
  fournisseur_id: string;
  engagement_id: string | null;
  ligne_budgetaire_id: string | null;
  projet_id: string | null;
  objet: string;
  montant: string | number;
  statut: 'brouillon' | 'valide' | 'en_cours' | 'receptionne' | 'facture' | 'annule';
  date_validation: Date | string | null;
  date_livraison_prevue: Date | string | null;
  date_livraison_reelle: Date | string | null;
  conditions_livraison: string | null;
  observations: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  created_by: string | null;
  fournisseur_nom: string | null;
  fournisseur_code: string | null;
  engagement_numero: string | null;
  ligne_budgetaire_libelle: string | null;
  projet_nom: string | null;
  montant_facture: string | number;
  ecritures_count: string | number;
}

interface BonCommandeView {
  id: string;
  clientId: string;
  exerciceId: string;
  numero: string;
  dateCommande: string;
  fournisseurId: string;
  engagementId?: string;
  ligneBudgetaireId?: string;
  projetId?: string;
  objet: string;
  montant: number;
  statut: 'brouillon' | 'valide' | 'en_cours' | 'receptionne' | 'facture' | 'annule';
  dateValidation?: string;
  dateLivraisonPrevue?: string;
  dateLivraisonReelle?: string;
  conditionsLivraison?: string;
  observations?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  ecrituresCount?: number;
  montantFacture?: number;
  fournisseur?: {
    id: string;
    nom: string;
    code: string;
  };
  engagement?: {
    id: string;
    numero: string;
  };
  ligneBudgetaire?: {
    id: string;
    libelle: string;
  };
  projet?: {
    id: string;
    nom: string;
  };
}

interface BonCommandeReferences {
  fournisseurId: string;
  engagementId?: string;
  ligneBudgetaireId?: string;
  projetId?: string;
  exerciceId: string;
}

@Injectable()
export class BonsCommandeService {
  constructor(
    private readonly postgresService: PostgresService,
    private readonly ecrituresComptablesService: EcrituresComptablesService
  ) {}

  async getAll(actor: AuthenticatedUser, exerciceId?: string): Promise<BonCommandeView[]> {
    const values: unknown[] = [actor.tenantId];
    let index = 2;

    let whereSql = 'WHERE bc.client_id = $1';
    if (exerciceId) {
      whereSql += `\n  AND bc.exercice_id = $${index}`;
      values.push(exerciceId);
      index += 1;
    }

    const result = await this.postgresService.query<BonCommandeRow>(
      this.baseSelect() +
        `
${whereSql}
ORDER BY bc.date_commande DESC, bc.created_at DESC
        `,
      values
    );

    return result.rows.map((row) => this.mapRowToView(row));
  }

  async getById(actor: AuthenticatedUser, id: string): Promise<BonCommandeView> {
    const result = await this.postgresService.query<BonCommandeRow>(
      this.baseSelect() +
        `
          WHERE bc.client_id = $1
            AND bc.id = $2
          LIMIT 1
        `,
      [actor.tenantId, id]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException('Bon de commande introuvable');
    }

    return this.mapRowToView(row);
  }

  async create(actor: AuthenticatedUser, payload: CreateBonCommandeDto): Promise<BonCommandeView> {
    await this.validateReferences(actor, {
      exerciceId: payload.exerciceId,
      fournisseurId: payload.fournisseurId,
      engagementId: payload.engagementId ?? undefined,
      ligneBudgetaireId: payload.ligneBudgetaireId ?? undefined,
      projetId: payload.projetId ?? undefined
    });

    const exerciceCode = await this.resolveExerciceCode(actor.tenantId, payload.exerciceId);

    const numero = await this.generateNextNumero(actor.tenantId, payload.exerciceId, exerciceCode);

    const insertResult = await this.postgresService.query<{ id: string }>(
      `
        INSERT INTO public.bons_commande (
          client_id,
          exercice_id,
          numero,
          date_commande,
          fournisseur_id,
          engagement_id,
          ligne_budgetaire_id,
          projet_id,
          objet,
          montant,
          statut,
          date_livraison_prevue,
          conditions_livraison,
          observations,
          created_by
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          'brouillon',
          $11,
          $12,
          $13,
          $14
        )
        RETURNING id
      `,
      [
        actor.tenantId,
        payload.exerciceId,
        numero,
        payload.dateCommande,
        payload.fournisseurId,
        payload.engagementId ?? null,
        payload.ligneBudgetaireId ?? null,
        payload.projetId ?? null,
        payload.objet,
        payload.montant,
        payload.dateLivraisonPrevue?.trim() || null,
        payload.conditionsLivraison?.trim() || null,
        payload.observations?.trim() || null,
        actor.sub
      ]
    );

    const id = insertResult.rows[0]?.id;
    if (!id) {
      throw new NotFoundException('Bon de commande non créé');
    }

    const created = await this.getById(actor, id);
    await this.generateEcrituresForBonCommande(actor, created);
    return created;
  }

  async update(actor: AuthenticatedUser, id: string, payload: UpdateBonCommandeDto): Promise<BonCommandeView> {
    const current = await this.getById(actor, id);

    if (current.statut !== 'brouillon' && current.statut !== 'valide') {
      throw new BadRequestException('Seuls les bons de commande en brouillon ou validés peuvent être modifiés');
    }

    const keys = Object.keys(payload) as Array<keyof UpdateBonCommandeDto>;
    if (keys.length === 0) {
      return current;
    }

    await this.validateReferences(actor, {
      exerciceId: current.exerciceId,
      fournisseurId: payload.fournisseurId ?? current.fournisseurId,
      engagementId: payload.engagementId !== undefined ? payload.engagementId ?? undefined : current.engagementId,
      ligneBudgetaireId:
        payload.ligneBudgetaireId !== undefined ? payload.ligneBudgetaireId ?? undefined : current.ligneBudgetaireId,
      projetId: payload.projetId !== undefined ? payload.projetId ?? undefined : current.projetId
    });

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    for (const key of keys) {
      const value = payload[key];
      if (value === undefined) {
        continue;
      }

      setClauses.push(`${this.mapUpdateKeyToColumn(key)} = $${index}`);
      values.push(this.normalizeUpdateValue(key, value));
      index += 1;
    }

    if (setClauses.length === 0) {
      return current;
    }

    setClauses.push('updated_at = now()');
    values.push(id, actor.tenantId);

    const result = await this.postgresService.query(
      `
        UPDATE public.bons_commande
        SET ${setClauses.join(', ')}
        WHERE id = $${index}
          AND client_id = $${index + 1}
      `,
      values
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new NotFoundException('Bon de commande introuvable');
    }

    return this.getById(actor, id);
  }

  async delete(actor: AuthenticatedUser, id: string): Promise<void> {
    const result = await this.postgresService.query(
      `
        DELETE FROM public.bons_commande
        WHERE id = $1
          AND client_id = $2
      `,
      [id, actor.tenantId]
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new NotFoundException('Bon de commande introuvable');
    }
  }

  async genererNumero(actor: AuthenticatedUser, exerciceId: string): Promise<{ numero: string }> {
    const exerciceCode = await this.resolveExerciceCode(actor.tenantId, exerciceId);

    const numero = await this.generateNextNumero(actor.tenantId, exerciceId, exerciceCode);
    return { numero };
  }

  async valider(actor: AuthenticatedUser, id: string): Promise<BonCommandeView> {
    const bc = await this.getById(actor, id);

    if (bc.statut !== 'brouillon') {
      throw new BadRequestException('Seuls les bons de commande en brouillon peuvent être validés');
    }

    if (bc.engagementId) {
      const engagementResult = await this.postgresService.query<{ numero: string; montant: string | number }>(
        `
          SELECT numero, montant
          FROM public.engagements
          WHERE id = $1
            AND client_id = $2
            AND exercice_id = $3
            AND statut = 'valide'
          LIMIT 1
        `,
        [bc.engagementId, actor.tenantId, bc.exerciceId]
      );

      const engagement = engagementResult.rows[0];
      if (!engagement) {
        throw new BadRequestException("L'engagement lié au bon de commande est introuvable ou n'est plus valide");
      }
      if (engagement && bc.montant > Number(engagement.montant ?? 0)) {
        throw new BadRequestException(
          `Le montant du BC (${bc.montant}) dépasse le montant de l'engagement ${engagement.numero} (${Number(engagement.montant ?? 0)})`
        );
      }
    }

    const result = await this.postgresService.query(
      `
        UPDATE public.bons_commande
        SET
          statut = 'valide',
          date_validation = CURRENT_DATE,
          updated_at = now()
        WHERE id = $1
          AND client_id = $2
      `,
      [id, actor.tenantId]
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new NotFoundException('Bon de commande introuvable');
    }

    const updated = await this.getById(actor, id);
    await this.generateEcrituresForBonCommande(actor, updated);
    return updated;
  }

  async mettreEnCours(actor: AuthenticatedUser, id: string): Promise<BonCommandeView> {
    const bc = await this.getById(actor, id);
    if (bc.statut !== 'valide') {
      throw new BadRequestException('Seuls les bons de commande validés peuvent être mis en cours');
    }

    const result = await this.postgresService.query(
      `
        UPDATE public.bons_commande
        SET
          statut = 'en_cours',
          updated_at = now()
        WHERE id = $1
          AND client_id = $2
      `,
      [id, actor.tenantId]
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new NotFoundException('Bon de commande introuvable');
    }

    const updated = await this.getById(actor, id);
    await this.generateEcrituresForBonCommande(actor, updated);
    return updated;
  }

  async receptionner(actor: AuthenticatedUser, id: string, dateLivraisonReelle: string): Promise<BonCommandeView> {
    const bc = await this.getById(actor, id);
    if (bc.statut !== 'en_cours') {
      throw new BadRequestException('Seuls les bons de commande en cours peuvent être réceptionnés');
    }

    const result = await this.postgresService.query(
      `
        UPDATE public.bons_commande
        SET
          statut = 'receptionne',
          date_livraison_reelle = $1,
          updated_at = now()
        WHERE id = $2
          AND client_id = $3
      `,
      [dateLivraisonReelle, id, actor.tenantId]
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new NotFoundException('Bon de commande introuvable');
    }

    const updated = await this.getById(actor, id);
    await this.generateEcrituresForBonCommande(actor, updated);
    return updated;
  }

  async annuler(actor: AuthenticatedUser, id: string, motif: string): Promise<BonCommandeView> {
    const bc = await this.getById(actor, id);

    if (bc.statut === 'facture') {
      throw new BadRequestException("Impossible d'annuler un bon de commande déjà facturé");
    }

    if (bc.statut === 'annule') {
      throw new BadRequestException('Ce bon de commande est déjà annulé');
    }

    return this.update(actor, id, {
      statut: 'annule',
      observations: motif
    });
  }

  private async generateNextNumero(clientId: string, exerciceId: string, exerciceCode: string): Promise<string> {
    const pattern = `BC/${exerciceCode}/%`;

    const result = await this.postgresService.query<{ numero: string | null }>(
      `
        SELECT numero
        FROM public.bons_commande
        WHERE client_id = $1
          AND exercice_id = $2
          AND numero LIKE $3
        ORDER BY numero DESC
        LIMIT 1
      `,
      [clientId, exerciceId, pattern]
    );

    const lastNumero = result.rows[0]?.numero;
    const match = lastNumero?.match(/\/(\d+)$/);
    const nextNumber = match ? Number(match[1]) + 1 : 1;

    return `BC/${exerciceCode}/${String(nextNumber).padStart(4, '0')}`;
  }

  private async generateEcrituresForBonCommande(actor: AuthenticatedUser, bc: BonCommandeView): Promise<void> {
    await this.ecrituresComptablesService.ensureGeneratedForOperation(actor, 'bon_commande', bc.id, bc.exerciceId);
  }

  private async resolveExerciceCode(tenantId: string, exerciceId: string): Promise<string> {
    const exercice = await this.postgresService.query<{ code: string }>(
      `
        SELECT code
        FROM public.exercices
        WHERE id = $1
          AND client_id = $2
        LIMIT 1
      `,
      [exerciceId, tenantId]
    );

    const exerciceCode = exercice.rows[0]?.code;
    if (!exerciceCode) {
      throw new NotFoundException('Exercice introuvable pour ce tenant');
    }

    return exerciceCode;
  }

  private async validateReferences(actor: AuthenticatedUser, refs: BonCommandeReferences): Promise<void> {
    const { exerciceId, fournisseurId, engagementId, ligneBudgetaireId, projetId } = refs;

    await this.resolveExerciceCode(actor.tenantId, exerciceId);

    const fournisseur = await this.postgresService.query<{ id: string }>(
      `
        SELECT id
        FROM public.fournisseurs
        WHERE id = $1
          AND client_id = $2
        LIMIT 1
      `,
      [fournisseurId, actor.tenantId]
    );
    if (!fournisseur.rows[0]) {
      throw new BadRequestException('Fournisseur introuvable pour ce tenant');
    }

    let engagementScope:
      | {
          id: string;
          ligne_budgetaire_id: string | null;
          projet_id: string | null;
        }
      | undefined;
    if (engagementId) {
      const engagement = await this.postgresService.query<{
        id: string;
        ligne_budgetaire_id: string | null;
        projet_id: string | null;
        statut: string;
      }>(
        `
          SELECT id, ligne_budgetaire_id, projet_id, statut
          FROM public.engagements
          WHERE id = $1
            AND client_id = $2
            AND exercice_id = $3
          LIMIT 1
        `,
        [engagementId, actor.tenantId, exerciceId]
      );

      const engagementRow = engagement.rows[0];
      if (!engagementRow) {
        throw new BadRequestException("L'engagement fourni est introuvable pour le tenant/exercice");
      }
      if (engagementRow.statut !== 'valide') {
        throw new BadRequestException('Le bon de commande doit être rattaché à un engagement actif (statut valide)');
      }
      engagementScope = engagementRow;
    }

    if (ligneBudgetaireId) {
      const ligne = await this.postgresService.query<{ id: string }>(
        `
          SELECT id
          FROM public.lignes_budgetaires
          WHERE id = $1
            AND client_id = $2
            AND exercice_id = $3
          LIMIT 1
        `,
        [ligneBudgetaireId, actor.tenantId, exerciceId]
      );
      if (!ligne.rows[0]) {
        throw new BadRequestException('La ligne budgétaire est hors scope tenant/exercice');
      }
    }

    if (projetId) {
      const projet = await this.postgresService.query<{ id: string }>(
        `
          SELECT id
          FROM public.projets
          WHERE id = $1
            AND client_id = $2
            AND exercice_id = $3
          LIMIT 1
        `,
        [projetId, actor.tenantId, exerciceId]
      );
      if (!projet.rows[0]) {
        throw new BadRequestException('Le projet est hors scope tenant/exercice');
      }
    }

    if (engagementScope) {
      if (ligneBudgetaireId && engagementScope.ligne_budgetaire_id && ligneBudgetaireId !== engagementScope.ligne_budgetaire_id) {
        throw new BadRequestException(
          "Incohérence de chaînage: la ligne budgétaire du bon de commande ne correspond pas à celle de l'engagement"
        );
      }

      if (projetId && engagementScope.projet_id && projetId !== engagementScope.projet_id) {
        throw new BadRequestException("Incohérence de chaînage: le projet du bon de commande ne correspond pas à l'engagement");
      }
    }
  }

  private mapUpdateKeyToColumn(key: keyof UpdateBonCommandeDto): string {
    const map: Record<keyof UpdateBonCommandeDto, string> = {
      dateCommande: 'date_commande',
      fournisseurId: 'fournisseur_id',
      engagementId: 'engagement_id',
      ligneBudgetaireId: 'ligne_budgetaire_id',
      projetId: 'projet_id',
      objet: 'objet',
      montant: 'montant',
      statut: 'statut',
      dateValidation: 'date_validation',
      dateLivraisonPrevue: 'date_livraison_prevue',
      dateLivraisonReelle: 'date_livraison_reelle',
      conditionsLivraison: 'conditions_livraison',
      observations: 'observations'
    };

    return map[key];
  }

  private normalizeUpdateValue(key: keyof UpdateBonCommandeDto, value: unknown): unknown {
    if (typeof value !== 'string') {
      return value;
    }

    if (
      [
        'engagementId',
        'ligneBudgetaireId',
        'projetId',
        'dateValidation',
        'dateLivraisonPrevue',
        'dateLivraisonReelle',
        'conditionsLivraison',
        'observations'
      ].includes(key)
    ) {
      return value.trim() ? value.trim() : null;
    }

    return value;
  }

  private baseSelect(): string {
    return `
      SELECT
        bc.*,
        f.nom AS fournisseur_nom,
        f.code AS fournisseur_code,
        e.numero AS engagement_numero,
        lb.libelle AS ligne_budgetaire_libelle,
        p.nom AS projet_nom,
        COALESCE(fact.total_montant_facture, 0) AS montant_facture,
        COALESCE(ec.count, 0) AS ecritures_count
      FROM public.bons_commande bc
      LEFT JOIN public.fournisseurs f ON f.id = bc.fournisseur_id
      LEFT JOIN public.engagements e ON e.id = bc.engagement_id
      LEFT JOIN public.lignes_budgetaires lb ON lb.id = bc.ligne_budgetaire_id
      LEFT JOIN public.projets p ON p.id = bc.projet_id
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(fa.montant_ttc), 0) AS total_montant_facture
        FROM public.factures fa
        WHERE fa.bon_commande_id = bc.id
          AND fa.statut != 'annulee'
      ) fact ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::bigint AS count
        FROM public.ecritures_comptables ec
        WHERE ec.bon_commande_id = bc.id
      ) ec ON true
    `;
  }

  private mapRowToView(row: BonCommandeRow): BonCommandeView {
    return {
      id: row.id,
      clientId: row.client_id,
      exerciceId: row.exercice_id,
      numero: row.numero,
      dateCommande: this.toDateOnly(row.date_commande),
      fournisseurId: row.fournisseur_id,
      engagementId: row.engagement_id ?? undefined,
      ligneBudgetaireId: row.ligne_budgetaire_id ?? undefined,
      projetId: row.projet_id ?? undefined,
      objet: row.objet,
      montant: Number(row.montant ?? 0),
      statut: row.statut,
      dateValidation: row.date_validation ? this.toDateOnly(row.date_validation) : undefined,
      dateLivraisonPrevue: row.date_livraison_prevue ? this.toDateOnly(row.date_livraison_prevue) : undefined,
      dateLivraisonReelle: row.date_livraison_reelle ? this.toDateOnly(row.date_livraison_reelle) : undefined,
      conditionsLivraison: row.conditions_livraison ?? undefined,
      observations: row.observations ?? undefined,
      createdAt: this.toIsoString(row.created_at),
      updatedAt: this.toIsoString(row.updated_at),
      createdBy: row.created_by ?? undefined,
      ecrituresCount: Number(row.ecritures_count ?? 0),
      montantFacture: Number(row.montant_facture ?? 0),
      fournisseur:
        row.fournisseur_nom && row.fournisseur_code
          ? {
              id: row.fournisseur_id,
              nom: row.fournisseur_nom,
              code: row.fournisseur_code
            }
          : undefined,
      engagement:
        row.engagement_id && row.engagement_numero
          ? {
              id: row.engagement_id,
              numero: row.engagement_numero
            }
          : undefined,
      ligneBudgetaire:
        row.ligne_budgetaire_id && row.ligne_budgetaire_libelle
          ? {
              id: row.ligne_budgetaire_id,
              libelle: row.ligne_budgetaire_libelle
            }
          : undefined,
      projet:
        row.projet_id && row.projet_nom
          ? {
              id: row.projet_id,
              nom: row.projet_nom
            }
          : undefined
    };
  }

  private toDateOnly(value: Date | string): string {
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }

    return value.slice(0, 10);
  }

  private toIsoString(value: Date | string): string {
    if (value instanceof Date) {
      return value.toISOString();
    }

    return value;
  }
}
