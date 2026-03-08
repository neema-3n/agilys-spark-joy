import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PostgresService } from '../common/postgres.service';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { EcrituresComptablesService } from '../ecritures-comptables/ecritures-comptables.service';
import { WorkflowExceptionsService } from '../workflow-exceptions/workflow-exceptions.service';
import { type DepenseWorkflowStatus, type PaiementMode } from '../paiements/paiement-workflow';
import type {
  CreateDepenseDto,
  CreateDepenseFromEngagementDto,
  CreateDepenseFromFactureDto,
  CreateDepenseFromReservationDto,
  MarquerPayeeDto,
  UpdateDepenseDto
} from './dto/depenses.dto';

interface DepenseRow {
  id: string;
  client_id: string;
  exercice_id: string;
  numero: string;
  date_depense: Date | string;
  objet: string;
  montant: string | number;
  montant_paye: string | number;
  engagement_id: string | null;
  reservation_credit_id: string | null;
  ligne_budgetaire_id: string | null;
  facture_id: string | null;
  facture_ids: string[] | null;
  fournisseur_id: string | null;
  beneficiaire: string | null;
  projet_id: string | null;
  statut: DepenseWorkflowStatus;
  date_validation: Date | string | null;
  date_ordonnancement: Date | string | null;
  date_paiement: Date | string | null;
  mode_paiement: PaiementMode | null;
  reference_paiement: string | null;
  observations: string | null;
  motif_annulation: string | null;
  motif_rejet: string | null;
  date_rejet: Date | string | null;
  created_by: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  engagement_numero: string | null;
  engagement_montant: string | number | null;
  reservation_numero: string | null;
  reservation_montant: string | number | null;
  reservation_statut: string | null;
  ligne_budgetaire_libelle: string | null;
  ligne_budgetaire_disponible: string | number | null;
  facture_numero: string | null;
  facture_montant_ttc: string | number | null;
  facture_statut: string | null;
  fournisseur_nom: string | null;
  fournisseur_code: string | null;
  projet_code: string | null;
  projet_nom: string | null;
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

interface PaiementValideRow {
  id: string;
  numero: string;
  montant: string | number;
  date_paiement: Date | string;
  mode_paiement: PaiementMode;
  depense_id?: string;
  depense_numero?: string;
  depense_objet?: string;
}

interface DepenseView {
  id: string;
  clientId: string;
  exerciceId: string;
  numero: string;
  dateDepense: string;
  objet: string;
  montant: number;
  montantPaye: number;
  engagementId?: string;
  reservationCreditId?: string;
  ligneBudgetaireId?: string;
  factureId?: string;
  factureIds?: string[];
  fournisseurId?: string;
  beneficiaire?: string;
  projetId?: string;
  statut: DepenseWorkflowStatus;
  dateValidation?: string;
  dateOrdonnancement?: string;
  datePaiement?: string;
  modePaiement?: PaiementMode;
  referencePaiement?: string;
  observations?: string;
  motifAnnulation?: string;
  motifRejet?: string;
  dateRejet?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  ecrituresCount?: number;
  engagement?: {
    id: string;
    numero: string;
    montant: number;
  };
  reservationCredit?: {
    id: string;
    numero: string;
    montant: number;
    statut: string;
  };
  ligneBudgetaire?: {
    id: string;
    libelle: string;
    disponible: number;
  };
  facture?: {
    id: string;
    numero: string;
    montantTTC: number;
    statut: string;
  };
  fournisseur?: {
    id: string;
    nom: string;
    code: string;
  };
  projet?: {
    id: string;
    code: string;
    nom: string;
  };
}

interface FactureForDepenseRow {
  id: string;
  client_id: string;
  exercice_id: string;
  numero: string;
  objet: string;
  montant_ttc: string | number;
  statut: string;
  fournisseur_id: string | null;
  engagement_id: string | null;
  ligne_budgetaire_id: string | null;
  projet_id: string | null;
}

interface FactureAllocation {
  factureId: string;
  montant: number;
}

@Injectable()
export class DepensesService {
  constructor(
    private readonly postgresService: PostgresService,
    private readonly workflowExceptionsService: WorkflowExceptionsService,
    private readonly ecrituresComptablesService: EcrituresComptablesService
  ) {}

  async getAll(actor: AuthenticatedUser, exerciceId: string): Promise<DepenseView[]> {
    const result = await this.postgresService.query<DepenseRow>(
      this.baseSelect() +
        `
          WHERE d.client_id = $1
            AND d.exercice_id = $2
          ORDER BY d.date_depense DESC, d.created_at DESC
        `,
      [actor.tenantId, exerciceId]
    );

    return result.rows.map((row) => this.mapRowToView(row));
  }

  async getById(actor: AuthenticatedUser, id: string): Promise<DepenseView> {
    const result = await this.postgresService.query<DepenseRow>(
      this.baseSelect() +
        `
          WHERE d.client_id = $1
            AND d.id = $2
          LIMIT 1
        `,
      [actor.tenantId, id]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException('Dépense introuvable');
    }

    return this.mapRowToView(row);
  }

  async create(actor: AuthenticatedUser, payload: CreateDepenseDto): Promise<DepenseView> {
    return this.createInternal(actor, payload);
  }

  async createFromFacture(actor: AuthenticatedUser, payload: CreateDepenseFromFactureDto): Promise<DepenseView> {
    const inputFactureIds = payload.factureIds?.length ? payload.factureIds : payload.factureId ? [payload.factureId] : [];
    const factureIds = [...new Set(inputFactureIds)];

    if (factureIds.length < 1) {
      throw new BadRequestException(
        "Sélection invalide: au moins 1 facture validée est requise. Action: sélectionnez une facture puis relancez."
      );
    }

    if (factureIds.length > 20) {
      throw new BadRequestException(
        `Sélection invalide: maximum 20 factures par dépense. Action: réduisez la sélection à 20 (reçu: ${factureIds.length}).`
      );
    }

    const factureResult = await this.postgresService.query<FactureForDepenseRow>(
      `
        SELECT
          id,
          client_id,
          exercice_id,
          numero,
          objet,
          montant_ttc,
          statut,
          fournisseur_id,
          engagement_id,
          ligne_budgetaire_id,
          projet_id
        FROM public.factures
        WHERE id = ANY($1::uuid[])
          AND client_id = $2
          AND exercice_id = $3
      `,
      [factureIds, actor.tenantId, payload.exerciceId]
    );

    if (factureResult.rows.length !== factureIds.length) {
      throw new BadRequestException(
        "Sélection invalide: certaines factures sont introuvables ou hors périmètre tenant/exercice. Action: actualisez la liste et resélectionnez."
      );
    }

    const facturesById = new Map(factureResult.rows.map((facture) => [facture.id, facture]));
    const orderedFactures = factureIds.map((factureId) => {
      const facture = facturesById.get(factureId);
      if (!facture) {
        throw new BadRequestException(`Facture introuvable: ${factureId}`);
      }

      return facture;
    });

    const invalidStatut = orderedFactures.find((facture) => facture.statut !== 'validee');
    if (invalidStatut) {
      throw new BadRequestException(
        `Facture ${invalidStatut.numero} non éligible: statut attendu "validee". Action: validez cette facture avant liquidation.`
      );
    }

    const referenceFacture = orderedFactures[0];

    if (!referenceFacture.engagement_id && !referenceFacture.ligne_budgetaire_id) {
      throw new BadRequestException(
        'La facture doit être liée à un engagement ou une ligne budgétaire pour créer une dépense.'
      );
    }

    for (const facture of orderedFactures) {
      const hasSameEngagement = facture.engagement_id === referenceFacture.engagement_id;
      const hasSameLigne = facture.ligne_budgetaire_id === referenceFacture.ligne_budgetaire_id;
      const hasSameProjet = facture.projet_id === referenceFacture.projet_id;

      if (!hasSameEngagement || !hasSameLigne || !hasSameProjet) {
        throw new BadRequestException(
          `Sélection incohérente: les factures doivent partager les mêmes références engagement/ligne/projet. Action: regroupez uniquement des factures cohérentes.`
        );
      }
    }

    const liquidationsResult = await this.postgresService.query<{ facture_id: string; montant_liquide: string | number }>(
      `
        SELECT
          df.facture_id,
          COALESCE(SUM(df.montant), 0) AS montant_liquide
        FROM public.depense_factures df
        INNER JOIN public.depenses d ON d.id = df.depense_id
        WHERE df.facture_id = ANY($1::uuid[])
          AND d.client_id = $2
          AND d.statut != 'annulee'
        GROUP BY df.facture_id
      `,
      [factureIds, actor.tenantId]
    );

    const liquideParFacture = new Map(liquidationsResult.rows.map((row) => [row.facture_id, Number(row.montant_liquide ?? 0)]));
    const allocations: FactureAllocation[] = orderedFactures.map((facture) => {
      const montantTtc = Number(facture.montant_ttc ?? 0);
      const montantDejaLiquide = liquideParFacture.get(facture.id) ?? 0;
      const soldeDisponible = Number((montantTtc - montantDejaLiquide).toFixed(2));

      if (soldeDisponible <= 0) {
        throw new BadRequestException(
          `Facture ${facture.numero} déjà liquidée. Action: retirez-la de la sélection pour continuer.`
        );
      }

      return {
        factureId: facture.id,
        montant: soldeDisponible
      };
    });

    const montantTotal = allocations.reduce((sum, allocation) => sum + allocation.montant, 0);
    const prefix = orderedFactures.length > 1 ? `${orderedFactures.length} factures` : `facture ${referenceFacture.numero}`;

    return this.createInternal(
      actor,
      {
        exerciceId: payload.exerciceId,
        factureId: referenceFacture.id,
        factureIds: allocations.map((allocation) => allocation.factureId),
        engagementId: referenceFacture.engagement_id ?? undefined,
        ligneBudgetaireId: referenceFacture.ligne_budgetaire_id ?? undefined,
        fournisseurId: referenceFacture.fournisseur_id ?? undefined,
        projetId: referenceFacture.projet_id ?? undefined,
        objet: `Liquidation ${prefix}`,
        montant: Number(montantTotal.toFixed(2)),
        dateDepense: payload.dateDepense,
        modePaiement: payload.modePaiement,
        referencePaiement: payload.referencePaiement,
        observations:
          payload.observations ||
          `Créée depuis ${orderedFactures.length} facture(s): ${orderedFactures.map((facture) => facture.numero).join(', ')}`
      },
      allocations
    );
  }

  async createFromEngagement(actor: AuthenticatedUser, payload: CreateDepenseFromEngagementDto): Promise<DepenseView> {
    const engagementResult = await this.postgresService.query<{
      id: string;
      client_id: string;
      exercice_id: string;
      numero: string;
      objet: string;
      montant: string | number;
      statut: string;
      reservation_credit_id: string | null;
      ligne_budgetaire_id: string | null;
      fournisseur_id: string | null;
      beneficiaire: string | null;
      projet_id: string | null;
    }>(
      `
        SELECT
          id,
          client_id,
          exercice_id,
          numero,
          objet,
          montant,
          statut,
          reservation_credit_id,
          ligne_budgetaire_id,
          fournisseur_id,
          beneficiaire,
          projet_id
        FROM public.engagements
        WHERE id = $1
          AND client_id = $2
        LIMIT 1
      `,
      [payload.engagementId, actor.tenantId]
    );

    const engagement = engagementResult.rows[0];
    if (!engagement) {
      throw new NotFoundException('Engagement introuvable');
    }

    if (engagement.statut !== 'valide') {
      throw new BadRequestException('Seuls les engagements validés peuvent générer une dépense');
    }

    const existing = await this.postgresService.query<{ montant: string | number }>(
      `
        SELECT montant
        FROM public.depenses
        WHERE engagement_id = $1
          AND client_id = $2
          AND statut != 'annulee'
      `,
      [payload.engagementId, actor.tenantId]
    );

    const montantDejaLiquide = existing.rows.reduce((sum, row) => sum + Number(row.montant ?? 0), 0);
    const soldeDisponible = Number(engagement.montant ?? 0) - montantDejaLiquide;

    if (payload.montant > soldeDisponible) {
      throw new BadRequestException(`Montant invalide. Solde disponible : ${soldeDisponible.toFixed(2)} €`);
    }

    return this.createInternal(actor, {
      exerciceId: payload.exerciceId,
      engagementId: payload.engagementId,
      reservationCreditId: engagement.reservation_credit_id ?? undefined,
      ligneBudgetaireId: engagement.ligne_budgetaire_id ?? undefined,
      fournisseurId: engagement.fournisseur_id ?? undefined,
      beneficiaire: engagement.beneficiaire ?? undefined,
      projetId: engagement.projet_id ?? undefined,
      objet: `Liquidation engagement ${engagement.numero} - ${engagement.objet}`,
      montant: payload.montant,
      dateDepense: payload.dateDepense,
      modePaiement: payload.modePaiement,
      referencePaiement: payload.referencePaiement,
      observations: payload.observations || `Créée depuis l'engagement ${engagement.numero}`
    });
  }

  async createFromReservation(actor: AuthenticatedUser, payload: CreateDepenseFromReservationDto): Promise<DepenseView> {
    if (!payload.justificationUrgence || payload.justificationUrgence.trim().length < 10) {
      throw new BadRequestException("Justification d'urgence requise (minimum 10 caractères)");
    }

    const reservationResult = await this.postgresService.query<{
      id: string;
      client_id: string;
      exercice_id: string;
      montant: string | number;
      statut: string;
      ligne_budgetaire_id: string | null;
      beneficiaire: string | null;
      projet_id: string | null;
    }>(
      `
        SELECT
          id,
          client_id,
          exercice_id,
          montant,
          statut,
          ligne_budgetaire_id,
          beneficiaire,
          projet_id
        FROM public.reservations_credits
        WHERE id = $1
          AND client_id = $2
        LIMIT 1
      `,
      [payload.reservationCreditId, actor.tenantId]
    );

    const reservation = reservationResult.rows[0];
    if (!reservation) {
      throw new NotFoundException('Réservation introuvable');
    }

    if (reservation.statut !== 'active') {
      throw new BadRequestException('Seules les réservations actives peuvent générer une dépense');
    }

    const engagementsResult = await this.postgresService.query<{ montant: string | number }>(
      `
        SELECT montant
        FROM public.engagements
        WHERE reservation_credit_id = $1
          AND client_id = $2
          AND statut != 'annule'
      `,
      [payload.reservationCreditId, actor.tenantId]
    );

    const depensesResult = await this.postgresService.query<{ montant: string | number }>(
      `
        SELECT montant
        FROM public.depenses
        WHERE reservation_credit_id = $1
          AND client_id = $2
          AND statut != 'annulee'
      `,
      [payload.reservationCreditId, actor.tenantId]
    );

    const montantEngage = engagementsResult.rows.reduce((sum, row) => sum + Number(row.montant ?? 0), 0);
    const montantDepense = depensesResult.rows.reduce((sum, row) => sum + Number(row.montant ?? 0), 0);
    const soldeDisponible = Number(reservation.montant ?? 0) - montantEngage - montantDepense;

    if (payload.montant > soldeDisponible) {
      throw new BadRequestException(`Montant invalide. Solde disponible : ${soldeDisponible.toFixed(2)} €`);
    }

    const LIMITE_URGENCE = 5000;
    if (payload.montant > LIMITE_URGENCE) {
      throw new BadRequestException(
        `Pour les montants > ${LIMITE_URGENCE}€, veuillez créer un engagement puis une facture`
      );
    }

    return this.createInternal(actor, {
      exerciceId: payload.exerciceId,
      reservationCreditId: payload.reservationCreditId,
      ligneBudgetaireId: reservation.ligne_budgetaire_id ?? undefined,
      beneficiaire: payload.beneficiaire || reservation.beneficiaire || undefined,
      projetId: reservation.projet_id ?? undefined,
      objet: payload.objet,
      montant: payload.montant,
      dateDepense: payload.dateDepense,
      modePaiement: payload.modePaiement,
      referencePaiement: payload.referencePaiement,
      observations: `[URGENCE] ${payload.justificationUrgence}\n\n${payload.observations || ''}`
    });
  }

  async update(actor: AuthenticatedUser, id: string, payload: UpdateDepenseDto): Promise<DepenseView> {
    const current = await this.getById(actor, id);

    const ecritures = await this.postgresService.query<{ id: string }>(
      `
        SELECT id
        FROM public.ecritures_comptables
        WHERE depense_id = $1
          AND statut_ecriture = 'validee'
        LIMIT 1
      `,
      [id]
    );

    if (ecritures.rows.length > 0) {
      throw new BadRequestException(
        '❌ Modification impossible : Cette opération a été comptabilisée.\n\n' +
          '💡 Pour effectuer une correction :\n' +
          "1. Annulez cette dépense (génère des écritures d'annulation)\n" +
          '2. Créez une nouvelle dépense avec les bonnes valeurs'
      );
    }

    const keys = Object.keys(payload) as Array<keyof UpdateDepenseDto>;
    if (keys.length === 0) {
      return current;
    }

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    for (const key of keys) {
      const value = payload[key];
      if (value === undefined) {
        continue;
      }

      const mapped = this.mapUpdateKeyToColumn(key);
      setClauses.push(`${mapped} = $${index}`);
      values.push(value);
      index += 1;
    }

    if (setClauses.length === 0) {
      return current;
    }

    setClauses.push('updated_at = now()');
    values.push(id, actor.tenantId);

    const result = await this.postgresService.query(
      `
        UPDATE public.depenses
        SET ${setClauses.join(', ')}
        WHERE id = $${index}
          AND client_id = $${index + 1}
      `,
      values
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new NotFoundException('Dépense introuvable');
    }

    return this.getById(actor, id);
  }

  async valider(actor: AuthenticatedUser, id: string): Promise<DepenseView> {
    const current = await this.getById(actor, id);

    if (current.statut !== 'brouillon') {
      throw new BadRequestException(
        `Transition invalide: impossible de valider une dépense en statut "${current.statut}". Action: remettez-la en brouillon ou créez une nouvelle dépense.`
      );
    }

    const result = await this.postgresService.query(
      `
        UPDATE public.depenses
        SET
          statut = 'validee',
          date_validation = CURRENT_DATE,
          updated_at = now()
        WHERE id = $1
          AND client_id = $2
      `,
      [id, actor.tenantId]
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new NotFoundException('Dépense introuvable');
    }

    const depense = await this.getById(actor, id);
    await this.generateEcrituresForDepense(actor, depense);
    return depense;
  }

  async ordonnancer(actor: AuthenticatedUser, id: string): Promise<DepenseView> {
    const current = await this.getById(actor, id);

    if (current.statut !== 'validee') {
      throw new BadRequestException(
        `Transition invalide: impossible d'ordonnancer une dépense en statut "${current.statut}". Action: validez la dépense avant ordonnancement.`
      );
    }

    await this.workflowExceptionsService.assertTransitionAllowed(actor, {
      exerciceId: current.exerciceId,
      transition: 'depense:ordonnancer',
      sourceType: 'depense',
      sourceId: current.id,
      entityId: current.id,
      amount: current.montant,
    });

    const result = await this.postgresService.query(
      `
        UPDATE public.depenses
        SET
          statut = 'ordonnancee',
          date_ordonnancement = CURRENT_DATE,
          updated_at = now()
        WHERE id = $1
          AND client_id = $2
      `,
      [id, actor.tenantId]
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new NotFoundException('Dépense introuvable');
    }

    const depense = await this.getById(actor, id);
    await this.generateEcrituresForDepense(actor, depense);
    return depense;
  }

  async marquerPayee(actor: AuthenticatedUser, id: string, payload: MarquerPayeeDto): Promise<DepenseView> {
    void actor;
    void id;
    void payload;

    throw new BadRequestException(
      "Action obsolète: utilisez le workflow /paiements pour enregistrer un paiement, gérer les cas partiels, rejets et annulations."
    );
  }

  async annuler(actor: AuthenticatedUser, id: string, motif: string): Promise<DepenseView> {
    const current = await this.getById(actor, id);

    if (current.statut === 'annulee') {
      throw new BadRequestException("Transition invalide: cette dépense est déjà annulée.");
    }

    if (current.statut === 'payee' || current.statut === 'partiellement_payee') {
      throw new BadRequestException(
        "Transition invalide: une dépense avec paiement actif ne peut pas être annulée directement. Action: annulez ou rejetez d'abord les paiements liés."
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
        WHERE depense_id = $1
          AND statut_ecriture = 'validee'
      `,
      [id]
    );

    if (ecritures.rows.length > 0) {
      await this.createContrepassations(actor, ecritures.rows, motif);
    }

    const result = await this.postgresService.query(
      `
        UPDATE public.depenses
        SET
          statut = 'annulee',
          motif_annulation = $1,
          updated_at = now()
        WHERE id = $2
          AND client_id = $3
      `,
      [motif, id, actor.tenantId]
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new NotFoundException('Dépense introuvable');
    }

    const updated = await this.getById(actor, id);
    await this.recalculateFacturesMontantLiquide(actor.tenantId, updated.factureIds ?? []);
    return updated;
  }

  async delete(actor: AuthenticatedUser, id: string): Promise<void> {
    const depense = await this.getById(actor, id);

    if (depense.statut !== 'brouillon') {
      throw new BadRequestException(
        '❌ Suppression impossible\n\n💡 Utilisez l\'annulation au lieu de la suppression pour conserver l\'historique comptable'
      );
    }

    const result = await this.postgresService.query(
      `
        DELETE FROM public.depenses
        WHERE id = $1
          AND client_id = $2
      `,
      [id, actor.tenantId]
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new NotFoundException('Dépense introuvable');
    }
  }

  async getPaiementsValides(actor: AuthenticatedUser, depenseId: string): Promise<Array<{
    id: string;
    numero: string;
    montant: number;
    datePaiement: string;
    modePaiement: string;
  }>> {
    const result = await this.postgresService.query<PaiementValideRow>(
      `
        SELECT id, numero, montant, date_paiement, mode_paiement
        FROM public.paiements
        WHERE client_id = $1
          AND depense_id = $2
          AND statut IN ('execute', 'reconcilie', 'valide')
        ORDER BY date_paiement DESC
      `,
      [actor.tenantId, depenseId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      numero: row.numero,
      montant: Number(row.montant ?? 0),
      datePaiement: this.toDateOnly(row.date_paiement),
      modePaiement: row.mode_paiement
    }));
  }

  async getPaiementsValidesMultiple(actor: AuthenticatedUser, depenseIds: string[]): Promise<Array<{
    id: string;
    numero: string;
    montant: number;
    datePaiement: string;
    modePaiement: string;
    depenseId: string;
    depenses: {
      numero: string;
      objet: string;
    };
  }>> {
    if (depenseIds.length === 0) {
      return [];
    }

    const result = await this.postgresService.query<PaiementValideRow>(
      `
        SELECT
          p.id,
          p.numero,
          p.montant,
          p.date_paiement,
          p.mode_paiement,
          p.depense_id,
          d.numero AS depense_numero,
          d.objet AS depense_objet
        FROM public.paiements p
        INNER JOIN public.depenses d ON d.id = p.depense_id
        WHERE p.client_id = $1
          AND p.depense_id = ANY($2::uuid[])
          AND p.statut IN ('execute', 'reconcilie', 'valide')
        ORDER BY p.date_paiement DESC
      `,
      [actor.tenantId, depenseIds]
    );

    return result.rows.map((row) => ({
      id: row.id,
      numero: row.numero,
      montant: Number(row.montant ?? 0),
      datePaiement: this.toDateOnly(row.date_paiement),
      modePaiement: row.mode_paiement,
      depenseId: row.depense_id ?? '',
      depenses: {
        numero: row.depense_numero ?? '',
        objet: row.depense_objet ?? ''
      }
    }));
  }

  private async createInternal(
    actor: AuthenticatedUser,
    payload: CreateDepenseDto,
    factureAllocations: FactureAllocation[] = []
  ): Promise<DepenseView> {
    if (!payload.engagementId && !payload.reservationCreditId && !payload.ligneBudgetaireId) {
      throw new BadRequestException(
        'Au moins une imputation budgétaire est requise (engagement, réservation ou ligne budgétaire)'
      );
    }

    const exercice = await this.postgresService.query<{ code: string }>(
      `
        SELECT code
        FROM public.exercices
        WHERE id = $1
        LIMIT 1
      `,
      [payload.exerciceId]
    );

    const exerciceCode = exercice.rows[0]?.code;
    if (!exerciceCode) {
      throw new NotFoundException('Exercice introuvable');
    }

    const numero = await this.generateNextNumero(actor.tenantId, payload.exerciceId, exerciceCode);

    const inserted = await this.postgresService.query<{ id: string }>(
      `
        INSERT INTO public.depenses (
          client_id,
          exercice_id,
          numero,
          date_depense,
          objet,
          montant,
          montant_paye,
          engagement_id,
          reservation_credit_id,
          ligne_budgetaire_id,
          facture_id,
          fournisseur_id,
          beneficiaire,
          projet_id,
          mode_paiement,
          reference_paiement,
          observations,
          statut,
          created_by
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          0,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13,
          $14,
          $15,
          $16,
          'brouillon',
          $17
        )
        RETURNING id
      `,
      [
        actor.tenantId,
        payload.exerciceId,
        numero,
        payload.dateDepense,
        payload.objet,
        payload.montant,
        payload.engagementId ?? null,
        payload.reservationCreditId ?? null,
        payload.ligneBudgetaireId ?? null,
        payload.factureId ?? factureAllocations[0]?.factureId ?? null,
        payload.fournisseurId ?? null,
        payload.beneficiaire?.trim() || null,
        payload.projetId ?? null,
        payload.modePaiement ?? null,
        payload.referencePaiement?.trim() || null,
        payload.observations?.trim() || null,
        actor.sub
      ]
    );

    const id = inserted.rows[0]?.id;
    if (!id) {
      throw new NotFoundException('Dépense non créée');
    }

    if (factureAllocations.length > 0) {
      const factureIds = factureAllocations.map((allocation) => allocation.factureId);
      const montants = factureAllocations.map((allocation) => allocation.montant);

      await this.postgresService.query(
        `
          INSERT INTO public.depense_factures (depense_id, facture_id, montant)
          SELECT $1::uuid, facture_id::uuid, montant::numeric
          FROM unnest($2::uuid[], $3::numeric[]) AS source(facture_id, montant)
          ON CONFLICT (depense_id, facture_id) DO UPDATE SET montant = EXCLUDED.montant
        `,
        [id, factureIds, montants]
      );
    } else if (payload.factureId) {
      await this.postgresService.query(
        `
          INSERT INTO public.depense_factures (depense_id, facture_id, montant)
          VALUES ($1, $2, $3)
          ON CONFLICT (depense_id, facture_id) DO NOTHING
        `,
        [id, payload.factureId, payload.montant]
      );
    }

    const created = await this.getById(actor, id);
    await this.recalculateFacturesMontantLiquide(actor.tenantId, created.factureIds ?? []);
    await this.generateEcrituresForDepense(actor, created);
    return created;
  }

  private async generateNextNumero(clientId: string, exerciceId: string, exerciceCode: string): Promise<string> {
    const pattern = `DEP/${exerciceCode}/%`;

    const result = await this.postgresService.query<{ numero: string | null }>(
      `
        SELECT numero
        FROM public.depenses
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

    return `DEP/${exerciceCode}/${String(nextNumber).padStart(4, '0')}`;
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

  private async generateEcrituresForDepense(actor: AuthenticatedUser, depense: DepenseView): Promise<void> {
    await this.ecrituresComptablesService.ensureGeneratedForOperation(actor, 'depense', depense.id, depense.exerciceId);
  }

  private async recalculateFacturesMontantLiquide(clientId: string, factureIds: string[]): Promise<void> {
    if (factureIds.length === 0) {
      return;
    }

    await this.postgresService.query(
      `
        WITH totals AS (
          SELECT
            df.facture_id,
            COALESCE(SUM(df.montant), 0) AS montant_liquide
          FROM public.depense_factures df
          INNER JOIN public.depenses d ON d.id = df.depense_id
          WHERE df.facture_id = ANY($1::uuid[])
            AND d.client_id = $2
            AND d.statut != 'annulee'
          GROUP BY df.facture_id
        )
        UPDATE public.factures f
        SET
          montant_liquide = COALESCE(t.montant_liquide, 0),
          updated_at = now()
        FROM (
          SELECT facture_id, montant_liquide
          FROM totals
          UNION ALL
          SELECT id AS facture_id, 0::numeric AS montant_liquide
          FROM public.factures
          WHERE id = ANY($1::uuid[])
            AND id NOT IN (SELECT facture_id FROM totals)
        ) t
        WHERE f.id = t.facture_id
          AND f.client_id = $2
      `,
      [factureIds, clientId]
    );
  }

  private mapUpdateKeyToColumn(key: keyof UpdateDepenseDto): string {
    const map: Record<keyof UpdateDepenseDto, string> = {
      engagementId: 'engagement_id',
      reservationCreditId: 'reservation_credit_id',
      ligneBudgetaireId: 'ligne_budgetaire_id',
      factureId: 'facture_id',
      fournisseurId: 'fournisseur_id',
      beneficiaire: 'beneficiaire',
      projetId: 'projet_id',
      objet: 'objet',
      montant: 'montant',
      dateDepense: 'date_depense',
      modePaiement: 'mode_paiement',
      referencePaiement: 'reference_paiement',
      observations: 'observations'
    };

    return map[key];
  }

  private baseSelect(): string {
    return `
      SELECT
        d.*,
        CASE
          WHEN df.facture_ids IS NOT NULL AND array_length(df.facture_ids, 1) > 0 THEN df.facture_ids
          WHEN d.facture_id IS NOT NULL THEN ARRAY[d.facture_id]::uuid[]
          ELSE ARRAY[]::uuid[]
        END AS facture_ids,
        e.numero AS engagement_numero,
        e.montant AS engagement_montant,
        rc.numero AS reservation_numero,
        rc.montant AS reservation_montant,
        rc.statut AS reservation_statut,
        lb.libelle AS ligne_budgetaire_libelle,
        lb.disponible AS ligne_budgetaire_disponible,
        f.numero AS facture_numero,
        f.montant_ttc AS facture_montant_ttc,
        f.statut AS facture_statut,
        fr.nom AS fournisseur_nom,
        fr.code AS fournisseur_code,
        p.code AS projet_code,
        p.nom AS projet_nom,
        COALESCE(ec.cnt, 0) AS ecritures_count
      FROM public.depenses d
      LEFT JOIN public.engagements e ON e.id = d.engagement_id
      LEFT JOIN public.reservations_credits rc ON rc.id = d.reservation_credit_id
      LEFT JOIN public.lignes_budgetaires lb ON lb.id = d.ligne_budgetaire_id
      LEFT JOIN public.factures f ON f.id = d.facture_id
      LEFT JOIN public.fournisseurs fr ON fr.id = d.fournisseur_id
      LEFT JOIN public.projets p ON p.id = d.projet_id
      LEFT JOIN (
        SELECT depense_id, COUNT(*) AS cnt
        FROM public.ecritures_comptables
        GROUP BY depense_id
      ) ec ON ec.depense_id = d.id
      LEFT JOIN (
        SELECT
          depense_id,
          array_agg(facture_id ORDER BY facture_id) AS facture_ids
        FROM public.depense_factures
        GROUP BY depense_id
      ) df ON df.depense_id = d.id
    `;
  }

  private mapRowToView(row: DepenseRow): DepenseView {
    return {
      id: row.id,
      clientId: row.client_id,
      exerciceId: row.exercice_id,
      numero: row.numero,
      dateDepense: this.toDateOnly(row.date_depense),
      objet: row.objet,
      montant: Number(row.montant ?? 0),
      montantPaye: Number(row.montant_paye ?? 0),
      engagementId: row.engagement_id ?? undefined,
      reservationCreditId: row.reservation_credit_id ?? undefined,
      ligneBudgetaireId: row.ligne_budgetaire_id ?? undefined,
      factureId: row.facture_id ?? undefined,
      factureIds: row.facture_ids ?? (row.facture_id ? [row.facture_id] : []),
      fournisseurId: row.fournisseur_id ?? undefined,
      beneficiaire: row.beneficiaire ?? undefined,
      projetId: row.projet_id ?? undefined,
      statut: row.statut,
      dateValidation: row.date_validation ? this.toDateOnly(row.date_validation) : undefined,
      dateOrdonnancement: row.date_ordonnancement ? this.toDateOnly(row.date_ordonnancement) : undefined,
      datePaiement: row.date_paiement ? this.toDateOnly(row.date_paiement) : undefined,
      modePaiement: row.mode_paiement ?? undefined,
      referencePaiement: row.reference_paiement ?? undefined,
      observations: row.observations ?? undefined,
      motifAnnulation: row.motif_annulation ?? undefined,
      motifRejet: row.motif_rejet ?? undefined,
      dateRejet: row.date_rejet ? this.toDateOnly(row.date_rejet) : undefined,
      createdBy: row.created_by ?? undefined,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      ecrituresCount: Number(row.ecritures_count ?? 0),
      engagement:
        row.engagement_id && row.engagement_numero && row.engagement_montant !== null
          ? {
              id: row.engagement_id,
              numero: row.engagement_numero,
              montant: Number(row.engagement_montant)
            }
          : undefined,
      reservationCredit:
        row.reservation_credit_id && row.reservation_numero && row.reservation_montant !== null && row.reservation_statut
          ? {
              id: row.reservation_credit_id,
              numero: row.reservation_numero,
              montant: Number(row.reservation_montant),
              statut: row.reservation_statut
            }
          : undefined,
      ligneBudgetaire:
        row.ligne_budgetaire_id && row.ligne_budgetaire_libelle && row.ligne_budgetaire_disponible !== null
          ? {
              id: row.ligne_budgetaire_id,
              libelle: row.ligne_budgetaire_libelle,
              disponible: Number(row.ligne_budgetaire_disponible)
            }
          : undefined,
      facture:
        row.facture_id && row.facture_numero && row.facture_montant_ttc !== null && row.facture_statut
          ? {
              id: row.facture_id,
              numero: row.facture_numero,
              montantTTC: Number(row.facture_montant_ttc),
              statut: row.facture_statut
            }
          : undefined,
      fournisseur:
        row.fournisseur_id && row.fournisseur_nom && row.fournisseur_code
          ? {
              id: row.fournisseur_id,
              nom: row.fournisseur_nom,
              code: row.fournisseur_code
            }
          : undefined,
      projet:
        row.projet_id && row.projet_code && row.projet_nom
          ? {
              id: row.projet_id,
              code: row.projet_code,
              nom: row.projet_nom
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
