import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { QueryResultRow } from 'pg';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PostgresService } from '../common/postgres.service';
import { ExerciceClotureService } from '../exercice-cloture/exercice-cloture.service';
import type {
  CreateRapprochementBancaireDto,
  ManualRapprochementDecisionDto,
} from './dto/rapprochements-bancaires.dto';
import {
  buildRapprochementInvalidationKeys,
  type EcartCategory,
  type MatchingOperationInput,
  type MatchingResult,
  matchStatementLine,
  type RapprochementDecisionAction,
  type RapprochementDetailStatus,
  type RapprochementLigneStatus,
} from './rapprochement-matching.util';

interface SqlExecutor {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[]
  ): Promise<{ rows: T[]; rowCount: number | null }>;
}

interface RapprochementRow {
  id: string;
  client_id: string;
  exercice_id: string;
  numero: string;
  compte_id: string;
  date_debut: Date | string;
  date_fin: Date | string;
  solde_releve: string | number;
  solde_comptable: string | number;
  ecart: string | number;
  statut: 'en_cours' | 'valide' | 'annule';
  statut_detaille: RapprochementDetailStatus;
  mode_generation: 'auto' | 'manuel' | 'mixte';
  score_global: string | number | null;
  categorie_ecart: EcartCategory | null;
  motif_qualification: string | null;
  metadata_audit: Record<string, unknown> | null;
  total_lignes: string | number;
  total_propositions_auto: string | number;
  total_ecarts_qualifies: string | number;
  date_validation: Date | string | null;
  valide_par: string | null;
  observations: string | null;
  created_by: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  compte_code: string | null;
  compte_libelle: string | null;
  compte_type: string | null;
}

interface LigneRow {
  id: string;
  rapprochement_id: string;
  client_id: string;
  exercice_id: string;
  compte_id: string;
  ordre: number;
  date_operation: Date | string;
  libelle: string;
  reference_bancaire: string | null;
  montant: string | number;
  type_flux: 'encaissement' | 'decaissement';
  statut: RapprochementLigneStatus;
  score: string | number | null;
  regles_appliquees: string[] | null;
  operation_tresorerie_id: string | null;
  categorie_ecart: EcartCategory | null;
  motif_qualification: string | null;
  metadata: Record<string, unknown> | null;
}

interface CandidateRow {
  id: string;
  ligne_id: string;
  operation_tresorerie_id: string;
  score: string | number;
  statut: 'propose' | 'selectionne' | 'rejete';
  raison: string[] | null;
  metadata: Record<string, unknown> | null;
}

interface DecisionRow {
  id: string;
  ligne_id: string;
  candidat_id: string | null;
  action: RapprochementDecisionAction;
  previous_status: string | null;
  next_status: string;
  justification: string;
  categorie_ecart: EcartCategory | null;
  actor_user_id: string | null;
  created_at: Date | string;
  metadata: Record<string, unknown> | null;
}

interface OperationScopeRow {
  id: string;
  exercice_id: string;
  compte_id: string;
  numero: string;
  date_operation: Date | string;
  montant: string | number;
  reference_bancaire: string | null;
  libelle: string;
  type_operation: 'encaissement' | 'decaissement' | 'transfert';
  rapproche: boolean;
  rapprochement_bancaire_id: string | null;
}

interface ScopeRow {
  exercice_id: string;
  compte_id: string;
  client_id: string;
  statut: 'en_cours' | 'valide' | 'annule';
}

@Injectable()
export class RapprochementsBancairesService {
  constructor(
    private readonly postgresService: PostgresService,
    private readonly exerciceClotureService: ExerciceClotureService = {
      assertExerciceMutable: async () => undefined,
    } as unknown as ExerciceClotureService
  ) {}

  async getAll(actor: AuthenticatedUser, exerciceId: string) {
    const result = await this.postgresService.query<RapprochementRow>(
      this.baseSelect() +
        `
          WHERE rb.client_id = $1
            AND rb.exercice_id = $2
          ORDER BY rb.created_at DESC
        `,
      [actor.tenantId, exerciceId]
    );

    return result.rows.map((row) => this.mapSummary(row));
  }

  async getById(actor: AuthenticatedUser, id: string) {
    const summaryResult = await this.postgresService.query<RapprochementRow>(
      this.baseSelect() +
        `
          WHERE rb.client_id = $1
            AND rb.id = $2
          LIMIT 1
        `,
      [actor.tenantId, id]
    );

    const row = summaryResult.rows[0];
    if (!row) {
      throw new NotFoundException('Rapprochement bancaire introuvable');
    }

    const [linesResult, candidatesResult, decisionsResult] = await Promise.all([
      this.postgresService.query<LigneRow>(
        `
          SELECT *
          FROM public.rapprochement_bancaire_lignes
          WHERE client_id = $1
            AND rapprochement_id = $2
          ORDER BY ordre ASC
        `,
        [actor.tenantId, id]
      ),
      this.postgresService.query<CandidateRow>(
        `
          SELECT *
          FROM public.rapprochement_bancaire_candidats
          WHERE client_id = $1
            AND ligne_id IN (
              SELECT id
              FROM public.rapprochement_bancaire_lignes
              WHERE client_id = $1
                AND rapprochement_id = $2
            )
          ORDER BY score DESC, created_at ASC
        `,
        [actor.tenantId, id]
      ),
      this.postgresService.query<DecisionRow>(
        `
          SELECT *
          FROM public.rapprochement_bancaire_decisions
          WHERE client_id = $1
            AND rapprochement_id = $2
          ORDER BY created_at DESC
        `,
        [actor.tenantId, id]
      ),
    ]);

    const candidatesByLine = new Map<string, CandidateRow[]>();
    for (const candidate of candidatesResult.rows) {
      const list = candidatesByLine.get(candidate.ligne_id) ?? [];
      list.push(candidate);
      candidatesByLine.set(candidate.ligne_id, list);
    }

    return {
      ...this.mapSummary(row),
      lines: linesResult.rows.map((line) => ({
        id: line.id,
        ordre: Number(line.ordre),
        dateOperation: this.toDateOnly(line.date_operation),
        libelle: line.libelle,
        referenceBancaire: line.reference_bancaire ?? undefined,
        montant: Number(line.montant ?? 0),
        typeFlux: line.type_flux,
        statut: line.statut,
        score: line.score === null ? undefined : Number(line.score),
        reglesAppliquees: line.regles_appliquees ?? [],
        operationTresorerieId: line.operation_tresorerie_id ?? undefined,
        categorieEcart: line.categorie_ecart ?? undefined,
        motifQualification: line.motif_qualification ?? undefined,
        metadata: line.metadata ?? {},
        candidates: (candidatesByLine.get(line.id) ?? []).map((candidate) => ({
          id: candidate.id,
          operationTresorerieId: candidate.operation_tresorerie_id,
          score: Number(candidate.score),
          statut: candidate.statut,
          raisons: candidate.raison ?? [],
          metadata: candidate.metadata ?? {},
        })),
      })),
      decisions: decisionsResult.rows.map((decision) => ({
        id: decision.id,
        lineId: decision.ligne_id,
        candidateId: decision.candidat_id ?? undefined,
        action: decision.action,
        previousStatus: decision.previous_status ?? undefined,
        nextStatus: decision.next_status,
        justification: decision.justification,
        category: decision.categorie_ecart ?? undefined,
        actorUserId: decision.actor_user_id ?? undefined,
        createdAt: this.toIsoString(decision.created_at),
        metadata: decision.metadata ?? {},
      })),
      invalidationKeys: buildRapprochementInvalidationKeys(id),
    };
  }

  async create(actor: AuthenticatedUser, payload: CreateRapprochementBancaireDto) {
    this.assertValidDateRange(payload.dateDebut, payload.dateFin);
    await this.exerciceClotureService.assertExerciceMutable(actor, payload.exerciceId, 'création de rapprochement bancaire');

    const insertedId = await this.postgresService.withTransaction(async (executor) => {
      await this.assertCompteScope(executor, actor, payload.compteId);
      const numero = await this.generateNextNumero(executor, actor.tenantId);
      const operations = await this.loadCandidateOperations(executor, actor, payload.exerciceId, payload.compteId, payload.dateDebut, payload.dateFin);
      const soldeComptable = this.computeSoldeComptable(operations);
      const ecart = payload.soldeReleve - soldeComptable;
      const insertResult = await executor.query<{ id: string }>(
        `
          INSERT INTO public.rapprochements_bancaires (
            client_id,
            exercice_id,
            numero,
            compte_id,
            date_debut,
            date_fin,
            solde_releve,
            solde_comptable,
            ecart,
            observations,
            created_by,
            mode_generation,
            statut_detaille,
            metadata_audit
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'auto', 'a_traiter', $12::jsonb)
          RETURNING id
        `,
        [
          actor.tenantId,
          payload.exerciceId,
          numero,
          payload.compteId,
          payload.dateDebut,
          payload.dateFin,
          payload.soldeReleve,
          soldeComptable,
          ecart,
          payload.observations?.trim() || null,
          actor.sub,
          JSON.stringify({
            generatedBy: actor.sub,
            statementLineCount: payload.statementLines.length,
            generatedAt: new Date().toISOString(),
          }),
        ]
      );

      const rapprochementId = insertResult.rows[0]?.id;
      if (!rapprochementId) {
        throw new NotFoundException('Rapprochement bancaire non créé');
      }

      let totalPropositionsAuto = 0;
      const totalEcartsQualifies = 0;
      const scores: number[] = [];

      for (const [index, line] of payload.statementLines.entries()) {
        const matching = matchStatementLine(line, operations);
        const lineInsertResult = await executor.query<{ id: string }>(
          `
            INSERT INTO public.rapprochement_bancaire_lignes (
              rapprochement_id,
              client_id,
              exercice_id,
              compte_id,
              ordre,
              date_operation,
              libelle,
              reference_bancaire,
              montant,
              type_flux,
              statut,
              score,
              regles_appliquees,
              metadata
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb)
            RETURNING id
          `,
          [
            rapprochementId,
            actor.tenantId,
            payload.exerciceId,
            payload.compteId,
            index + 1,
            line.dateOperation,
            line.libelle,
            line.referenceBancaire?.trim() || null,
            line.montant,
            line.typeFlux,
            matching.status,
            matching.bestScore,
            JSON.stringify(matching.rules),
            JSON.stringify({ recommendedOperationId: matching.recommendedOperationId ?? null }),
          ]
        );

        const lineId = lineInsertResult.rows[0]?.id;
        if (!lineId) {
          throw new ConflictException('Impossible de créer la ligne de rapprochement');
        }

        if (matching.status === 'proposition_unique') {
          totalPropositionsAuto += 1;
        }
        if (matching.bestScore !== null) {
          scores.push(matching.bestScore);
        }

        await this.insertCandidates(executor, lineId, actor, payload.exerciceId, payload.compteId, matching);
      }

      await executor.query(
        `
          UPDATE public.rapprochements_bancaires
          SET
            total_lignes = $2,
            total_propositions_auto = $3,
            total_ecarts_qualifies = $4,
            score_global = $5,
            statut_detaille = $6,
            updated_at = now()
          WHERE id = $1
        `,
        [
          rapprochementId,
          payload.statementLines.length,
          totalPropositionsAuto,
          totalEcartsQualifies,
          scores.length > 0 ? Number((scores.reduce((sum, value) => sum + value, 0) / scores.length).toFixed(2)) : null,
          totalPropositionsAuto === payload.statementLines.length ? 'en_attente_validation' : 'a_traiter',
        ]
      );

      return rapprochementId;
    });

    return this.getById(actor, insertedId);
  }

  async applyDecision(actor: AuthenticatedUser, id: string, payload: ManualRapprochementDecisionDto) {
    const updatedId = await this.postgresService.withTransaction(async (executor) => {
      const scope = await this.resolveRapprochementScope(executor, actor, id);
      if (scope.statut !== 'en_cours') {
        throw new ConflictException('Ce rapprochement ne peut plus être modifié');
      }
      await this.exerciceClotureService.assertExerciceMutable(actor, scope.exercice_id, 'décision de rapprochement bancaire');
      const line = await this.resolveLine(executor, actor, id, payload.lineId);

      if (payload.action === 'reject_candidate') {
        if (!payload.candidateId) {
          throw new BadRequestException('Le rejet manuel exige un candidat');
        }
        await this.rejectCandidate(executor, actor, id, line, payload.candidateId, payload.justification);
        return id;
      }

      if (payload.action === 'qualify_discrepancy') {
        if (!payload.category) {
          throw new BadRequestException("La qualification d'écart exige une catégorie");
        }

        await executor.query(
          `
            UPDATE public.rapprochement_bancaire_lignes
            SET
              statut = 'ecart_qualifie',
              categorie_ecart = $1,
              motif_qualification = $2,
              updated_at = now()
            WHERE id = $3
              AND client_id = $4
          `,
          [payload.category, payload.justification.trim(), line.id, actor.tenantId]
        );

        await this.insertDecision(executor, {
          actor,
          rapprochementId: id,
          lineId: line.id,
          compteId: scope.compte_id,
          exerciceId: scope.exercice_id,
          action: 'qualify_discrepancy',
          previousStatus: line.statut,
          nextStatus: 'ecart_qualifie',
          justification: payload.justification,
          category: payload.category,
        });

        await this.refreshSummary(executor, actor, id);
        return id;
      }

      if (!payload.candidateId) {
        throw new BadRequestException('La sélection manuelle exige un candidat');
      }

      const candidate = await this.resolveCandidate(executor, actor, line.id, payload.candidateId);
      const operation = await this.resolveOperation(executor, actor, candidate.operation_tresorerie_id);
      if (operation.rapproche && operation.rapprochement_bancaire_id !== id) {
        throw new ConflictException("L'opération est déjà rapprochée dans un autre workflow");
      }
      await this.assertOperationNotAlreadyLinked(executor, actor, id, line.id, operation.id);

      await this.assertOperationFitsLine(line, operation);

      await executor.query(
        `
          UPDATE public.rapprochement_bancaire_candidats
          SET statut = CASE WHEN id = $1 THEN 'selectionne' ELSE 'rejete' END,
              updated_at = now()
          WHERE ligne_id = $2
        `,
        [candidate.id, line.id]
      );

      await executor.query(
        `
          UPDATE public.rapprochement_bancaire_lignes
          SET
            statut = 'rapprochee_manuelle',
            operation_tresorerie_id = $1,
            score = $2,
            updated_at = now()
          WHERE id = $3
            AND client_id = $4
        `,
        [operation.id, candidate.score, line.id, actor.tenantId]
      );

      await executor.query(
        `
          UPDATE public.operations_tresorerie
          SET
            rapproche = true,
            statut = 'rapprochee',
            date_rapprochement = CURRENT_DATE,
            rapprochement_bancaire_id = $1,
            updated_at = now()
          WHERE id = $2
            AND client_id = $3
        `,
        [id, operation.id, actor.tenantId]
      );

      await this.insertDecision(executor, {
        actor,
        rapprochementId: id,
        lineId: line.id,
        candidateId: candidate.id,
        compteId: scope.compte_id,
        exerciceId: scope.exercice_id,
        action: 'select_candidate',
        previousStatus: line.statut,
        nextStatus: 'rapprochee_manuelle',
        justification: payload.justification,
      });

      await this.refreshSummary(executor, actor, id);
      return id;
    });

    return this.getById(actor, updatedId);
  }

  async valider(actor: AuthenticatedUser, id: string): Promise<void> {
    await this.postgresService.withTransaction(async (executor) => {
      const scope = await this.resolveRapprochementScope(executor, actor, id);
      await this.exerciceClotureService.assertExerciceMutable(actor, scope.exercice_id, 'validation de rapprochement bancaire');

      const linesResult = await executor.query<LigneRow>(
        `
          SELECT *
          FROM public.rapprochement_bancaire_lignes
          WHERE client_id = $1
            AND rapprochement_id = $2
          ORDER BY ordre ASC
        `,
        [actor.tenantId, id]
      );

      for (const line of linesResult.rows) {
        if (line.statut === 'proposition_unique') {
          const candidate = await executor.query<CandidateRow>(
            `
              SELECT *
              FROM public.rapprochement_bancaire_candidats
              WHERE ligne_id = $1
                AND statut = 'propose'
              ORDER BY score DESC
              LIMIT 1
            `,
            [line.id]
          );

          const selectedCandidate = candidate.rows[0];
          if (!selectedCandidate) {
            throw new ConflictException('Une ligne en proposition unique ne possède plus de candidat');
          }

          const operation = await this.resolveOperation(executor, actor, selectedCandidate.operation_tresorerie_id);
          if (operation.rapproche && operation.rapprochement_bancaire_id !== id) {
            throw new ConflictException("Une opération proposée a été rapprochée ailleurs");
          }
          await this.assertOperationNotAlreadyLinked(executor, actor, id, line.id, operation.id);

          await executor.query(
            `
              UPDATE public.rapprochement_bancaire_candidats
              SET statut = CASE WHEN id = $1 THEN 'selectionne' ELSE 'rejete' END,
                  updated_at = now()
              WHERE ligne_id = $2
            `,
            [selectedCandidate.id, line.id]
          );

          await executor.query(
            `
              UPDATE public.rapprochement_bancaire_lignes
              SET
                statut = 'rapprochee_auto',
                operation_tresorerie_id = $1,
                updated_at = now()
              WHERE id = $2
            `,
            [selectedCandidate.operation_tresorerie_id, line.id]
          );

          await executor.query(
            `
              UPDATE public.operations_tresorerie
              SET
                rapproche = true,
                statut = 'rapprochee',
                date_rapprochement = CURRENT_DATE,
                rapprochement_bancaire_id = $1,
                updated_at = now()
              WHERE id = $2
                AND client_id = $3
            `,
            [id, selectedCandidate.operation_tresorerie_id, actor.tenantId]
          );
        } else if (line.statut === 'ambigu' || line.statut === 'sans_match') {
          throw new ConflictException('Toutes les lignes doivent être traitées ou qualifiées avant validation');
        }
      }

      await this.refreshSummary(executor, actor, id);

      const result = await executor.query(
        `
          UPDATE public.rapprochements_bancaires
          SET
            statut = 'valide',
            statut_detaille = 'valide',
            date_validation = CURRENT_DATE,
            valide_par = $1,
            updated_at = now()
          WHERE id = $2
            AND client_id = $3
        `,
        [actor.sub, id, actor.tenantId]
      );

      if ((result.rowCount ?? 0) === 0) {
        throw new NotFoundException('Rapprochement bancaire introuvable');
      }
    });
  }

  private async assertCompteScope(executor: SqlExecutor, actor: AuthenticatedUser, compteId: string): Promise<void> {
    const result = await executor.query<{ id: string }>(
      `
        SELECT id
        FROM public.comptes_tresorerie
        WHERE id = $1
          AND client_id = $2
        LIMIT 1
      `,
      [compteId, actor.tenantId]
    );

    if (!result.rows[0]?.id) {
      throw new BadRequestException('Compte de trésorerie introuvable sur ce tenant');
    }
  }

  private async loadCandidateOperations(
    executor: SqlExecutor,
    actor: AuthenticatedUser,
    exerciceId: string,
    compteId: string,
    dateDebut: string,
    dateFin: string
  ): Promise<MatchingOperationInput[]> {
    const result = await executor.query<OperationScopeRow>(
      `
        SELECT
          id,
          exercice_id,
          compte_id,
          numero,
          date_operation,
          montant,
          reference_bancaire,
          libelle,
          type_operation,
          rapproche,
          rapprochement_bancaire_id
        FROM public.operations_tresorerie
        WHERE client_id = $1
          AND exercice_id = $2
          AND compte_id = $3
          AND date_operation >= $4
          AND date_operation <= $5
          AND statut != 'annulee'
          AND rapproche = false
        ORDER BY date_operation ASC, numero ASC
      `,
      [actor.tenantId, exerciceId, compteId, dateDebut, dateFin]
    );

    return result.rows.map((row) => ({
      id: row.id,
      numero: row.numero,
      dateOperation: this.toDateOnly(row.date_operation),
      montant: Number(row.montant ?? 0),
      referenceBancaire: row.reference_bancaire ?? undefined,
      libelle: row.libelle,
      typeOperation: row.type_operation,
    }));
  }

  private computeSoldeComptable(operations: MatchingOperationInput[]): number {
    return operations.reduce((sum, operation) => {
      if (operation.typeOperation === 'encaissement') {
        return sum + Number(operation.montant);
      }
      if (operation.typeOperation === 'decaissement') {
        return sum - Number(operation.montant);
      }
      return sum;
    }, 0);
  }

  private async insertCandidates(
    executor: SqlExecutor,
    lineId: string,
    actor: AuthenticatedUser,
    exerciceId: string,
    compteId: string,
    matching: MatchingResult
  ): Promise<void> {
    for (const candidate of matching.candidates) {
      await executor.query(
        `
          INSERT INTO public.rapprochement_bancaire_candidats (
            ligne_id,
            client_id,
            exercice_id,
            compte_id,
            operation_tresorerie_id,
            score,
            statut,
            raison,
            metadata
          )
          VALUES ($1, $2, $3, $4, $5, $6, 'propose', $7::jsonb, $8::jsonb)
        `,
        [
          lineId,
          actor.tenantId,
          exerciceId,
          compteId,
          candidate.operationId,
          candidate.score,
          JSON.stringify(candidate.reasons),
          JSON.stringify(candidate.metadata),
        ]
      );
    }
  }

  private async rejectCandidate(
    executor: SqlExecutor,
    actor: AuthenticatedUser,
    rapprochementId: string,
    line: LigneRow,
    candidateId: string,
    justification: string
  ): Promise<void> {
    const candidate = await this.resolveCandidate(executor, actor, line.id, candidateId);
    const wasSelected = candidate.statut === 'selectionne' && line.operation_tresorerie_id === candidate.operation_tresorerie_id;
    await executor.query(
      `
        UPDATE public.rapprochement_bancaire_candidats
        SET statut = 'rejete',
            updated_at = now()
        WHERE id = $1
      `,
      [candidate.id]
    );

    const remaining = await executor.query<{ count: string | number }>(
      `
        SELECT COUNT(*) AS count
        FROM public.rapprochement_bancaire_candidats
        WHERE ligne_id = $1
          AND statut = 'propose'
      `,
      [line.id]
    );

    const nextStatus: RapprochementLigneStatus = Number(remaining.rows[0]?.count ?? 0) > 0 ? 'ambigu' : 'sans_match';
    await executor.query(
      `
        UPDATE public.rapprochement_bancaire_lignes
        SET statut = $1,
            operation_tresorerie_id = CASE WHEN $3::boolean THEN NULL ELSE operation_tresorerie_id END,
            score = CASE WHEN $3::boolean THEN NULL ELSE score END,
            updated_at = now()
        WHERE id = $2
      `,
      [nextStatus, line.id, wasSelected]
    );

    if (wasSelected && candidate.operation_tresorerie_id) {
      await executor.query(
        `
          UPDATE public.operations_tresorerie
          SET
            rapproche = false,
            statut = 'validee',
            date_rapprochement = NULL,
            rapprochement_bancaire_id = NULL,
            updated_at = now()
          WHERE id = $1
            AND client_id = $2
            AND rapprochement_bancaire_id = $3
        `,
        [candidate.operation_tresorerie_id, actor.tenantId, rapprochementId]
      );
    }

    const scope = await this.resolveRapprochementScope(executor, actor, rapprochementId);
    await this.insertDecision(executor, {
      actor,
      rapprochementId,
      lineId: line.id,
      candidateId: candidate.id,
      compteId: scope.compte_id,
      exerciceId: scope.exercice_id,
      action: 'reject_candidate',
      previousStatus: line.statut,
      nextStatus,
      justification,
    });

    await this.refreshSummary(executor, actor, rapprochementId);
  }

  private async insertDecision(
    executor: SqlExecutor,
    input: {
      actor: AuthenticatedUser;
      rapprochementId: string;
      lineId: string;
      compteId: string;
      exerciceId: string;
      action: RapprochementDecisionAction;
      previousStatus: string | null;
      nextStatus: string;
      justification: string;
      candidateId?: string;
      category?: EcartCategory;
    }
  ): Promise<void> {
    await executor.query(
      `
        INSERT INTO public.rapprochement_bancaire_decisions (
          rapprochement_id,
          ligne_id,
          candidat_id,
          client_id,
          exercice_id,
          compte_id,
          action,
          previous_status,
          next_status,
          justification,
          categorie_ecart,
          actor_user_id,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
      `,
      [
        input.rapprochementId,
        input.lineId,
        input.candidateId ?? null,
        input.actor.tenantId,
        input.exerciceId,
        input.compteId,
        input.action,
        input.previousStatus,
        input.nextStatus,
        input.justification.trim(),
        input.category ?? null,
        input.actor.sub,
        JSON.stringify({ recordedAt: new Date().toISOString() }),
      ]
    );
  }

  private async refreshSummary(executor: SqlExecutor, actor: AuthenticatedUser, rapprochementId: string): Promise<void> {
    const counts = await executor.query<{
      total_lignes: string | number;
      total_propositions_auto: string | number;
      total_ecarts_qualifies: string | number;
      total_pending: string | number;
      average_score: string | number | null;
    }>(
      `
        SELECT
          COUNT(*) AS total_lignes,
          COUNT(*) FILTER (WHERE statut = 'proposition_unique') AS total_propositions_auto,
          COUNT(*) FILTER (WHERE statut = 'ecart_qualifie') AS total_ecarts_qualifies,
          COUNT(*) FILTER (WHERE statut IN ('proposition_unique', 'ambigu', 'sans_match')) AS total_pending,
          AVG(score) AS average_score
        FROM public.rapprochement_bancaire_lignes
        WHERE client_id = $1
          AND rapprochement_id = $2
      `,
      [actor.tenantId, rapprochementId]
    );

    const summary = counts.rows[0];
    const pending = Number(summary?.total_pending ?? 0);
    const statutDetaille: RapprochementDetailStatus = pending === 0 ? 'en_attente_validation' : 'a_traiter';

    await executor.query(
      `
        UPDATE public.rapprochements_bancaires
        SET
          total_lignes = $2,
          total_propositions_auto = $3,
          total_ecarts_qualifies = $4,
          score_global = $5,
          statut_detaille = CASE WHEN statut = 'valide' THEN 'valide' ELSE $6 END,
          updated_at = now()
        WHERE id = $1
      `,
      [
        rapprochementId,
        Number(summary?.total_lignes ?? 0),
        Number(summary?.total_propositions_auto ?? 0),
        Number(summary?.total_ecarts_qualifies ?? 0),
        summary?.average_score === null ? null : Number(Number(summary.average_score).toFixed(2)),
        statutDetaille,
      ]
    );
  }

  private async resolveRapprochementScope(
    executor: SqlExecutor,
    actor: AuthenticatedUser,
    rapprochementId: string
  ): Promise<ScopeRow> {
    const result = await executor.query<ScopeRow>(
      `
        SELECT exercice_id, compte_id, client_id, statut
        FROM public.rapprochements_bancaires
        WHERE id = $1
          AND client_id = $2
        LIMIT 1
      `,
      [rapprochementId, actor.tenantId]
    );

    const scope = result.rows[0];
    if (!scope) {
      throw new NotFoundException('Rapprochement bancaire introuvable');
    }

    return scope;
  }

  private assertValidDateRange(dateDebut: string, dateFin: string): void {
    const start = new Date(`${dateDebut}T00:00:00.000Z`);
    const end = new Date(`${dateFin}T00:00:00.000Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Les dates du rapprochement sont invalides');
    }
    if (start.getTime() > end.getTime()) {
      throw new BadRequestException('La date de début doit être antérieure ou égale à la date de fin');
    }
  }

  private async assertOperationNotAlreadyLinked(
    executor: SqlExecutor,
    actor: AuthenticatedUser,
    rapprochementId: string,
    lineId: string,
    operationId: string
  ): Promise<void> {
    const result = await executor.query<{ id: string }>(
      `
        SELECT id
        FROM public.rapprochement_bancaire_lignes
        WHERE client_id = $1
          AND rapprochement_id = $2
          AND operation_tresorerie_id = $3
          AND id != $4
        LIMIT 1
      `,
      [actor.tenantId, rapprochementId, operationId, lineId]
    );

    if (result.rows[0]?.id) {
      throw new ConflictException("L'opération est déjà rattachée à une autre ligne de ce rapprochement");
    }
  }

  private async resolveLine(executor: SqlExecutor, actor: AuthenticatedUser, rapprochementId: string, lineId: string) {
    const result = await executor.query<LigneRow>(
      `
        SELECT *
        FROM public.rapprochement_bancaire_lignes
        WHERE id = $1
          AND rapprochement_id = $2
          AND client_id = $3
        LIMIT 1
      `,
      [lineId, rapprochementId, actor.tenantId]
    );

    const line = result.rows[0];
    if (!line) {
      throw new NotFoundException('Ligne de rapprochement introuvable');
    }

    return line;
  }

  private async resolveCandidate(executor: SqlExecutor, actor: AuthenticatedUser, lineId: string, candidateId: string) {
    const result = await executor.query<CandidateRow>(
      `
        SELECT *
        FROM public.rapprochement_bancaire_candidats
        WHERE id = $1
          AND ligne_id = $2
          AND client_id = $3
        LIMIT 1
      `,
      [candidateId, lineId, actor.tenantId]
    );

    const candidate = result.rows[0];
    if (!candidate) {
      throw new NotFoundException('Candidat de rapprochement introuvable');
    }

    return candidate;
  }

  private async resolveOperation(executor: SqlExecutor, actor: AuthenticatedUser, operationId: string) {
    const result = await executor.query<OperationScopeRow>(
      `
        SELECT
          id,
          exercice_id,
          compte_id,
          numero,
          date_operation,
          montant,
          reference_bancaire,
          libelle,
          type_operation,
          rapproche,
          rapprochement_bancaire_id
        FROM public.operations_tresorerie
        WHERE id = $1
          AND client_id = $2
        LIMIT 1
      `,
      [operationId, actor.tenantId]
    );

    const operation = result.rows[0];
    if (!operation) {
      throw new NotFoundException('Opération de trésorerie introuvable');
    }

    return operation;
  }

  private async assertOperationFitsLine(line: LigneRow, operation: OperationScopeRow): Promise<void> {
    if (line.exercice_id !== operation.exercice_id) {
      throw new BadRequestException("Le candidat sélectionné appartient à un autre exercice");
    }

    if (line.compte_id !== operation.compte_id) {
      throw new BadRequestException("Le candidat sélectionné appartient à un autre compte");
    }

    if (Number(line.montant) !== Number(operation.montant)) {
      throw new BadRequestException("Le candidat sélectionné ne correspond pas au montant de la ligne");
    }

    const lineDate = this.toDateOnly(line.date_operation);
    const operationDate = this.toDateOnly(operation.date_operation);
    if (line.type_flux !== operation.type_operation && operation.type_operation !== 'transfert') {
      throw new BadRequestException("Le candidat sélectionné n'est pas compatible avec le type de flux");
    }

    if (lineDate !== operationDate && !this.isNearDate(lineDate, operationDate)) {
      throw new BadRequestException('Le candidat sélectionné est hors fenêtre de rapprochement');
    }
  }

  private isNearDate(left: string, right: string): boolean {
    const leftDate = new Date(`${left}T00:00:00.000Z`);
    const rightDate = new Date(`${right}T00:00:00.000Z`);
    const delta = Math.abs(leftDate.getTime() - rightDate.getTime());
    return delta <= 172_800_000;
  }

  private async generateNextNumero(executor: SqlExecutor, clientId: string): Promise<string> {
    const result = await executor.query<{ numero: string | null }>(
      `
        SELECT numero
        FROM public.rapprochements_bancaires
        WHERE client_id = $1
          AND numero LIKE 'RAP%'
        ORDER BY numero DESC
        LIMIT 1
      `,
      [clientId]
    );

    const lastNumero = result.rows[0]?.numero;
    const match = lastNumero?.match(/^RAP(\d+)$/);
    const next = match ? Number(match[1]) + 1 : 1;

    return `RAP${String(next).padStart(5, '0')}`;
  }

  private baseSelect(): string {
    return `
      SELECT
        rb.*,
        ct.code AS compte_code,
        ct.libelle AS compte_libelle,
        ct.type AS compte_type
      FROM public.rapprochements_bancaires rb
      LEFT JOIN public.comptes_tresorerie ct ON ct.id = rb.compte_id
    `;
  }

  private mapSummary(row: RapprochementRow) {
    return {
      id: row.id,
      clientId: row.client_id,
      exerciceId: row.exercice_id,
      numero: row.numero,
      compteId: row.compte_id,
      dateDebut: this.toDateOnly(row.date_debut),
      dateFin: this.toDateOnly(row.date_fin),
      soldeReleve: Number(row.solde_releve ?? 0),
      soldeComptable: Number(row.solde_comptable ?? 0),
      ecart: Number(row.ecart ?? 0),
      statut: row.statut,
      statutDetaille: row.statut_detaille,
      modeGeneration: row.mode_generation,
      scoreGlobal: row.score_global === null ? undefined : Number(row.score_global),
      categorieEcart: row.categorie_ecart ?? undefined,
      motifQualification: row.motif_qualification ?? undefined,
      metadataAudit: row.metadata_audit ?? {},
      totalLignes: Number(row.total_lignes ?? 0),
      totalPropositionsAuto: Number(row.total_propositions_auto ?? 0),
      totalEcartsQualifies: Number(row.total_ecarts_qualifies ?? 0),
      dateValidation: row.date_validation ? this.toDateOnly(row.date_validation) : undefined,
      validePar: row.valide_par ?? undefined,
      observations: row.observations ?? undefined,
      createdBy: row.created_by ?? undefined,
      createdAt: this.toIsoString(row.created_at),
      updatedAt: this.toIsoString(row.updated_at),
      compte:
        row.compte_code && row.compte_libelle && row.compte_type
          ? {
              code: row.compte_code,
              libelle: row.compte_libelle,
              type: row.compte_type,
            }
          : undefined,
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
