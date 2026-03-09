import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PostgresService } from '../common/postgres.service';
import { EcrituresComptablesService } from '../ecritures-comptables/ecritures-comptables.service';
import { ExerciceClotureService } from '../exercice-cloture/exercice-cloture.service';
import type { CreateFactureDto, FacturesPaginatedQueryDto, GenerateTestFacturesDto, UpdateFactureDto } from './dto/factures.dto';

interface FactureRow {
  id: string;
  client_id: string;
  exercice_id: string;
  numero: string;
  date_facture: Date | string;
  date_echeance: Date | string | null;
  fournisseur_id: string;
  bon_commande_id: string | null;
  engagement_id: string | null;
  ligne_budgetaire_id: string | null;
  projet_id: string | null;
  objet: string;
  numero_facture_fournisseur: string | null;
  reference_piece: string | null;
  montant_ht: string | number;
  montant_tva: string | number;
  montant_ttc: string | number;
  montant_liquide: string | number;
  statut: 'brouillon' | 'validee' | 'payee' | 'annulee';
  date_validation: Date | string | null;
  observations: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  created_by: string | null;
  fournisseur_nom: string | null;
  fournisseur_code: string | null;
  bon_commande_numero: string | null;
  engagement_numero: string | null;
  ligne_budgetaire_libelle: string | null;
  projet_nom: string | null;
  projet_code: string | null;
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

interface FactureStatsRow {
  nombre_total: string | number;
  nombre_brouillon: string | number;
  nombre_validee: string | number;
  nombre_payee: string | number;
  montant_total: string | number;
  montant_brouillon: string | number;
  montant_validee: string | number;
  montant_liquide: string | number;
}

interface FactureGenerationContext {
  code: string;
  date_debut: Date | string;
  date_fin: Date | string;
}

interface FactureView {
  id: string;
  clientId: string;
  exerciceId: string;
  numero: string;
  dateFacture: string;
  dateEcheance?: string;
  fournisseurId: string;
  bonCommandeId?: string;
  engagementId?: string;
  ligneBudgetaireId?: string;
  projetId?: string;
  objet: string;
  numeroFactureFournisseur?: string;
  referencePiece?: string;
  montantHT: number;
  montantTVA: number;
  montantTTC: number;
  montantLiquide: number;
  statut: 'brouillon' | 'validee' | 'payee' | 'annulee';
  dateValidation?: string;
  observations?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  ecrituresCount?: number;
  fournisseur?: {
    id: string;
    nom: string;
    code: string;
  };
  bonCommande?: {
    id: string;
    numero: string;
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
    code?: string;
  };
}

interface PaginatedFacturesView {
  data: FactureView[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface FactureReferences {
  exerciceId: string;
  fournisseurId: string;
  bonCommandeId?: string;
  engagementId?: string;
  ligneBudgetaireId?: string;
  projetId?: string;
}

interface BonCommandeScope {
  id: string;
  fournisseur_id: string;
  engagement_id: string | null;
  ligne_budgetaire_id: string | null;
  projet_id: string | null;
  statut: 'brouillon' | 'valide' | 'en_cours' | 'receptionne' | 'facture' | 'annule';
}

@Injectable()
export class FacturesService {
  constructor(
    private readonly postgresService: PostgresService,
    private readonly ecrituresComptablesService: EcrituresComptablesService,
    private readonly exerciceClotureService: ExerciceClotureService = {
      assertExerciceMutable: async () => undefined
    } as unknown as ExerciceClotureService
  ) {}

  async getAll(actor: AuthenticatedUser, exerciceId?: string): Promise<FactureView[]> {
    const values: unknown[] = [actor.tenantId];
    let index = 2;

    let filterSql = 'WHERE f.client_id = $1';
    if (exerciceId) {
      filterSql += `\n  AND f.exercice_id = $${index}`;
      values.push(exerciceId);
      index += 1;
    }

    const result = await this.postgresService.query<FactureRow>(
      this.baseSelect() +
        `
${filterSql}
ORDER BY f.date_facture DESC, f.created_at DESC
        `,
      values
    );

    return result.rows.map((row) => this.mapRowToView(row));
  }

  async getPaginated(actor: AuthenticatedUser, query: FacturesPaginatedQueryDto): Promise<PaginatedFacturesView> {
    const page = query.page || 1;
    const pageSize = query.pageSize || 25;
    const offset = (page - 1) * pageSize;

    const values: unknown[] = [actor.tenantId];
    let index = 2;

    const conditions: string[] = ['f.client_id = $1'];

    if (query.exerciceId) {
      conditions.push(`f.exercice_id = $${index}`);
      values.push(query.exerciceId);
      index += 1;
    }

    if (query.statut) {
      conditions.push(`f.statut = $${index}`);
      values.push(query.statut);
      index += 1;
    }

    if (query.fournisseurId) {
      conditions.push(`f.fournisseur_id = $${index}`);
      values.push(query.fournisseurId);
      index += 1;
    }

    if (query.dateDebut) {
      conditions.push(`f.date_facture >= $${index}`);
      values.push(query.dateDebut);
      index += 1;
    }

    if (query.dateFin) {
      conditions.push(`f.date_facture <= $${index}`);
      values.push(query.dateFin);
      index += 1;
    }

    if (query.searchTerm?.trim()) {
      const pattern = `%${query.searchTerm.trim()}%`;
      conditions.push(`(f.numero ILIKE $${index} OR f.objet ILIKE $${index})`);
      values.push(pattern);
      index += 1;
    }

    const whereSql = `WHERE ${conditions.join('\n  AND ')}`;

    const countResult = await this.postgresService.query<{ total: string | number }>(
      `
        SELECT COUNT(*)::bigint AS total
        FROM public.factures f
        ${whereSql}
      `,
      values
    );

    const totalCount = Number(countResult.rows[0]?.total ?? 0);
    const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);

    const sortColumn = this.mapSortColumn(query.sortBy);
    const sortOrder = query.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const rowsResult = await this.postgresService.query<FactureRow>(
      this.baseSelect() +
        `
${whereSql}
ORDER BY ${sortColumn} ${sortOrder}, f.created_at DESC
LIMIT $${index} OFFSET $${index + 1}
        `,
      [...values, pageSize, offset]
    );

    return {
      data: rowsResult.rows.map((row) => this.mapRowToView(row)),
      totalCount,
      page,
      pageSize,
      totalPages
    };
  }

  async getById(actor: AuthenticatedUser, id: string): Promise<FactureView> {
    const result = await this.postgresService.query<FactureRow>(
      this.baseSelect() +
        `
          WHERE f.client_id = $1
            AND f.id = $2
          LIMIT 1
        `,
      [actor.tenantId, id]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException('Facture introuvable');
    }

    return this.mapRowToView(row);
  }

  async create(actor: AuthenticatedUser, payload: CreateFactureDto): Promise<FactureView> {
    await this.exerciceClotureService.assertExerciceMutable(actor, payload.exerciceId, 'création de facture');
    this.ensureRequiredFactureMetadata(payload);
    const references = await this.resolveFactureReferences(actor, {
      exerciceId: payload.exerciceId,
      fournisseurId: payload.fournisseurId,
      bonCommandeId: payload.bonCommandeId,
      engagementId: payload.engagementId,
      ligneBudgetaireId: payload.ligneBudgetaireId,
      projetId: payload.projetId
    });

    await this.ensureBonCommandeAmountConstraint(payload.bonCommandeId, payload.montantTTC);

    const exerciceCode = await this.resolveExerciceCode(actor.tenantId, payload.exerciceId);

    const numero = await this.generateNextNumero(actor.tenantId, payload.exerciceId, exerciceCode);

    const insertResult = await this.postgresService.query<{ id: string }>(
      `
        INSERT INTO public.factures (
          client_id,
          exercice_id,
          numero,
          date_facture,
          date_echeance,
          fournisseur_id,
          bon_commande_id,
          engagement_id,
          ligne_budgetaire_id,
          projet_id,
          objet,
          numero_facture_fournisseur,
          reference_piece,
          montant_ht,
          montant_tva,
          montant_ttc,
          montant_liquide,
          statut,
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
          $11,
          $12,
          $13,
          $14,
          $15,
          $16,
          'brouillon',
          $17,
          $18,
          $19
        )
        RETURNING id
      `,
      [
        actor.tenantId,
        payload.exerciceId,
        numero,
        payload.dateFacture,
        payload.dateEcheance?.trim() || null,
        references.fournisseurId,
        references.bonCommandeId ?? null,
        references.engagementId ?? null,
        references.ligneBudgetaireId ?? null,
        references.projetId ?? null,
        payload.objet,
        payload.numeroFactureFournisseur?.trim(),
        payload.referencePiece?.trim(),
        payload.montantHT,
        payload.montantTVA,
        payload.montantTTC,
        payload.montantLiquide ?? 0,
        payload.observations?.trim() || null,
        actor.sub
      ]
    );

    const createdId = insertResult.rows[0]?.id;
    if (!createdId) {
      throw new NotFoundException('Facture non créée');
    }

    return this.getById(actor, createdId);
  }

  async update(actor: AuthenticatedUser, id: string, payload: UpdateFactureDto): Promise<FactureView> {
    const current = await this.postgresService.query<{
      id: string;
      exercice_id: string;
      statut: 'brouillon' | 'validee' | 'payee' | 'annulee';
      bon_commande_id: string | null;
      montant_ttc: string | number;
    }>(
      `
        SELECT id, exercice_id, statut, bon_commande_id, montant_ttc
        FROM public.factures
        WHERE id = $1
          AND client_id = $2
        LIMIT 1
      `,
      [id, actor.tenantId]
    );

    const facture = current.rows[0];
    if (!facture) {
      throw new NotFoundException('Facture introuvable');
    }

    await this.exerciceClotureService.assertExerciceMutable(actor, facture.exercice_id, 'mise à jour de facture');

    const isAnnulation = payload.statut === 'annulee';

    if (!isAnnulation) {
      const ecritures = await this.postgresService.query<{ id: string }>(
        `
          SELECT id
          FROM public.ecritures_comptables
          WHERE facture_id = $1
            AND statut_ecriture = 'validee'
          LIMIT 1
        `,
        [id]
      );

      if (ecritures.rows.length > 0) {
        throw new BadRequestException(
          'Cette facture ne peut plus être modifiée car elle a déjà été comptabilisée.\n\n' +
            'Pour effectuer une correction, vous devez l\'annuler puis créer une nouvelle facture.'
        );
      }
    }

    if (!isAnnulation && facture.statut !== 'brouillon' && facture.statut !== 'validee') {
      throw new BadRequestException('Seules les factures en brouillon ou validées peuvent être modifiées');
    }

    if (payload.statut !== undefined || payload.dateValidation !== undefined) {
      throw new BadRequestException(
        'Transition interdite via mise a jour generique: utilisez /factures/:id/valider, /factures/:id/marquer-payee ou /factures/:id/annuler'
      );
    }

    const nextBonCommandeId = payload.bonCommandeId !== undefined ? payload.bonCommandeId : facture.bon_commande_id;
    const nextMontantTTC = payload.montantTTC !== undefined ? payload.montantTTC : Number(facture.montant_ttc ?? 0);
    const nextExerciceIdResult = await this.postgresService.query<{ exercice_id: string; fournisseur_id: string; engagement_id: string | null; ligne_budgetaire_id: string | null; projet_id: string | null }>(
      `
        SELECT exercice_id, fournisseur_id, engagement_id, ligne_budgetaire_id, projet_id
        FROM public.factures
        WHERE id = $1
          AND client_id = $2
        LIMIT 1
      `,
      [id, actor.tenantId]
    );
    const currentScope = nextExerciceIdResult.rows[0];
    if (!currentScope) {
      throw new NotFoundException('Facture introuvable');
    }

    const resolvedReferences = await this.resolveFactureReferences(actor, {
      exerciceId: currentScope.exercice_id,
      fournisseurId: payload.fournisseurId ?? currentScope.fournisseur_id,
      bonCommandeId: payload.bonCommandeId !== undefined ? payload.bonCommandeId ?? undefined : facture.bon_commande_id ?? undefined,
      engagementId: payload.engagementId !== undefined ? payload.engagementId ?? undefined : currentScope.engagement_id ?? undefined,
      ligneBudgetaireId:
        payload.ligneBudgetaireId !== undefined ? payload.ligneBudgetaireId ?? undefined : currentScope.ligne_budgetaire_id ?? undefined,
      projetId: payload.projetId !== undefined ? payload.projetId ?? undefined : currentScope.projet_id ?? undefined
    });

    if (payload.numeroFactureFournisseur !== undefined && !payload.numeroFactureFournisseur?.trim()) {
      throw new BadRequestException(
        "Le numero de facture fournisseur est obligatoire pour garantir la traçabilité documentaire"
      );
    }
    if (payload.referencePiece !== undefined && !payload.referencePiece?.trim()) {
      throw new BadRequestException('La reference de piece justificative est obligatoire pour la tracabilite facture');
    }

    await this.ensureBonCommandeAmountConstraint(nextBonCommandeId ?? undefined, nextMontantTTC, id);

    const keys = Object.keys(payload) as Array<keyof UpdateFactureDto>;
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
      if (key === 'fournisseurId') {
        setClauses.push(`fournisseur_id = $${index}`);
        values.push(resolvedReferences.fournisseurId);
        index += 1;
        continue;
      }
      if (key === 'bonCommandeId') {
        setClauses.push(`bon_commande_id = $${index}`);
        values.push(resolvedReferences.bonCommandeId ?? null);
        index += 1;
        continue;
      }
      if (key === 'engagementId') {
        setClauses.push(`engagement_id = $${index}`);
        values.push(resolvedReferences.engagementId ?? null);
        index += 1;
        continue;
      }
      if (key === 'ligneBudgetaireId') {
        setClauses.push(`ligne_budgetaire_id = $${index}`);
        values.push(resolvedReferences.ligneBudgetaireId ?? null);
        index += 1;
        continue;
      }
      if (key === 'projetId') {
        setClauses.push(`projet_id = $${index}`);
        values.push(resolvedReferences.projetId ?? null);
        index += 1;
        continue;
      }

      setClauses.push(`${this.mapUpdateKeyToColumn(key)} = $${index}`);
      values.push(this.normalizeUpdateValue(key, value));
      index += 1;
    }

    if (setClauses.length === 0) {
      return this.getById(actor, id);
    }

    setClauses.push('updated_at = now()');
    values.push(id, actor.tenantId);

    const result = await this.postgresService.query(
      `
        UPDATE public.factures
        SET ${setClauses.join(', ')}
        WHERE id = $${index}
          AND client_id = $${index + 1}
      `,
      values
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new NotFoundException('Facture introuvable');
    }

    return this.getById(actor, id);
  }

  async valider(actor: AuthenticatedUser, id: string): Promise<FactureView> {
    const facture = await this.getById(actor, id);
    await this.exerciceClotureService.assertExerciceMutable(actor, facture.exerciceId, 'validation de facture');

    if (facture.statut !== 'brouillon') {
      throw new BadRequestException('Transition interdite: seule une facture en brouillon peut être validée');
    }

    const result = await this.postgresService.query(
      `
        UPDATE public.factures
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
      throw new NotFoundException('Facture introuvable');
    }

    const updated = await this.getById(actor, id);
    await this.generateEcrituresForFacture(actor, updated);
    return updated;
  }

  async marquerPayee(actor: AuthenticatedUser, id: string): Promise<FactureView> {
    const facture = await this.getById(actor, id);
    await this.exerciceClotureService.assertExerciceMutable(actor, facture.exerciceId, 'paiement de facture');

    if (facture.statut !== 'validee') {
      throw new BadRequestException('Transition interdite: seule une facture validée peut être marquée comme payée');
    }

    const result = await this.postgresService.query(
      `
        UPDATE public.factures
        SET
          statut = 'payee',
          updated_at = now()
        WHERE id = $1
          AND client_id = $2
      `,
      [id, actor.tenantId]
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new NotFoundException('Facture introuvable');
    }

    return this.getById(actor, id);
  }

  async annuler(actor: AuthenticatedUser, id: string, motif: string): Promise<FactureView> {
    const facture = await this.getById(actor, id);
    await this.exerciceClotureService.assertExerciceMutable(actor, facture.exerciceId, 'annulation de facture');

    if (facture.statut === 'payee') {
      throw new BadRequestException('Une facture payée ne peut pas être annulée');
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
        WHERE facture_id = $1
          AND client_id = $2
          AND exercice_id = $3
          AND statut_ecriture = 'validee'
      `,
      [id, actor.tenantId, facture.exerciceId]
    );

    if (ecritures.rows.length > 0) {
      await this.ecrituresComptablesService.createContrepassations(actor, ecritures.rows, {
        motif,
        libellePrefix: 'Annulation',
        expectedExerciceId: facture.exerciceId,
        expectedSourceId: id
      });
    }

    const result = await this.postgresService.query(
      `
        UPDATE public.factures
        SET
          statut = 'annulee',
          observations = $1,
          updated_at = now()
        WHERE id = $2
          AND client_id = $3
      `,
      [motif, id, actor.tenantId]
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new NotFoundException('Facture introuvable');
    }

    return this.getById(actor, id);
  }

  async delete(actor: AuthenticatedUser, id: string): Promise<void> {
    const facture = await this.getById(actor, id);
    await this.exerciceClotureService.assertExerciceMutable(actor, facture.exerciceId, 'suppression de facture');

    const result = await this.postgresService.query(
      `
        DELETE FROM public.factures
        WHERE id = $1
          AND client_id = $2
      `,
      [id, actor.tenantId]
    );

    if ((result.rowCount ?? 0) === 0) {
      throw new NotFoundException('Facture introuvable');
    }
  }

  async genererNumero(actor: AuthenticatedUser, exerciceId: string): Promise<{ numero: string }> {
    const exercice = await this.postgresService.query<{ code: string }>(
      `
        SELECT code
        FROM public.exercices
        WHERE id = $1
        LIMIT 1
      `,
      [exerciceId]
    );

    const exerciceCode = exercice.rows[0]?.code;
    if (!exerciceCode) {
      throw new NotFoundException('Exercice introuvable');
    }

    const numero = await this.generateNextNumero(actor.tenantId, exerciceId, exerciceCode);
    return { numero };
  }

  async generateTestData(
    actor: AuthenticatedUser,
    payload: GenerateTestFacturesDto
  ): Promise<{ success: boolean; count: number; message: string }> {
    const exercice = await this.postgresService.query<FactureGenerationContext>(
      `
        SELECT code, date_debut, date_fin
        FROM public.exercices
        WHERE id = $1
        LIMIT 1
      `,
      [payload.exerciceId]
    );

    const exerciceRow = exercice.rows[0];
    if (!exerciceRow) {
      throw new NotFoundException('Exercice introuvable');
    }

    const fournisseurs = await this.postgresService.query<{ id: string }>(
      `
        SELECT id
        FROM public.fournisseurs
        WHERE client_id = $1
        ORDER BY created_at DESC
        LIMIT 20
      `,
      [actor.tenantId]
    );

    if (fournisseurs.rows.length === 0) {
      throw new BadRequestException('Aucun fournisseur trouvé pour ce client');
    }

    const lignesBudgetaires = await this.postgresService.query<{ id: string }>(
      `
        SELECT id
        FROM public.lignes_budgetaires
        WHERE client_id = $1
          AND exercice_id = $2
        ORDER BY created_at DESC
        LIMIT 20
      `,
      [actor.tenantId, payload.exerciceId]
    );

    if (lignesBudgetaires.rows.length === 0) {
      throw new BadRequestException('Aucune ligne budgétaire trouvée pour cet exercice');
    }

    const statuts: Array<'brouillon' | 'validee' | 'payee' | 'annulee'> = ['brouillon', 'validee', 'payee', 'annulee'];
    const objets = [
      'Fournitures de bureau',
      'Matériel informatique',
      'Prestations de service',
      'Maintenance équipements',
      'Formation professionnelle',
      'Logiciels et licences',
      'Mobilier de bureau',
      'Consommables',
      'Services de nettoyage',
      "Travaux d'aménagement"
    ];

    let nextSequence = await this.getNextFactureSequence(actor.tenantId, payload.exerciceId, exerciceRow.code);
    const startDate = new Date(exerciceRow.date_debut);
    const endDate = new Date(exerciceRow.date_fin);

    const rows: unknown[][] = [];
    for (let index = 0; index < payload.count; index += 1) {
      const montantHT = this.randomInt(500, 50_000);
      const montantTVA = Math.round(montantHT * 0.2);
      const montantTTC = montantHT + montantTVA;
      const statut = statuts[this.randomInt(0, statuts.length - 1)];
      const dateFacture = this.randomDate(startDate, endDate);
      const dateEcheance = this.randomDate(new Date(dateFacture), endDate);

      const numero = `FAC/${exerciceRow.code}/${String(nextSequence).padStart(4, '0')}`;
      nextSequence += 1;

      const fournisseurId = fournisseurs.rows[this.randomInt(0, fournisseurs.rows.length - 1)].id;
      const ligneBudgetaireId = lignesBudgetaires.rows[this.randomInt(0, lignesBudgetaires.rows.length - 1)].id;

      rows.push([
        actor.tenantId,
        payload.exerciceId,
        numero,
        dateFacture.toISOString().split('T')[0],
        dateEcheance.toISOString().split('T')[0],
        fournisseurId,
        ligneBudgetaireId,
        objets[this.randomInt(0, objets.length - 1)],
        `F-${this.randomInt(1000, 9999)}`,
        montantHT,
        montantTVA,
        montantTTC,
        statut === 'payee' ? montantTTC : 0,
        statut,
        statut !== 'brouillon' ? dateFacture.toISOString().split('T')[0] : null,
        Math.random() > 0.7 ? 'Facture de test générée automatiquement' : null,
        actor.sub
      ]);
    }

    const batchSize = 100;
    let insertedCount = 0;

    for (let start = 0; start < rows.length; start += batchSize) {
      const batch = rows.slice(start, start + batchSize);
      const values: unknown[] = [];
      const placeholders: string[] = [];

      batch.forEach((row, rowIndex) => {
        const base = rowIndex * 17;
        placeholders.push(
          `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12}, $${base + 13}, $${base + 14}, $${base + 15}, $${base + 16}, $${base + 17})`
        );
        values.push(...row);
      });

      await this.postgresService.query(
        `
          INSERT INTO public.factures (
            client_id,
            exercice_id,
            numero,
            date_facture,
            date_echeance,
            fournisseur_id,
            ligne_budgetaire_id,
            objet,
            numero_facture_fournisseur,
            montant_ht,
            montant_tva,
            montant_ttc,
            montant_liquide,
            statut,
            date_validation,
            observations,
            created_by
          )
          VALUES ${placeholders.join(', ')}
        `,
        values
      );

      insertedCount += batch.length;
    }

    return {
      success: true,
      count: insertedCount,
      message: `${insertedCount} factures de test générées avec succès`
    };
  }

  async getStats(actor: AuthenticatedUser, exerciceId?: string): Promise<{
    nombreTotal: number;
    nombreBrouillon: number;
    nombreValidee: number;
    nombrePayee: number;
    montantTotal: number;
    montantBrouillon: number;
    montantValidee: number;
    montantLiquide: number;
  }> {
    const values: unknown[] = [actor.tenantId];
    let index = 2;

    let whereSql = 'WHERE client_id = $1';
    if (exerciceId) {
      whereSql += `\n  AND exercice_id = $${index}`;
      values.push(exerciceId);
      index += 1;
    }

    const result = await this.postgresService.query<FactureStatsRow>(
      `
        SELECT
          COUNT(*) AS nombre_total,
          COUNT(*) FILTER (WHERE statut = 'brouillon') AS nombre_brouillon,
          COUNT(*) FILTER (WHERE statut = 'validee') AS nombre_validee,
          COUNT(*) FILTER (WHERE statut = 'payee') AS nombre_payee,
          COALESCE(SUM(montant_ttc), 0) AS montant_total,
          COALESCE(SUM(montant_ttc) FILTER (WHERE statut = 'brouillon'), 0) AS montant_brouillon,
          COALESCE(SUM(montant_ttc) FILTER (WHERE statut = 'validee'), 0) AS montant_validee,
          COALESCE(SUM(montant_liquide), 0) AS montant_liquide
        FROM public.factures
        ${whereSql}
      `,
      values
    );

    const row = result.rows[0];

    return {
      nombreTotal: Number(row?.nombre_total ?? 0),
      nombreBrouillon: Number(row?.nombre_brouillon ?? 0),
      nombreValidee: Number(row?.nombre_validee ?? 0),
      nombrePayee: Number(row?.nombre_payee ?? 0),
      montantTotal: Number(row?.montant_total ?? 0),
      montantBrouillon: Number(row?.montant_brouillon ?? 0),
      montantValidee: Number(row?.montant_validee ?? 0),
      montantLiquide: Number(row?.montant_liquide ?? 0)
    };
  }

  private async ensureBonCommandeAmountConstraint(
    bonCommandeId: string | undefined,
    montantTTC: number,
    currentFactureId?: string
  ): Promise<void> {
    if (!bonCommandeId) {
      return;
    }

    const bc = await this.postgresService.query<{ montant: string | number }>(
      `
        SELECT montant
        FROM public.bons_commande
        WHERE id = $1
        LIMIT 1
      `,
      [bonCommandeId]
    );

    const bcMontant = Number(bc.rows[0]?.montant ?? 0);
    if (bc.rows.length === 0) {
      throw new NotFoundException('Bon de commande introuvable');
    }

    const existing = await this.postgresService.query<{ montant_ttc: string | number }>(
      `
        SELECT montant_ttc
        FROM public.factures
        WHERE bon_commande_id = $1
          AND statut != 'annulee'
          ${currentFactureId ? 'AND id != $2' : ''}
      `,
      currentFactureId ? [bonCommandeId, currentFactureId] : [bonCommandeId]
    );

    const montantDejaFacture = existing.rows.reduce((sum, row) => sum + Number(row.montant_ttc ?? 0), 0);
    const montantTotal = montantDejaFacture + Number(montantTTC || 0);

    if (montantTotal > bcMontant) {
      throw new BadRequestException(
        `Le montant total des factures (${montantTotal.toLocaleString('fr-FR')} €) ` +
          `dépasserait le montant du bon de commande (${bcMontant.toLocaleString('fr-FR')} €). ` +
          `Montant déjà facturé : ${montantDejaFacture.toLocaleString('fr-FR')} €. ` +
          `Montant disponible : ${(bcMontant - montantDejaFacture).toLocaleString('fr-FR')} €.`
      );
    }
  }

  private async resolveExerciceCode(tenantId: string, exerciceId: string): Promise<string> {
    const exerciceResult = await this.postgresService.query<{ code: string }>(
      `
        SELECT code
        FROM public.exercices
        WHERE id = $1
          AND client_id = $2
        LIMIT 1
      `,
      [exerciceId, tenantId]
    );

    const exerciceCode = exerciceResult.rows[0]?.code;
    if (!exerciceCode) {
      throw new NotFoundException('Exercice introuvable pour ce tenant');
    }

    return exerciceCode;
  }

  private async resolveFactureReferences(actor: AuthenticatedUser, refs: FactureReferences): Promise<FactureReferences> {
    const { exerciceId } = refs;
    await this.resolveExerciceCode(actor.tenantId, exerciceId);

    const fournisseur = await this.postgresService.query<{ id: string }>(
      `
        SELECT id
        FROM public.fournisseurs
        WHERE id = $1
          AND client_id = $2
        LIMIT 1
      `,
      [refs.fournisseurId, actor.tenantId]
    );
    if (!fournisseur.rows[0]) {
      throw new BadRequestException('Fournisseur introuvable pour ce tenant');
    }

    const resolved: FactureReferences = { ...refs };
    let bc: BonCommandeScope | undefined;
    if (refs.bonCommandeId) {
      const bcResult = await this.postgresService.query<BonCommandeScope>(
        `
          SELECT id, fournisseur_id, engagement_id, ligne_budgetaire_id, projet_id, statut
          FROM public.bons_commande
          WHERE id = $1
            AND client_id = $2
            AND exercice_id = $3
          LIMIT 1
        `,
        [refs.bonCommandeId, actor.tenantId, exerciceId]
      );
      bc = bcResult.rows[0];
      if (!bc) {
        throw new BadRequestException('Le bon de commande est introuvable pour ce tenant/exercice');
      }
      if (!['valide', 'en_cours', 'receptionne', 'facture'].includes(bc.statut)) {
        throw new BadRequestException(
          'Le bon de commande doit etre valide, en cours ou receptionne pour accepter une facture'
        );
      }

      if (refs.fournisseurId !== bc.fournisseur_id) {
        throw new BadRequestException('Incoherence fournisseur: la facture doit utiliser le fournisseur du bon de commande');
      }

      resolved.engagementId = bc.engagement_id ?? undefined;
      resolved.ligneBudgetaireId = bc.ligne_budgetaire_id ?? undefined;
      resolved.projetId = bc.projet_id ?? undefined;
    }

    if (resolved.engagementId) {
      const engagement = await this.postgresService.query<{ id: string; ligne_budgetaire_id: string | null; projet_id: string | null }>(
        `
          SELECT id, ligne_budgetaire_id, projet_id
          FROM public.engagements
          WHERE id = $1
            AND client_id = $2
            AND exercice_id = $3
          LIMIT 1
        `,
        [resolved.engagementId, actor.tenantId, exerciceId]
      );
      const engagementScope = engagement.rows[0];
      if (!engagementScope) {
        throw new BadRequestException("L'engagement de la facture est hors scope tenant/exercice");
      }
      if (resolved.ligneBudgetaireId && engagementScope.ligne_budgetaire_id && resolved.ligneBudgetaireId !== engagementScope.ligne_budgetaire_id) {
        throw new BadRequestException(
          "Incoherence de chainage: la ligne budgetaire facture ne correspond pas a l'engagement"
        );
      }
      if (resolved.projetId && engagementScope.projet_id && resolved.projetId !== engagementScope.projet_id) {
        throw new BadRequestException("Incoherence de chainage: le projet facture ne correspond pas a l'engagement");
      }
    }

    if (resolved.ligneBudgetaireId) {
      const ligne = await this.postgresService.query<{ id: string }>(
        `
          SELECT id
          FROM public.lignes_budgetaires
          WHERE id = $1
            AND client_id = $2
            AND exercice_id = $3
          LIMIT 1
        `,
        [resolved.ligneBudgetaireId, actor.tenantId, exerciceId]
      );
      if (!ligne.rows[0]) {
        throw new BadRequestException('La ligne budgetaire est hors scope tenant/exercice');
      }
    }

    if (resolved.projetId) {
      const projet = await this.postgresService.query<{ id: string }>(
        `
          SELECT id
          FROM public.projets
          WHERE id = $1
            AND client_id = $2
            AND exercice_id = $3
          LIMIT 1
        `,
        [resolved.projetId, actor.tenantId, exerciceId]
      );
      if (!projet.rows[0]) {
        throw new BadRequestException('Le projet est hors scope tenant/exercice');
      }
    }

    if (bc && bc.engagement_id && resolved.engagementId && bc.engagement_id !== resolved.engagementId) {
      throw new BadRequestException("Incoherence de chainage: l'engagement doit correspondre a celui du bon de commande");
    }

    return resolved;
  }

  private ensureRequiredFactureMetadata(payload: CreateFactureDto): void {
    if (!payload.numeroFactureFournisseur?.trim()) {
      throw new BadRequestException(
        "Le numero de facture fournisseur est obligatoire pour garantir la tracabilite documentaire"
      );
    }
    if (!payload.referencePiece?.trim()) {
      throw new BadRequestException('La reference de piece justificative est obligatoire pour la tracabilite facture');
    }
  }

  private assertAllowedStatusTransition(
    current: 'brouillon' | 'validee' | 'payee' | 'annulee',
    next: 'brouillon' | 'validee' | 'payee' | 'annulee'
  ): void {
    if (current === next) {
      return;
    }

    const allowedTransitions: Record<'brouillon' | 'validee' | 'payee' | 'annulee', ReadonlyArray<string>> = {
      brouillon: ['validee', 'annulee'],
      validee: ['payee', 'annulee'],
      payee: [],
      annulee: []
    };

    if (!allowedTransitions[current].includes(next)) {
      throw new BadRequestException(
        `Transition facture interdite: ${current} -> ${next}. Transitions autorisees: ${allowedTransitions[current].join(', ') || 'aucune'}`
      );
    }
  }

  private async generateNextNumero(clientId: string, exerciceId: string, exerciceCode: string): Promise<string> {
    const pattern = `FAC/${exerciceCode}/%`;

    const result = await this.postgresService.query<{ numero: string | null }>(
      `
        SELECT numero
        FROM public.factures
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
    const next = match ? Number(match[1]) + 1 : 1;

    return `FAC/${exerciceCode}/${String(next).padStart(4, '0')}`;
  }

  private async generateEcrituresForFacture(actor: AuthenticatedUser, facture: FactureView): Promise<void> {
    await this.ecrituresComptablesService.ensureGeneratedForOperation(actor, 'facture', facture.id, facture.exerciceId);
  }

  private async getNextFactureSequence(clientId: string, exerciceId: string, exerciceCode: string): Promise<number> {
    const pattern = `FAC/${exerciceCode}/%`;
    const result = await this.postgresService.query<{ numero: string | null }>(
      `
        SELECT numero
        FROM public.factures
        WHERE client_id = $1
          AND exercice_id = $2
          AND numero LIKE $3
        ORDER BY numero DESC
        LIMIT 1
      `,
      [clientId, exerciceId, pattern]
    );

    const match = result.rows[0]?.numero?.match(/\/(\d+)$/);
    return match ? Number(match[1]) + 1 : 1;
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private randomDate(start: Date, end: Date): Date {
    const startMs = start.getTime();
    const endMs = end.getTime();
    if (endMs <= startMs) {
      return new Date(startMs);
    }
    const value = startMs + Math.random() * (endMs - startMs);
    return new Date(value);
  }

  private mapSortColumn(sortBy?: string): string {
    switch (sortBy) {
      case 'numero':
        return 'f.numero';
      case 'objet':
        return 'f.objet';
      case 'montant_ttc':
      case 'montantTTC':
        return 'f.montant_ttc';
      case 'statut':
        return 'f.statut';
      case 'date_facture':
      case 'dateFacture':
      default:
        return 'f.date_facture';
    }
  }

  private mapUpdateKeyToColumn(key: keyof UpdateFactureDto): string {
    const map: Record<keyof UpdateFactureDto, string> = {
      dateFacture: 'date_facture',
      dateEcheance: 'date_echeance',
      fournisseurId: 'fournisseur_id',
      bonCommandeId: 'bon_commande_id',
      engagementId: 'engagement_id',
      ligneBudgetaireId: 'ligne_budgetaire_id',
      projetId: 'projet_id',
      objet: 'objet',
      numeroFactureFournisseur: 'numero_facture_fournisseur',
      referencePiece: 'reference_piece',
      montantHT: 'montant_ht',
      montantTVA: 'montant_tva',
      montantTTC: 'montant_ttc',
      montantLiquide: 'montant_liquide',
      statut: 'statut',
      dateValidation: 'date_validation',
      observations: 'observations'
    };

    return map[key];
  }

  private normalizeUpdateValue(key: keyof UpdateFactureDto, value: unknown): unknown {
    if (value === undefined) {
      return undefined;
    }

    if (typeof value === 'string') {
      if (['bonCommandeId', 'engagementId', 'ligneBudgetaireId', 'projetId', 'dateEcheance', 'dateValidation'].includes(key)) {
        return value.trim() ? value.trim() : null;
      }

      if (['numeroFactureFournisseur', 'referencePiece', 'observations'].includes(key)) {
        return value.trim() ? value.trim() : null;
      }

      return value;
    }

    return value;
  }

  private baseSelect(): string {
    return `
      SELECT
        f.*,
        fo.nom AS fournisseur_nom,
        fo.code AS fournisseur_code,
        bc.numero AS bon_commande_numero,
        e.numero AS engagement_numero,
        lb.libelle AS ligne_budgetaire_libelle,
        p.nom AS projet_nom,
        p.code AS projet_code,
        COALESCE(ec.count, 0) AS ecritures_count
      FROM public.factures f
      LEFT JOIN public.fournisseurs fo ON fo.id = f.fournisseur_id
      LEFT JOIN public.bons_commande bc ON bc.id = f.bon_commande_id
      LEFT JOIN public.engagements e ON e.id = f.engagement_id
      LEFT JOIN public.lignes_budgetaires lb ON lb.id = f.ligne_budgetaire_id
      LEFT JOIN public.projets p ON p.id = f.projet_id
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::bigint AS count
        FROM public.ecritures_comptables ec
        WHERE ec.facture_id = f.id
      ) ec ON true
    `;
  }

  private mapRowToView(row: FactureRow): FactureView {
    return {
      id: row.id,
      clientId: row.client_id,
      exerciceId: row.exercice_id,
      numero: row.numero,
      dateFacture: this.toDateOnly(row.date_facture),
      dateEcheance: row.date_echeance ? this.toDateOnly(row.date_echeance) : undefined,
      fournisseurId: row.fournisseur_id,
      bonCommandeId: row.bon_commande_id ?? undefined,
      engagementId: row.engagement_id ?? undefined,
      ligneBudgetaireId: row.ligne_budgetaire_id ?? undefined,
      projetId: row.projet_id ?? undefined,
      objet: row.objet,
      numeroFactureFournisseur: row.numero_facture_fournisseur ?? undefined,
      referencePiece: row.reference_piece ?? undefined,
      montantHT: Number(row.montant_ht ?? 0),
      montantTVA: Number(row.montant_tva ?? 0),
      montantTTC: Number(row.montant_ttc ?? 0),
      montantLiquide: Number(row.montant_liquide ?? 0),
      statut: row.statut,
      dateValidation: row.date_validation ? this.toDateOnly(row.date_validation) : undefined,
      observations: row.observations ?? undefined,
      createdAt: this.toIsoString(row.created_at),
      updatedAt: this.toIsoString(row.updated_at),
      createdBy: row.created_by ?? undefined,
      ecrituresCount: Number(row.ecritures_count ?? 0),
      fournisseur:
        row.fournisseur_nom && row.fournisseur_code
          ? {
              id: row.fournisseur_id,
              nom: row.fournisseur_nom,
              code: row.fournisseur_code
            }
          : undefined,
      bonCommande:
        row.bon_commande_id && row.bon_commande_numero
          ? {
              id: row.bon_commande_id,
              numero: row.bon_commande_numero
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
              nom: row.projet_nom,
              code: row.projet_code ?? undefined
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
