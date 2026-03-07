import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PostgresService } from '../common/postgres.service';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CashRiskService } from '../cash-risk/cash-risk.service';
import type {
  CreateEngagementDto,
  CreateEngagementFromReservationDto,
  UpdateEngagementDto
} from './dto/engagements.dto';
import {
  EngagementStatus,
  ReservationStatus,
  assertEngagementTransitionAllowed,
  assertReservationTransitionAllowed
} from '../common/domain/reservation-engagement-rules';

interface EngagementRow {
  id: string;
  numero: string;
  exercice_id: string;
  client_id: string;
  reservation_credit_id: string | null;
  ligne_budgetaire_id: string;
  objet: string;
  montant: string | number;
  fournisseur_id: string | null;
  beneficiaire: string | null;
  projet_id: string | null;
  statut: EngagementStatus;
  date_creation: Date | string;
  date_validation: Date | string | null;
  created_by: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  motif_annulation: string | null;
  observations: string | null;
  ligne_budgetaire_libelle: string | null;
  ligne_budgetaire_disponible: string | number | null;
  fournisseur_nom: string | null;
  fournisseur_code: string | null;
  projet_code: string | null;
  projet_nom: string | null;
  reservation_numero: string | null;
  reservation_statut: string | null;
  montant_bons_commande: string | number;
  ecritures_count: string | number;
}

interface EcritureRow {
  id: string;
  client_id: string;
  exercice_id: string;
  numero_piece: string;
  numero_ligne: number;
  compte_debit_id: string;
  compte_credit_id: string;
  montant: string | number;
  libelle: string;
  type_operation: string;
  source_id: string;
  regle_comptable_id: string | null;
  engagement_id: string | null;
  reservation_id: string | null;
  bon_commande_id: string | null;
  facture_id: string | null;
  depense_id: string | null;
  paiement_id: string | null;
}

interface EngagementView {
  id: string;
  numero: string;
  exerciceId: string;
  clientId: string;
  reservationCreditId?: string;
  ligneBudgetaireId: string;
  objet: string;
  montant: number;
  fournisseurId?: string;
  beneficiaire?: string;
  projetId?: string;
  statut: EngagementStatus;
  dateCreation: string;
  dateValidation?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  motifAnnulation?: string;
  observations?: string;
  solde?: number;
  ecrituresCount?: number;
  ligneBudgetaire?: {
    libelle: string;
    disponible: number;
  };
  fournisseur?: {
    nom: string;
    code: string;
  };
  projet?: {
    code: string;
    nom: string;
  };
  reservationCredit?: {
    numero: string;
    statut: string;
  };
}

@Injectable()
export class EngagementsService {
  constructor(
    private readonly postgresService: PostgresService,
    private readonly cashRiskService: CashRiskService
  ) {}

  async getAll(actor: AuthenticatedUser, exerciceId: string): Promise<EngagementView[]> {
    const result = await this.postgresService.query<EngagementRow>(
      this.baseSelect() +
        `
          WHERE e.client_id = $1
            AND e.exercice_id = $2
          ORDER BY e.created_at DESC
        `,
      [actor.tenantId, exerciceId]
    );

    return result.rows.map((row) => this.mapRowToView(row));
  }

  async getById(actor: AuthenticatedUser, id: string): Promise<EngagementView> {
    const result = await this.postgresService.query<EngagementRow>(
      this.baseSelect() +
        `
          WHERE e.client_id = $1
            AND e.id = $2
          LIMIT 1
        `,
      [actor.tenantId, id]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException('Engagement introuvable');
    }

    return this.mapRowToView(row);
  }

  async getMontantDisponibleReservation(actor: AuthenticatedUser, reservationId: string): Promise<number> {
    const reservationResult = await this.postgresService.query<{ montant: string | number }>(
      `
        SELECT montant
        FROM public.reservations_credits
        WHERE id = $1
          AND client_id = $2
        LIMIT 1
      `,
      [reservationId, actor.tenantId]
    );

    const reservation = reservationResult.rows[0];
    if (!reservation) {
      throw new NotFoundException('Réservation introuvable');
    }

    const engagementsResult = await this.postgresService.query<{ montant: string | number }>(
      `
        SELECT montant
        FROM public.engagements
        WHERE reservation_credit_id = $1
          AND client_id = $2
          AND statut != 'annule'
      `,
      [reservationId, actor.tenantId]
    );

    const montantEngage = engagementsResult.rows.reduce((sum, row) => sum + Number(row.montant ?? 0), 0);
    return Number(reservation.montant ?? 0) - montantEngage;
  }

  async create(actor: AuthenticatedUser, payload: CreateEngagementDto): Promise<EngagementView> {
    await this.assertLigneBudgetaireInScope(actor.tenantId, payload.exerciceId, payload.ligneBudgetaireId);
    if (payload.projetId) {
      await this.assertProjetInScope(actor.tenantId, payload.exerciceId, payload.projetId);
    }
    return this.createInternal(actor, payload);
  }

  async createFromReservation(actor: AuthenticatedUser, payload: CreateEngagementFromReservationDto): Promise<EngagementView> {
    const reservationResult = await this.postgresService.query<{
      id: string;
      client_id: string;
      exercice_id: string;
      ligne_budgetaire_id: string;
      montant: string | number;
      objet: string;
      beneficiaire: string | null;
      projet_id: string | null;
      statut: ReservationStatus;
    }>(
      `
        SELECT
          id,
          client_id,
          exercice_id,
          ligne_budgetaire_id,
          montant,
          objet,
          beneficiaire,
          projet_id,
          statut
        FROM public.reservations_credits
        WHERE id = $1
          AND client_id = $2
        LIMIT 1
      `,
      [payload.reservationId, actor.tenantId]
    );

    const reservation = reservationResult.rows[0];
    if (!reservation) {
      throw new NotFoundException('Réservation introuvable');
    }

    if (reservation.exercice_id !== payload.exerciceId) {
      throw new BadRequestException('La réservation ne correspond pas à l’exercice demandé.');
    }

    assertReservationTransitionAllowed('create-engagement', reservation.statut);

    if (payload.ligneBudgetaireId && payload.ligneBudgetaireId !== reservation.ligne_budgetaire_id) {
      throw new BadRequestException(
        "La ligne budgétaire d'un engagement issu d'une réservation doit correspondre à la ligne de la réservation."
      );
    }

    const montantDisponible = await this.getMontantDisponibleReservation(actor, payload.reservationId);
    const montant = payload.montant !== undefined ? payload.montant : montantDisponible;

    if (montantDisponible <= 0) {
      throw new BadRequestException('La réservation est entièrement consommée: aucun montant disponible pour un engagement.');
    }

    if (montant > montantDisponible) {
      throw new BadRequestException(
        `Le montant de l'engagement (${montant.toLocaleString()} FCFA) dépasse le montant disponible de la réservation (${montantDisponible.toLocaleString()} FCFA)`
      );
    }

    const created = await this.createInternal(actor, {
      exerciceId: payload.exerciceId,
      reservationCreditId: payload.reservationId,
      ligneBudgetaireId: payload.ligneBudgetaireId || reservation.ligne_budgetaire_id,
      objet: payload.objet || reservation.objet,
      montant,
      fournisseurId: payload.fournisseurId,
      beneficiaire: payload.beneficiaire !== undefined ? payload.beneficiaire : reservation.beneficiaire || undefined,
      projetId: payload.projetId !== undefined ? payload.projetId : reservation.projet_id || undefined,
      observations: payload.observations
    });

    await this.syncReservationStatusFromEngagement(actor, payload.reservationId);

    return created;
  }

  async update(actor: AuthenticatedUser, id: string, payload: UpdateEngagementDto): Promise<EngagementView> {
    const engagement = await this.getById(actor, id);
    assertEngagementTransitionAllowed('update', engagement.statut);

    const ecritures = await this.postgresService.query<{ id: string }>(
      `
        SELECT id
        FROM public.ecritures_comptables
        WHERE engagement_id = $1
          AND statut_ecriture = 'validee'
        LIMIT 1
      `,
      [id]
    );

    if (ecritures.rows.length > 0) {
      throw new BadRequestException(
        '❌ Modification impossible : Cette opération a été comptabilisée.\n\n' +
          '💡 Pour effectuer une correction :\n' +
          "1. Annulez cet engagement (génère des écritures d'annulation)\n" +
          '2. Créez un nouvel engagement avec les bonnes valeurs'
      );
    }

    const keys = Object.keys(payload) as Array<keyof UpdateEngagementDto>;
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

    if (setClauses.length === 0) {
      return this.getById(actor, id);
    }

    if (payload.ligneBudgetaireId) {
      await this.assertLigneBudgetaireInScope(actor.tenantId, engagement.exerciceId, payload.ligneBudgetaireId);
    }

    if (payload.projetId !== undefined && payload.projetId !== null) {
      await this.assertProjetInScope(actor.tenantId, engagement.exerciceId, payload.projetId);
    }

    setClauses.push('updated_at = now()');
    values.push(id, actor.tenantId);

    const result = await this.postgresService.query(
      `
        UPDATE public.engagements
        SET ${setClauses.join(', ')}
        WHERE id = $${index}
          AND client_id = $${index + 1}
      `,
      values
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new NotFoundException('Engagement introuvable');
    }

    await this.syncReservationStatusFromEngagement(actor, engagement.reservationCreditId);
    return this.getById(actor, id);
  }

  async valider(actor: AuthenticatedUser, id: string): Promise<EngagementView> {
    const engagement = await this.getById(actor, id);
    assertEngagementTransitionAllowed('valider', engagement.statut);
    await this.cashRiskService.assertAllowed(actor, {
      exerciceId: engagement.exerciceId,
      transition: 'engagement:validate',
      sourceType: 'engagement',
      sourceId: engagement.id,
      entityId: engagement.ligneBudgetaireId,
      amount: engagement.montant
    });

    const result = await this.postgresService.query(
      `
        UPDATE public.engagements
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
      throw new NotFoundException('Engagement introuvable');
    }

    const validatedEngagement = await this.getById(actor, id);
    await this.generateEcrituresForEngagement(actor, validatedEngagement);
    return validatedEngagement;
  }

  async annuler(actor: AuthenticatedUser, id: string, motifAnnulation: string): Promise<EngagementView> {
    const engagement = await this.getById(actor, id);
    assertEngagementTransitionAllowed('annuler', engagement.statut);

    const bonsCommande = await this.postgresService.query<{ numero: string }>(
      `
        SELECT numero
        FROM public.bons_commande
        WHERE engagement_id = $1
      `,
      [id]
    );

    if (bonsCommande.rows.length > 0) {
      throw new BadRequestException(
        `Impossible d'annuler cet engagement : ${bonsCommande.rows.length} bon(s) de commande y sont liés. ` +
          `Veuillez d'abord supprimer ou dissocier les BC suivants : ${bonsCommande.rows.map((bc) => bc.numero).join(', ')}`
      );
    }

    const ecritures = await this.postgresService.query<EcritureRow>(
      `
        SELECT
          id,
          client_id,
          exercice_id,
          numero_piece,
          numero_ligne,
          compte_debit_id,
          compte_credit_id,
          montant,
          libelle,
          type_operation,
          source_id,
          regle_comptable_id,
          engagement_id,
          reservation_id,
          bon_commande_id,
          facture_id,
          depense_id,
          paiement_id
        FROM public.ecritures_comptables
        WHERE engagement_id = $1
          AND statut_ecriture = 'validee'
      `,
      [id]
    );

    if (ecritures.rows.length > 0) {
      await this.createContrepassations(actor, ecritures.rows, motifAnnulation);
    }

    const result = await this.postgresService.query(
      `
        UPDATE public.engagements
        SET
          statut = 'annule',
          motif_annulation = $1,
          updated_at = now()
        WHERE id = $2
          AND client_id = $3
      `,
      [motifAnnulation, id, actor.tenantId]
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new NotFoundException('Engagement introuvable');
    }

    await this.syncReservationStatusFromEngagement(actor, engagement.reservationCreditId);
    return this.getById(actor, id);
  }

  async delete(actor: AuthenticatedUser, id: string): Promise<void> {
    const engagement = await this.getById(actor, id);

    const bonsCommande = await this.postgresService.query<{ numero: string }>(
      `
        SELECT numero
        FROM public.bons_commande
        WHERE engagement_id = $1
      `,
      [id]
    );

    if (bonsCommande.rows.length > 0) {
      throw new BadRequestException(
        `Impossible de supprimer cet engagement : ${bonsCommande.rows.length} bon(s) de commande y sont liés. ` +
          `Veuillez d'abord supprimer ou dissocier les BC suivants : ${bonsCommande.rows.map((bc) => bc.numero).join(', ')}`
      );
    }

    if (engagement.statut !== 'brouillon') {
      throw new BadRequestException(
        '❌ Suppression impossible\n\n💡 Utilisez l\'annulation au lieu de la suppression pour conserver l\'historique comptable'
      );
    }

    const result = await this.postgresService.query(
      `
        DELETE FROM public.engagements
        WHERE id = $1
          AND client_id = $2
      `,
      [id, actor.tenantId]
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new NotFoundException('Engagement introuvable');
    }

    await this.syncReservationStatusFromEngagement(actor, engagement.reservationCreditId);
  }

  private async syncReservationStatusFromEngagement(
    actor: AuthenticatedUser,
    reservationId: string | undefined
  ): Promise<void> {
    if (!reservationId) {
      return;
    }

    const reservationResult = await this.postgresService.query<{ statut: ReservationStatus }>(
      `
        SELECT statut
        FROM public.reservations_credits
        WHERE id = $1
          AND client_id = $2
        LIMIT 1
      `,
      [reservationId, actor.tenantId]
    );

    const reservation = reservationResult.rows[0];
    if (!reservation || reservation.statut === 'annulee' || reservation.statut === 'expiree') {
      return;
    }

    const montantRestant = await this.getMontantDisponibleReservation(actor, reservationId);
    await this.postgresService.query(
      `
        UPDATE public.reservations_credits
        SET
          statut = $1,
          updated_at = now()
        WHERE id = $2
          AND client_id = $3
      `,
      [montantRestant <= 0 ? 'utilisee' : 'active', reservationId, actor.tenantId]
    );
  }

  private async createInternal(actor: AuthenticatedUser, payload: CreateEngagementDto): Promise<EngagementView> {
    await this.cashRiskService.assertAllowed(actor, {
      exerciceId: payload.exerciceId,
      transition: 'engagement:create',
      sourceType: 'engagement',
      sourceId: payload.reservationCreditId,
      entityId: payload.ligneBudgetaireId,
      amount: payload.montant
    });

    const exerciceResult = await this.postgresService.query<{ code: string }>(
      `
        SELECT code
        FROM public.exercices
        WHERE id = $1
        LIMIT 1
      `,
      [payload.exerciceId]
    );

    const exerciceCode = exerciceResult.rows[0]?.code;
    if (!exerciceCode) {
      throw new NotFoundException('Exercice introuvable');
    }

    if (payload.projetId) {
      await this.assertProjetInScope(actor.tenantId, payload.exerciceId, payload.projetId);
    }

    const numero = await this.generateNextNumero(actor.tenantId, payload.exerciceId, exerciceCode);

    const inserted = await this.postgresService.query<{ id: string }>(
      `
        INSERT INTO public.engagements (
          numero,
          exercice_id,
          client_id,
          reservation_credit_id,
          ligne_budgetaire_id,
          objet,
          montant,
          fournisseur_id,
          beneficiaire,
          projet_id,
          statut,
          date_creation,
          created_by,
          observations
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
          CURRENT_DATE,
          $11,
          $12
        )
        RETURNING id
      `,
      [
        numero,
        payload.exerciceId,
        actor.tenantId,
        payload.reservationCreditId ?? null,
        payload.ligneBudgetaireId,
        payload.objet,
        payload.montant,
        payload.fournisseurId ?? null,
        payload.beneficiaire?.trim() || null,
        payload.projetId ?? null,
        actor.sub,
        payload.observations?.trim() || null
      ]
    );

    const id = inserted.rows[0]?.id;
    if (!id) {
      throw new NotFoundException('Engagement non créé');
    }

    const created = await this.getById(actor, id);
    await this.generateEcrituresForEngagement(actor, created);
    return created;
  }

  private async generateNextNumero(clientId: string, exerciceId: string, exerciceCode: string): Promise<string> {
    const pattern = `ENG/${exerciceCode}/%`;

    const result = await this.postgresService.query<{ numero: string | null }>(
      `
        SELECT numero
        FROM public.engagements
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

    return `ENG/${exerciceCode}/${String(nextNumber).padStart(3, '0')}`;
  }

  private async createContrepassations(actor: AuthenticatedUser, entries: EcritureRow[], motif: string): Promise<void> {
    for (const entry of entries) {
      await this.postgresService.query(
        `
          INSERT INTO public.ecritures_comptables (
            client_id,
            exercice_id,
            numero_piece,
            numero_ligne,
            date_ecriture,
            compte_debit_id,
            compte_credit_id,
            montant,
            libelle,
            type_operation,
            source_id,
            regle_comptable_id,
            statut_ecriture,
            ecriture_origine_id,
            created_by,
            engagement_id,
            reservation_id,
            bon_commande_id,
            facture_id,
            depense_id,
            paiement_id
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            CURRENT_DATE,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11,
            'contrepassation',
            $12,
            $13,
            $14,
            $15,
            $16,
            $17,
            $18,
            $19
          )
        `,
        [
          entry.client_id,
          entry.exercice_id,
          entry.numero_piece,
          entry.numero_ligne + 1000,
          entry.compte_credit_id,
          entry.compte_debit_id,
          entry.montant,
          `Annulation: ${entry.libelle} - ${motif}`,
          entry.type_operation,
          entry.source_id,
          entry.regle_comptable_id,
          entry.id,
          actor.sub,
          entry.engagement_id,
          entry.reservation_id,
          entry.bon_commande_id,
          entry.facture_id,
          entry.depense_id,
          entry.paiement_id
        ]
      );
    }
  }

  private async generateEcrituresForEngagement(actor: AuthenticatedUser, engagement: EngagementView): Promise<void> {
    const operationDataResult = await this.postgresService.query<Record<string, unknown>>(
      `
        SELECT *
        FROM public.engagements
        WHERE id = $1
          AND client_id = $2
        LIMIT 1
      `,
      [engagement.id, actor.tenantId]
    );

    const operationData = operationDataResult.rows[0];
    if (!operationData) {
      return;
    }

    await this.postgresService.query(
      `
        SELECT public.generate_ecritures_comptables(
          $1,
          $2::uuid,
          $3,
          $4::uuid,
          $5,
          $6::date,
          $7,
          $8::jsonb,
          $9::uuid
        )
      `,
      [
        engagement.clientId,
        engagement.exerciceId,
        'engagement',
        engagement.id,
        engagement.numero,
        engagement.dateCreation,
        engagement.montant,
        JSON.stringify(operationData),
        actor.sub
      ]
    );
  }

  private mapUpdateKeyToColumn(key: keyof UpdateEngagementDto): string {
    const map: Record<keyof UpdateEngagementDto, string> = {
      reservationCreditId: 'reservation_credit_id',
      ligneBudgetaireId: 'ligne_budgetaire_id',
      objet: 'objet',
      montant: 'montant',
      fournisseurId: 'fournisseur_id',
      beneficiaire: 'beneficiaire',
      projetId: 'projet_id',
      observations: 'observations'
    };

    return map[key];
  }

  private async assertLigneBudgetaireInScope(tenantId: string, exerciceId: string, ligneBudgetaireId: string): Promise<void> {
    const result = await this.postgresService.query<{ id: string }>(
      `
        SELECT id
        FROM public.lignes_budgetaires
        WHERE id = $1
          AND client_id = $2
          AND exercice_id = $3
          AND statut = 'actif'
        LIMIT 1
      `,
      [ligneBudgetaireId, tenantId, exerciceId]
    );

    if (!result.rows[0]) {
      throw new BadRequestException(
        "Ligne budgétaire invalide pour le tenant/exercice actif ou non disponible (statut attendu: 'actif')."
      );
    }
  }

  private async assertProjetInScope(tenantId: string, exerciceId: string, projetId: string): Promise<void> {
    const result = await this.postgresService.query<{ id: string }>(
      `
        SELECT id
        FROM public.projets
        WHERE id = $1
          AND client_id = $2
          AND exercice_id = $3
        LIMIT 1
      `,
      [projetId, tenantId, exerciceId]
    );

    if (!result.rows[0]) {
      throw new BadRequestException('Projet invalide pour le tenant/exercice actif.');
    }
  }

  private baseSelect(): string {
    return `
      SELECT
        e.*,
        lb.libelle AS ligne_budgetaire_libelle,
        lb.disponible AS ligne_budgetaire_disponible,
        f.nom AS fournisseur_nom,
        f.code AS fournisseur_code,
        p.code AS projet_code,
        p.nom AS projet_nom,
        rc.numero AS reservation_numero,
        rc.statut AS reservation_statut,
        COALESCE(bc.total_montant, 0) AS montant_bons_commande,
        COALESCE(ec.cnt, 0) AS ecritures_count
      FROM public.engagements e
      LEFT JOIN public.lignes_budgetaires lb ON lb.id = e.ligne_budgetaire_id
      LEFT JOIN public.fournisseurs f ON f.id = e.fournisseur_id
      LEFT JOIN public.projets p ON p.id = e.projet_id
      LEFT JOIN public.reservations_credits rc ON rc.id = e.reservation_credit_id
      LEFT JOIN (
        SELECT engagement_id, SUM(montant) AS total_montant
        FROM public.bons_commande
        GROUP BY engagement_id
      ) bc ON bc.engagement_id = e.id
      LEFT JOIN (
        SELECT engagement_id, COUNT(*) AS cnt
        FROM public.ecritures_comptables
        GROUP BY engagement_id
      ) ec ON ec.engagement_id = e.id
    `;
  }

  private mapRowToView(row: EngagementRow): EngagementView {
    const montant = Number(row.montant ?? 0);
    const montantBonsCommande = Number(row.montant_bons_commande ?? 0);

    return {
      id: row.id,
      numero: row.numero,
      exerciceId: row.exercice_id,
      clientId: row.client_id,
      reservationCreditId: row.reservation_credit_id ?? undefined,
      ligneBudgetaireId: row.ligne_budgetaire_id,
      objet: row.objet,
      montant,
      fournisseurId: row.fournisseur_id ?? undefined,
      beneficiaire: row.beneficiaire ?? undefined,
      projetId: row.projet_id ?? undefined,
      statut: row.statut,
      dateCreation: this.toDateOnly(row.date_creation),
      dateValidation: row.date_validation ? this.toDateOnly(row.date_validation) : undefined,
      createdBy: row.created_by ?? undefined,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      motifAnnulation: row.motif_annulation ?? undefined,
      observations: row.observations ?? undefined,
      solde: montant - montantBonsCommande,
      ecrituresCount: Number(row.ecritures_count ?? 0),
      ligneBudgetaire:
        row.ligne_budgetaire_libelle && row.ligne_budgetaire_disponible !== null
          ? {
              libelle: row.ligne_budgetaire_libelle,
              disponible: Number(row.ligne_budgetaire_disponible)
            }
          : undefined,
      fournisseur:
        row.fournisseur_nom && row.fournisseur_code
          ? {
              nom: row.fournisseur_nom,
              code: row.fournisseur_code
            }
          : undefined,
      projet:
        row.projet_code && row.projet_nom
          ? {
              code: row.projet_code,
              nom: row.projet_nom
            }
          : undefined,
      reservationCredit:
        row.reservation_numero && row.reservation_statut
          ? {
              numero: row.reservation_numero,
              statut: row.reservation_statut
            }
          : undefined
    };
  }

  private toDateOnly(value: Date | string): string {
    if (typeof value === 'string') {
      return value.slice(0, 10);
    }

    return value.toISOString().slice(0, 10);
  }
}
