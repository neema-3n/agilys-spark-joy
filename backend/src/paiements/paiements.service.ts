import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PostgresService } from '../common/postgres.service';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { EcrituresComptablesService } from '../ecritures-comptables/ecritures-comptables.service';
import { ExerciceClotureService } from '../exercice-cloture/exercice-cloture.service';
import { WorkflowExceptionsService } from '../workflow-exceptions/workflow-exceptions.service';
import type { AnnulerPaiementDto, CreatePaiementDto, RejeterPaiementDto, ReprendrePaiementDto } from './dto/paiements.dto';
import {
  canCreatePaiementForDepense,
  canTransitionPaiement,
  isAccountingReadyPaiementStatus,
  isSuccessfulPaiementStatus,
  type DepensePaiementStatus,
  type PaiementMode,
  type PaiementStatus,
} from './paiement-workflow';

interface PaiementRow {
  id: string;
  client_id: string;
  exercice_id: string;
  numero: string;
  depense_id: string;
  montant: string | number;
  date_paiement: Date | string;
  mode_paiement: PaiementMode;
  reference_paiement: string | null;
  observations: string | null;
  statut: PaiementStatus;
  motif_annulation: string | null;
  date_annulation: Date | string | null;
  motif_rejet: string | null;
  date_rejet: Date | string | null;
  date_retour: Date | string | null;
  reference_retour: string | null;
  tentative_numero: number | null;
  paiement_origine_id: string | null;
  paiement_repris_de_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  depense_numero: string | null;
  depense_objet: string | null;
  depense_montant: string | number | null;
  depense_montant_paye: string | number | null;
  depense_statut: DepensePaiementStatus | null;
  fournisseur_id: string | null;
  fournisseur_nom: string | null;
  fournisseur_code: string | null;
  ecritures_count: string | number;
}

interface DepensePaiementRow {
  id: string;
  client_id: string;
  exercice_id: string;
  numero: string;
  objet: string;
  montant: string | number;
  montant_paye: string | number;
  statut: DepensePaiementStatus;
  fournisseur_id: string | null;
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

interface PaiementView {
  id: string;
  clientId: string;
  exerciceId: string;
  numero: string;
  depenseId: string;
  montant: number;
  datePaiement: string;
  modePaiement: PaiementMode;
  referencePaiement?: string;
  observations?: string;
  statut: PaiementStatus;
  motifAnnulation?: string;
  dateAnnulation?: string;
  motifRejet?: string;
  dateRejet?: string;
  dateRetour?: string;
  referenceRetour?: string;
  tentativeNumero: number;
  paiementOrigineId?: string;
  paiementReprisDeId?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  ecrituresCount?: number;
  depense?: {
    id: string;
    numero: string;
    objet: string;
    montant: number;
    montantPaye: number;
    resteAPayer: number;
    statut: DepensePaiementStatus;
    fournisseur?: {
      id: string;
      nom: string;
      code: string;
    };
  };
}

@Injectable()
export class PaiementsService {
  constructor(
    private readonly postgresService: PostgresService,
    private readonly workflowExceptionsService: WorkflowExceptionsService,
    private readonly ecrituresComptablesService: EcrituresComptablesService,
    private readonly exerciceClotureService: ExerciceClotureService = {
      assertExerciceMutable: async () => undefined
    } as unknown as ExerciceClotureService
  ) {}

  async getAll(actor: AuthenticatedUser, exerciceId: string): Promise<PaiementView[]> {
    const result = await this.postgresService.query<PaiementRow>(
      this.baseSelect() +
        `
          WHERE p.client_id = $1
            AND p.exercice_id = $2
          ORDER BY p.date_paiement DESC, p.created_at DESC
        `,
      [actor.tenantId, exerciceId]
    );

    return result.rows.map((row) => this.mapRowToView(row));
  }

  async getByDepense(actor: AuthenticatedUser, depenseId: string): Promise<PaiementView[]> {
    const result = await this.postgresService.query<PaiementRow>(
      this.baseSelect() +
        `
          WHERE p.client_id = $1
            AND p.depense_id = $2
          ORDER BY p.tentative_numero ASC, p.created_at ASC
        `,
      [actor.tenantId, depenseId]
    );

    return result.rows.map((row) => this.mapRowToView(row));
  }

  async getById(actor: AuthenticatedUser, id: string): Promise<PaiementView> {
    const row = await this.getPaiementRow(actor, id);
    return this.mapRowToView(row);
  }

  async create(actor: AuthenticatedUser, payload: CreatePaiementDto): Promise<PaiementView> {
    await this.exerciceClotureService.assertExerciceMutable(actor, payload.exerciceId, 'création de paiement');
    const depense = await this.getDepenseForPaiement(actor, payload.depenseId);
    this.assertDepenseMatchesExercice(depense, payload.exerciceId);
    this.assertDepenseCanReceivePaiement(depense);

    const montant = this.assertPositiveAmount(payload.montant);
    const resteAPayer = await this.getResteAPayer(actor.tenantId, depense.id, depense.montant);

    if (montant > resteAPayer) {
      throw new BadRequestException(
        `Paiement impossible: le montant dépasse le reste à payer (${resteAPayer.toFixed(2)}). Action: réduisez le montant ou soldez depuis une autre tentative.`
      );
    }

    const numero = await this.generateNextNumero(actor.tenantId, payload.exerciceId);

    const insertResult = await this.postgresService.query<{ id: string }>(
      `
        INSERT INTO public.paiements (
          client_id,
          exercice_id,
          numero,
          depense_id,
          montant,
          date_paiement,
          mode_paiement,
          reference_paiement,
          observations,
          statut,
          tentative_numero,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'transmis', 1, $10)
        RETURNING id
      `,
      [
        actor.tenantId,
        payload.exerciceId,
        numero,
        payload.depenseId,
        montant,
        payload.datePaiement,
        payload.modePaiement,
        payload.referencePaiement?.trim() || null,
        payload.observations?.trim() || null,
        actor.sub,
      ]
    );

    const insertedId = insertResult.rows[0]?.id;
    if (!insertedId) {
      throw new NotFoundException('Impossible de créer le paiement');
    }

    return this.getById(actor, insertedId);
  }

  async accepter(actor: AuthenticatedUser, id: string): Promise<PaiementView> {
    return this.transition(actor, id, 'accepte');
  }

  async executer(actor: AuthenticatedUser, id: string): Promise<PaiementView> {
    const paiement = await this.getPaiementRow(actor, id);
    await this.workflowExceptionsService.assertTransitionAllowed(actor, {
      exerciceId: paiement.exercice_id,
      transition: 'paiement:execute',
      sourceType: 'paiement',
      sourceId: paiement.id,
      entityId: paiement.depense_id,
      amount: Number(paiement.montant ?? 0),
    });

    return this.transition(actor, id, 'execute');
  }

  async reconcilier(actor: AuthenticatedUser, id: string): Promise<PaiementView> {
    return this.transition(actor, id, 'reconcilie');
  }

  async rejeter(actor: AuthenticatedUser, id: string, payload: RejeterPaiementDto): Promise<PaiementView> {
    const paiement = await this.getPaiementRow(actor, id);
    await this.exerciceClotureService.assertExerciceMutable(actor, paiement.exercice_id, 'rejet de paiement');
    this.assertTransitionAllowed(paiement.statut, 'rejete');

    if (!payload.motif.trim()) {
      throw new BadRequestException('Le motif de rejet est requis');
    }

    const wasSuccessful = isSuccessfulPaiementStatus(paiement.statut);

    await this.postgresService.query(
      `
        UPDATE public.paiements
        SET
          statut = 'rejete',
          motif_rejet = $1,
          date_rejet = CURRENT_DATE,
          date_retour = COALESCE($2, date_retour),
          reference_retour = COALESCE($3, reference_retour),
          updated_by = $4,
          updated_at = now()
        WHERE id = $5
          AND client_id = $6
      `,
      [
        payload.motif.trim(),
        payload.dateRetour?.trim() || null,
        payload.referenceRetour?.trim() || null,
        actor.sub,
        id,
        actor.tenantId,
      ]
    );

    if (wasSuccessful) {
      await this.revertSuccessfulArtifacts(actor, paiement, payload.motif.trim());
    }

    return this.getById(actor, id);
  }

  async annuler(actor: AuthenticatedUser, id: string, payload: AnnulerPaiementDto): Promise<PaiementView> {
    const paiement = await this.getPaiementRow(actor, id);
    await this.exerciceClotureService.assertExerciceMutable(actor, paiement.exercice_id, 'annulation de paiement');
    this.assertTransitionAllowed(paiement.statut, 'annule');

    if (!payload.motif.trim()) {
      throw new BadRequestException('Le motif d\'annulation est requis');
    }

    const wasSuccessful = isSuccessfulPaiementStatus(paiement.statut);

    await this.postgresService.query(
      `
        UPDATE public.paiements
        SET
          statut = 'annule',
          motif_annulation = $1,
          date_annulation = CURRENT_DATE,
          date_retour = COALESCE($2, date_retour),
          reference_retour = COALESCE($3, reference_retour),
          updated_by = $4,
          updated_at = now()
        WHERE id = $5
          AND client_id = $6
      `,
      [
        payload.motif.trim(),
        payload.dateRetour?.trim() || null,
        payload.referenceRetour?.trim() || null,
        actor.sub,
        id,
        actor.tenantId,
      ]
    );

    if (wasSuccessful) {
      await this.revertSuccessfulArtifacts(actor, paiement, payload.motif.trim());
    }

    return this.getById(actor, id);
  }

  async reprendre(actor: AuthenticatedUser, id: string, payload: ReprendrePaiementDto): Promise<PaiementView> {
    const paiement = await this.getPaiementRow(actor, id);
    await this.exerciceClotureService.assertExerciceMutable(actor, paiement.exercice_id, 'reprise de paiement');

    if (!['rejete', 'annule'].includes(paiement.statut)) {
      throw new BadRequestException(
        `Reprise impossible: seuls les paiements rejetés ou annulés peuvent être repris. Statut actuel: "${paiement.statut}".`
      );
    }

    const depense = await this.getDepenseForPaiement(actor, paiement.depense_id);
    this.assertDepenseCanReceivePaiement(depense);

    const montant = this.assertPositiveAmount(payload.montant ?? Number(paiement.montant ?? 0));
    const resteAPayer = await this.getResteAPayer(actor.tenantId, depense.id, depense.montant);
    if (montant > resteAPayer) {
      throw new BadRequestException(
        `Reprise impossible: le montant dépasse le reste à payer (${resteAPayer.toFixed(2)}). Action: ajustez la tentative reprise.`
      );
    }

    await this.workflowExceptionsService.assertTransitionAllowed(actor, {
      exerciceId: paiement.exercice_id,
      transition: 'paiement:reprendre',
      sourceType: 'paiement',
      sourceId: paiement.id,
      entityId: paiement.depense_id,
      amount: montant,
    });

    const numero = await this.generateNextNumero(actor.tenantId, paiement.exercice_id);
    const tentativeNumero = await this.getNextTentativeNumero(
      actor.tenantId,
      paiement.depense_id,
      paiement.paiement_origine_id ?? paiement.id
    );

    const insertResult = await this.postgresService.query<{ id: string }>(
      `
        INSERT INTO public.paiements (
          client_id,
          exercice_id,
          numero,
          depense_id,
          montant,
          date_paiement,
          mode_paiement,
          reference_paiement,
          observations,
          statut,
          tentative_numero,
          paiement_origine_id,
          paiement_repris_de_id,
          created_by,
          updated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'transmis', $10, $11, $12, $13, $13)
        RETURNING id
      `,
      [
        actor.tenantId,
        paiement.exercice_id,
        numero,
        paiement.depense_id,
        montant,
        payload.datePaiement ?? this.toDateOnly(paiement.date_paiement),
        payload.modePaiement ?? paiement.mode_paiement,
        payload.referencePaiement?.trim() ?? paiement.reference_paiement,
        payload.observations?.trim() ?? paiement.observations,
        tentativeNumero,
        paiement.paiement_origine_id ?? paiement.id,
        paiement.id,
        actor.sub,
      ]
    );

    const insertedId = insertResult.rows[0]?.id;
    if (!insertedId) {
      throw new NotFoundException('Impossible de créer la tentative de reprise');
    }

    return this.getById(actor, insertedId);
  }

  async delete(actor: AuthenticatedUser, id: string): Promise<void> {
    const paiement = await this.getPaiementRow(actor, id);
    await this.exerciceClotureService.assertExerciceMutable(actor, paiement.exercice_id, 'suppression de paiement');

    if (!['annule', 'rejete'].includes(paiement.statut)) {
      throw new BadRequestException(
        'Suppression impossible: seules les tentatives annulées ou rejetées peuvent être supprimées. Action: utilisez les transitions du workflow.'
      );
    }

    const result = await this.postgresService.query(
      `
        DELETE FROM public.paiements
        WHERE id = $1
          AND client_id = $2
      `,
      [id, actor.tenantId]
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new NotFoundException('Paiement introuvable');
    }
  }

  private async transition(actor: AuthenticatedUser, id: string, nextStatus: PaiementStatus): Promise<PaiementView> {
    const paiement = await this.getPaiementRow(actor, id);
    await this.exerciceClotureService.assertExerciceMutable(actor, paiement.exercice_id, `transition de paiement vers ${nextStatus}`);
    this.assertTransitionAllowed(paiement.statut, nextStatus);

    await this.postgresService.query(
      `
        UPDATE public.paiements
        SET
          statut = $1,
          updated_by = $2,
          updated_at = now()
        WHERE id = $3
          AND client_id = $4
      `,
      [nextStatus, actor.sub, id, actor.tenantId]
    );

    if (isAccountingReadyPaiementStatus(nextStatus) && !isAccountingReadyPaiementStatus(paiement.statut)) {
      await this.ensureSuccessfulArtifacts(actor, paiement);
    }

    return this.getById(actor, id);
  }

  private assertTransitionAllowed(current: PaiementStatus, next: PaiementStatus): void {
    if (!canTransitionPaiement(current, next)) {
      throw new BadRequestException(
        `Transition invalide: impossible de passer un paiement de "${current}" à "${next}".`
      );
    }
  }

  private async getPaiementRow(actor: AuthenticatedUser, id: string): Promise<PaiementRow> {
    const result = await this.postgresService.query<PaiementRow>(
      this.baseSelect() +
        `
          WHERE p.client_id = $1
            AND p.id = $2
          LIMIT 1
        `,
      [actor.tenantId, id]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException('Paiement introuvable');
    }

    return row;
  }

  private async getDepenseForPaiement(actor: AuthenticatedUser, depenseId: string): Promise<DepensePaiementRow> {
    const result = await this.postgresService.query<DepensePaiementRow>(
      `
        SELECT id, client_id, exercice_id, numero, objet, montant, montant_paye, statut, fournisseur_id
        FROM public.depenses
        WHERE id = $1
          AND client_id = $2
        LIMIT 1
      `,
      [depenseId, actor.tenantId]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException('Dépense introuvable');
    }

    return row;
  }

  private assertDepenseMatchesExercice(depense: DepensePaiementRow, exerciceId: string): void {
    if (depense.exercice_id !== exerciceId) {
      throw new BadRequestException('La dépense ne correspond pas à l\'exercice sélectionné');
    }
  }

  private assertDepenseCanReceivePaiement(depense: DepensePaiementRow): void {
    if (!canCreatePaiementForDepense(depense.statut)) {
      throw new BadRequestException(
        `Paiement impossible: la dépense ${depense.numero} est en statut "${depense.statut}". Action: ordonnancez-la avant de lancer le workflow de paiement.`
      );
    }
  }

  private assertPositiveAmount(rawAmount: number): number {
    const amount = Number(rawAmount ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Le montant du paiement doit être strictement positif');
    }

    return amount;
  }

  private async getResteAPayer(
    tenantId: string,
    depenseId: string,
    depenseMontant: string | number
  ): Promise<number> {
    const result = await this.postgresService.query<{ total: string | number }>(
      `
        SELECT COALESCE(SUM(montant), 0) AS total
        FROM public.paiements
        WHERE client_id = $1
          AND depense_id = $2
          AND statut IN ('execute', 'reconcilie')
      `,
      [tenantId, depenseId]
    );

    return Math.max(Number(depenseMontant ?? 0) - Number(result.rows[0]?.total ?? 0), 0);
  }

  private async getNextTentativeNumero(tenantId: string, depenseId: string, rootPaiementId: string): Promise<number> {
    const result = await this.postgresService.query<{ max_attempt: number | null }>(
      `
        SELECT MAX(tentative_numero) AS max_attempt
        FROM public.paiements
        WHERE client_id = $1
          AND depense_id = $2
          AND (paiement_origine_id = $3 OR id = $3)
      `,
      [tenantId, depenseId, rootPaiementId]
    );

    return Number(result.rows[0]?.max_attempt ?? 1) + 1;
  }

  private async ensureSuccessfulArtifacts(actor: AuthenticatedUser, paiement: PaiementRow): Promise<void> {
    await this.ensureEcritures(actor, paiement);
  }

  private async ensureEcritures(actor: AuthenticatedUser, paiement: PaiementRow): Promise<void> {
    await this.ecrituresComptablesService.ensureGeneratedForOperation(actor, 'paiement', paiement.id, paiement.exercice_id);
  }

  private async revertSuccessfulArtifacts(actor: AuthenticatedUser, paiement: PaiementRow, motif: string): Promise<void> {
    const validatedEntries = await this.postgresService.query<EcritureRow>(
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
        WHERE paiement_id = $1
          AND client_id = $2
          AND exercice_id = $3
          AND statut_ecriture = 'validee'
      `,
      [paiement.id, actor.tenantId, paiement.exercice_id]
    );

    if (validatedEntries.rows.length > 0) {
      await this.ecrituresComptablesService.createContrepassations(actor, validatedEntries.rows, {
        motif,
        libellePrefix: 'Workflow paiement inversé',
        expectedExerciceId: paiement.exercice_id,
        expectedSourceId: paiement.id
      });
    }

  }

  private async generateNextNumero(clientId: string, exerciceId: string): Promise<string> {
    const result = await this.postgresService.query<{ numero: string | null }>(
      `
        SELECT numero
        FROM public.paiements
        WHERE client_id = $1
          AND exercice_id = $2
          AND numero LIKE 'PAY%'
        ORDER BY numero DESC
        LIMIT 1
      `,
      [clientId, exerciceId]
    );

    const lastNumero = result.rows[0]?.numero;
    const match = lastNumero?.match(/^PAY(\d+)$/);
    const nextNumber = match ? Number(match[1]) + 1 : 1;

    return `PAY${String(nextNumber).padStart(6, '0')}`;
  }

  private baseSelect(): string {
    return `
      SELECT
        p.*,
        d.numero AS depense_numero,
        d.objet AS depense_objet,
        d.montant AS depense_montant,
        d.montant_paye AS depense_montant_paye,
        d.statut AS depense_statut,
        f.id AS fournisseur_id,
        f.nom AS fournisseur_nom,
        f.code AS fournisseur_code,
        COALESCE(ec.cnt, 0) AS ecritures_count
      FROM public.paiements p
      LEFT JOIN public.depenses d ON d.id = p.depense_id
      LEFT JOIN public.fournisseurs f ON f.id = d.fournisseur_id
      LEFT JOIN (
        SELECT paiement_id, COUNT(*) AS cnt
        FROM public.ecritures_comptables
        GROUP BY paiement_id
      ) ec ON ec.paiement_id = p.id
    `;
  }

  private mapRowToView(row: PaiementRow): PaiementView {
    const montantDepense = Number(row.depense_montant ?? 0);
    const montantPaye = Number(row.depense_montant_paye ?? 0);

    return {
      id: row.id,
      clientId: row.client_id,
      exerciceId: row.exercice_id,
      numero: row.numero,
      depenseId: row.depense_id,
      montant: Number(row.montant ?? 0),
      datePaiement: this.toDateOnly(row.date_paiement),
      modePaiement: row.mode_paiement,
      referencePaiement: row.reference_paiement ?? undefined,
      observations: row.observations ?? undefined,
      statut: row.statut,
      motifAnnulation: row.motif_annulation ?? undefined,
      dateAnnulation: row.date_annulation ? this.toDateOnly(row.date_annulation) : undefined,
      motifRejet: row.motif_rejet ?? undefined,
      dateRejet: row.date_rejet ? this.toDateOnly(row.date_rejet) : undefined,
      dateRetour: row.date_retour ? this.toDateOnly(row.date_retour) : undefined,
      referenceRetour: row.reference_retour ?? undefined,
      tentativeNumero: Number(row.tentative_numero ?? 1),
      paiementOrigineId: row.paiement_origine_id ?? undefined,
      paiementReprisDeId: row.paiement_repris_de_id ?? undefined,
      createdBy: row.created_by ?? undefined,
      updatedBy: row.updated_by ?? undefined,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      ecrituresCount: Number(row.ecritures_count ?? 0),
      depense:
        row.depense_numero && row.depense_objet && row.depense_statut
          ? {
              id: row.depense_id,
              numero: row.depense_numero,
              objet: row.depense_objet,
              montant: montantDepense,
              montantPaye,
              resteAPayer: Math.max(montantDepense - montantPaye, 0),
              statut: row.depense_statut,
              fournisseur:
                row.fournisseur_id && row.fournisseur_nom && row.fournisseur_code
                  ? {
                      id: row.fournisseur_id,
                      nom: row.fournisseur_nom,
                      code: row.fournisseur_code,
                    }
                  : undefined,
            }
          : undefined,
    };
  }

  private toDateOnly(value: Date | string): string {
    if (typeof value === 'string') {
      return value.slice(0, 10);
    }

    return value.toISOString().slice(0, 10);
  }
}
