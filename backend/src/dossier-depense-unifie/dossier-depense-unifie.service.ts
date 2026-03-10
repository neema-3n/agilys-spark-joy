import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuthorizationAuditService } from '../auth/authorization-audit.service';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PostgresService } from '../common/postgres.service';
import type {
  DossierDepenseUnifieDetailLevel,
  DossierDepenseUnifieExportFormat,
  DossierDepenseUnifieExportQueryDto,
  DossierDepenseUnifieQueryDto
} from './dto/dossier-depense-unifie.dto';

interface DepenseChainRow {
  depense_id: string;
  depense_numero: string;
  depense_objet: string;
  depense_statut: string;
  depense_montant: string | number;
  depense_montant_paye: string | number;
  depense_date: string;
  depense_date_validation: string | null;
  depense_date_ordonnancement: string | null;
  depense_date_paiement: string | null;
  depense_created_at: string;
  depense_created_by: string | null;
  depense_observations: string | null;
  depense_reference_paiement: string | null;
  exercice_id: string;
  reservation_id: string | null;
  reservation_numero: string | null;
  reservation_statut: string | null;
  reservation_date: string | null;
  reservation_created_at: string | null;
  reservation_created_by: string | null;
  engagement_id: string | null;
  engagement_numero: string | null;
  engagement_statut: string | null;
  engagement_date: string | null;
  engagement_date_validation: string | null;
  engagement_created_at: string | null;
  engagement_created_by: string | null;
  fournisseur_id: string | null;
  fournisseur_code: string | null;
  fournisseur_nom: string | null;
  projet_id: string | null;
  projet_code: string | null;
  projet_nom: string | null;
}

interface BonCommandeRow {
  id: string;
  numero: string;
  statut: string;
  date_commande: string;
  date_validation: string | null;
  created_at: string;
  created_by: string | null;
  montant: string | number;
}

interface FactureRow {
  id: string;
  numero: string;
  statut: string;
  date_facture: string;
  date_echeance: string | null;
  created_at: string;
  created_by: string | null;
  montant_ttc: string | number;
  montant_liquide: string | number;
  reference_piece: string | null;
  numero_facture_fournisseur: string | null;
}

interface PaiementRow {
  id: string;
  numero: string;
  statut: string;
  date_paiement: string;
  created_at: string;
  created_by: string | null;
  montant: string | number;
  mode_paiement: string | null;
  reference_paiement: string | null;
  motif_annulation: string | null;
  motif_rejet: string | null;
}

interface OperationTresorerieRow {
  id: string;
  numero: string;
  type_operation: string;
  date_operation: string;
  piece_justificative: string | null;
  reference_bancaire: string | null;
  paiement_id: string | null;
  depense_id: string | null;
  created_at: string;
  created_by: string | null;
}

interface EcritureRow {
  id: string;
  numero_piece: string;
  type_operation: string;
  montant: string | number;
  depense_id: string | null;
  reservation_id: string | null;
  engagement_id: string | null;
  bon_commande_id: string | null;
  facture_id: string | null;
  paiement_id: string | null;
  created_at: string;
}

interface DossierFilters {
  exerciceId?: string;
  dateDebut?: string;
  dateFin?: string;
  detailLevel: DossierDepenseUnifieDetailLevel;
}

interface DossierTimelineEvent {
  id: string;
  type: string;
  label: string;
  timestamp: string;
  entityId: string;
  entityType: string;
  status?: string;
  amount?: number;
  actor?: {
    userId: string;
    action: string;
  };
  correlationId: string;
  details?: string;
}

interface DossierPreuve {
  id: string;
  type: 'reference-piece' | 'piece-justificative' | 'reference-paiement' | 'metadata-audit';
  label: string;
  source: string;
  value: string;
  entityId: string;
  entityType: string;
  missing: boolean;
}

interface DossierControle {
  code: string;
  label: string;
  status: 'ok' | 'warning';
  detail: string;
}

interface DossierEcarts {
  code: string;
  label: string;
  severity: 'low' | 'medium';
  detail: string;
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let crc = index;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) !== 0 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
    table[index] = crc >>> 0;
  }
  return table;
})();

@Injectable()
export class DossierDepenseUnifieService {
  private readonly logger = new Logger(DossierDepenseUnifieService.name);

  constructor(
    private readonly postgresService: PostgresService,
    private readonly authorizationAuditService: AuthorizationAuditService
  ) {}

  async getDossier(actor: AuthenticatedUser, depenseId: string, query: DossierDepenseUnifieQueryDto) {
    const filters = this.normalizeFilters(query);
    const chain = await this.loadDepenseChain(actor, depenseId, filters);

    if (!chain) {
      throw new NotFoundException(
        'Depense introuvable ou hors scope (tenant/exercice/periode). Action: verifier le depenseId et les filtres.'
      );
    }

    const [bonsCommande, factures, paiements] = await Promise.all([
      this.loadBonsCommande(actor.tenantId, chain.engagement_id),
      this.loadFactures(actor.tenantId, chain.depense_id),
      this.loadPaiements(actor.tenantId, chain.depense_id)
    ]);

    const [operationsTresorerie, ecritures] = await Promise.all([
      this.loadOperationsTresorerie(actor.tenantId, chain.depense_id, paiements.map((row) => row.id)),
      this.loadEcritures(
        actor.tenantId,
        chain.depense_id,
        chain.reservation_id,
        chain.engagement_id,
        bonsCommande.map((row) => row.id),
        factures.map((row) => row.id),
        paiements.map((row) => row.id)
      )
    ]);

    const timeline = this.buildTimeline(chain, bonsCommande, factures, paiements, operationsTresorerie, ecritures);
    const preuves = this.buildPreuves(chain, factures, paiements, operationsTresorerie);
    const controles = this.buildControles(chain, factures, paiements, preuves);
    const ecarts = this.buildEcarts(factures, preuves);

    const dossier = {
      dossierId: `dossier-${chain.depense_id}`,
      generatedAt: new Date().toISOString(),
      filters,
      depense: {
        id: chain.depense_id,
        numero: chain.depense_numero,
        objet: chain.depense_objet,
        statut: chain.depense_statut,
        montant: Number(chain.depense_montant ?? 0),
        montantPaye: Number(chain.depense_montant_paye ?? 0),
        dateDepense: chain.depense_date,
        createdAt: chain.depense_created_at,
        createdBy: chain.depense_created_by,
        fournisseur: chain.fournisseur_id
          ? {
              id: chain.fournisseur_id,
              code: chain.fournisseur_code,
              nom: chain.fournisseur_nom
            }
          : null,
        projet: chain.projet_id
          ? {
              id: chain.projet_id,
              code: chain.projet_code,
              nom: chain.projet_nom
            }
          : null
      },
      chaine: {
        reservation: chain.reservation_id
          ? {
              id: chain.reservation_id,
              numero: chain.reservation_numero,
              statut: chain.reservation_statut,
              date: chain.reservation_date
            }
          : null,
        engagement: chain.engagement_id
          ? {
              id: chain.engagement_id,
              numero: chain.engagement_numero,
              statut: chain.engagement_statut,
              date: chain.engagement_date
            }
          : null,
        bonsCommande: bonsCommande.map((row) => ({
          id: row.id,
          numero: row.numero,
          statut: row.statut,
          montant: Number(row.montant ?? 0),
          dateCommande: row.date_commande
        })),
        factures: factures.map((row) => ({
          id: row.id,
          numero: row.numero,
          statut: row.statut,
          montantTTC: Number(row.montant_ttc ?? 0),
          montantLiquide: Number(row.montant_liquide ?? 0),
          dateFacture: row.date_facture,
          referencePiece: row.reference_piece
        })),
        paiements: paiements.map((row) => ({
          id: row.id,
          numero: row.numero,
          statut: row.statut,
          montant: Number(row.montant ?? 0),
          datePaiement: row.date_paiement,
          modePaiement: row.mode_paiement,
          referencePaiement: row.reference_paiement
        }))
      },
      timeline,
      preuves,
      synthese: {
        controles,
        ecarts,
        indicateurs: {
          totalFactures: factures.length,
          totalPaiements: paiements.length,
          totalPreuves: preuves.filter((item) => !item.missing).length,
          preuvesManquantes: preuves.filter((item) => item.missing).length
        }
      },
      actionsUtilisateurs: timeline.filter((event) => event.actor)
    };

    if (filters.detailLevel === 'full') {
      return {
        ...dossier,
        traces: {
          operationsTresorerie: operationsTresorerie.map((row) => ({
            id: row.id,
            numero: row.numero,
            typeOperation: row.type_operation,
            dateOperation: row.date_operation,
            pieceJustificative: row.piece_justificative,
            referenceBancaire: row.reference_bancaire,
            paiementId: row.paiement_id,
            depenseId: row.depense_id
          })),
          ecritures: ecritures.map((row) => ({
            id: row.id,
            numeroPiece: row.numero_piece,
            typeOperation: row.type_operation,
            montant: Number(row.montant ?? 0),
            depenseId: row.depense_id,
            reservationId: row.reservation_id,
            engagementId: row.engagement_id,
            bonCommandeId: row.bon_commande_id,
            factureId: row.facture_id,
            paiementId: row.paiement_id,
            createdAt: row.created_at
          }))
        }
      };
    }

    return dossier;
  }

  async exportDossier(actor: AuthenticatedUser, depenseId: string, query: DossierDepenseUnifieExportQueryDto) {
    const dossier = await this.getDossier(actor, depenseId, query);

    this.authorizationAuditService.logDecision({
      userId: actor.sub,
      tenantId: actor.tenantId,
      action: `dossier-depense-unifie:export:${query.format}`,
      decision: 'allow'
    });

    this.logger.log(
      JSON.stringify({
        event: 'dossier_depense_unifie_exported',
        depenseId,
        tenantId: actor.tenantId,
        userId: actor.sub,
        format: query.format,
        timestamp: new Date().toISOString()
      })
    );

    if (query.format === 'pdf') {
      const filename = `dossier-depense-${depenseId}.pdf`;
      return {
        filename,
        mimeType: 'application/pdf',
        content: this.buildPdfDocument(dossier)
      };
    }

    const filename = `dossier-depense-${depenseId}.zip`;
    return {
      filename,
      mimeType: 'application/zip',
      content: this.buildZipArchive([
        {
          name: 'manifest.json',
          content: JSON.stringify(
            {
              dossierId: dossier.dossierId,
              generatedAt: dossier.generatedAt,
              depenseId,
              format: query.format,
              tenantId: actor.tenantId,
              userId: actor.sub
            },
            null,
            2
          )
        },
        { name: 'dossier.json', content: JSON.stringify(dossier, null, 2) },
        {
          name: 'preuves.txt',
          content: dossier.preuves
            .map((preuve: DossierPreuve) => `${preuve.type};${preuve.source};${preuve.value};missing=${preuve.missing}`)
            .join('\n')
        }
      ])
    };
  }

  private normalizeFilters(query: DossierDepenseUnifieQueryDto): DossierFilters {
    const detailLevel = query.detailLevel ?? 'standard';

    if ((query.dateDebut && !query.dateFin) || (!query.dateDebut && query.dateFin)) {
      throw new BadRequestException('Le filtre periode exige dateDebut et dateFin ensemble.');
    }

    if (query.dateDebut && query.dateFin && query.dateDebut > query.dateFin) {
      throw new BadRequestException('Periode invalide: dateDebut doit etre <= dateFin.');
    }

    return {
      exerciceId: query.exerciceId,
      dateDebut: query.dateDebut,
      dateFin: query.dateFin,
      detailLevel
    };
  }

  private async loadDepenseChain(actor: AuthenticatedUser, depenseId: string, filters: DossierFilters): Promise<DepenseChainRow | null> {
    const params: unknown[] = [actor.tenantId, depenseId];
    const where = ['d.client_id = $1', 'd.id = $2'];

    if (filters.exerciceId) {
      params.push(filters.exerciceId);
      where.push(`d.exercice_id = $${params.length}`);
    }

    if (filters.dateDebut && filters.dateFin) {
      params.push(filters.dateDebut, filters.dateFin);
      where.push(`d.date_depense >= $${params.length - 1}::date`);
      where.push(`d.date_depense <= $${params.length}::date`);
    }

    const result = await this.postgresService.query<DepenseChainRow>(
      `
        SELECT
          d.id AS depense_id,
          d.numero AS depense_numero,
          d.objet AS depense_objet,
          d.statut AS depense_statut,
          d.montant AS depense_montant,
          d.montant_paye AS depense_montant_paye,
          d.date_depense::text AS depense_date,
          d.date_validation::text AS depense_date_validation,
          d.date_ordonnancement::text AS depense_date_ordonnancement,
          d.date_paiement::text AS depense_date_paiement,
          d.created_at::text AS depense_created_at,
          d.created_by AS depense_created_by,
          d.observations AS depense_observations,
          d.reference_paiement AS depense_reference_paiement,
          d.exercice_id,
          COALESCE(d.reservation_credit_id, e.reservation_credit_id) AS reservation_id,
          rc.numero AS reservation_numero,
          rc.statut AS reservation_statut,
          rc.date_reservation::text AS reservation_date,
          rc.created_at::text AS reservation_created_at,
          rc.created_by AS reservation_created_by,
          d.engagement_id AS engagement_id,
          e.numero AS engagement_numero,
          e.statut AS engagement_statut,
          e.date_engagement::text AS engagement_date,
          e.date_validation::text AS engagement_date_validation,
          e.created_at::text AS engagement_created_at,
          e.created_by AS engagement_created_by,
          d.fournisseur_id,
          fr.code AS fournisseur_code,
          fr.nom AS fournisseur_nom,
          d.projet_id,
          p.code AS projet_code,
          p.nom AS projet_nom
        FROM public.depenses d
        LEFT JOIN public.engagements e ON e.id = d.engagement_id
        LEFT JOIN public.reservations_credits rc ON rc.id = COALESCE(d.reservation_credit_id, e.reservation_credit_id)
        LEFT JOIN public.fournisseurs fr ON fr.id = d.fournisseur_id
        LEFT JOIN public.projets p ON p.id = d.projet_id
        WHERE ${where.join('\n          AND ')}
        LIMIT 1
      `,
      params
    );

    return result.rows[0] ?? null;
  }

  private async loadBonsCommande(tenantId: string, engagementId: string | null): Promise<BonCommandeRow[]> {
    if (!engagementId) {
      return [];
    }

    const result = await this.postgresService.query<BonCommandeRow>(
      `
        SELECT
          bc.id,
          bc.numero,
          bc.statut,
          bc.date_commande::text AS date_commande,
          bc.date_validation::text AS date_validation,
          bc.created_at::text AS created_at,
          bc.created_by,
          bc.montant
        FROM public.bons_commande bc
        WHERE bc.client_id = $1
          AND bc.engagement_id = $2
        ORDER BY bc.date_commande ASC, bc.created_at ASC
      `,
      [tenantId, engagementId]
    );

    return result.rows;
  }

  private async loadFactures(tenantId: string, depenseId: string): Promise<FactureRow[]> {
    const result = await this.postgresService.query<FactureRow>(
      `
        WITH liens AS (
          SELECT df.facture_id
          FROM public.depense_factures df
          WHERE df.depense_id = $2
          UNION
          SELECT d.facture_id
          FROM public.depenses d
          WHERE d.id = $2
            AND d.facture_id IS NOT NULL
        )
        SELECT
          f.id,
          f.numero,
          f.statut,
          f.date_facture::text AS date_facture,
          f.date_echeance::text AS date_echeance,
          f.created_at::text AS created_at,
          f.created_by,
          f.montant_ttc,
          f.montant_liquide,
          f.reference_piece,
          f.numero_facture_fournisseur
        FROM public.factures f
        INNER JOIN liens l ON l.facture_id = f.id
        WHERE f.client_id = $1
        ORDER BY f.date_facture ASC, f.created_at ASC
      `,
      [tenantId, depenseId]
    );

    return result.rows;
  }

  private async loadPaiements(tenantId: string, depenseId: string): Promise<PaiementRow[]> {
    const result = await this.postgresService.query<PaiementRow>(
      `
        SELECT
          p.id,
          p.numero,
          p.statut,
          p.date_paiement::text AS date_paiement,
          p.created_at::text AS created_at,
          p.created_by,
          p.montant,
          p.mode_paiement,
          p.reference_paiement,
          p.motif_annulation,
          p.motif_rejet
        FROM public.paiements p
        WHERE p.client_id = $1
          AND p.depense_id = $2
        ORDER BY p.date_paiement ASC, p.created_at ASC
      `,
      [tenantId, depenseId]
    );

    return result.rows;
  }

  private async loadOperationsTresorerie(
    tenantId: string,
    depenseId: string,
    paiementIds: string[]
  ): Promise<OperationTresorerieRow[]> {
    const result = await this.postgresService.query<OperationTresorerieRow>(
      `
        SELECT
          ot.id,
          ot.numero,
          ot.type_operation,
          ot.date_operation::text AS date_operation,
          ot.piece_justificative,
          ot.reference_bancaire,
          ot.paiement_id,
          ot.depense_id,
          ot.created_at::text AS created_at,
          ot.created_by
        FROM public.operations_tresorerie ot
        WHERE ot.client_id = $1
          AND (
            ot.depense_id = $2
            OR (array_length($3::uuid[], 1) IS NOT NULL AND ot.paiement_id = ANY($3::uuid[]))
          )
        ORDER BY ot.date_operation ASC, ot.created_at ASC
      `,
      [tenantId, depenseId, paiementIds]
    );

    return result.rows;
  }

  private async loadEcritures(
    tenantId: string,
    depenseId: string,
    reservationId: string | null,
    engagementId: string | null,
    bonCommandeIds: string[],
    factureIds: string[],
    paiementIds: string[]
  ): Promise<EcritureRow[]> {
    const result = await this.postgresService.query<EcritureRow>(
      `
        SELECT
          ec.id,
          ec.numero_piece,
          ec.type_operation,
          ec.montant,
          ec.depense_id,
          ec.reservation_id,
          ec.engagement_id,
          ec.bon_commande_id,
          ec.facture_id,
          ec.paiement_id,
          ec.created_at::text AS created_at
        FROM public.ecritures_comptables ec
        WHERE ec.client_id = $1
          AND (
            ec.depense_id = $2
            OR ($3::uuid IS NOT NULL AND ec.reservation_id = $3)
            OR ($4::uuid IS NOT NULL AND ec.engagement_id = $4)
            OR (array_length($5::uuid[], 1) IS NOT NULL AND ec.bon_commande_id = ANY($5::uuid[]))
            OR (array_length($6::uuid[], 1) IS NOT NULL AND ec.facture_id = ANY($6::uuid[]))
            OR (array_length($7::uuid[], 1) IS NOT NULL AND ec.paiement_id = ANY($7::uuid[]))
          )
        ORDER BY ec.created_at ASC
      `,
      [tenantId, depenseId, reservationId, engagementId, bonCommandeIds, factureIds, paiementIds]
    );

    return result.rows;
  }

  private buildTimeline(
    chain: DepenseChainRow,
    bonsCommande: BonCommandeRow[],
    factures: FactureRow[],
    paiements: PaiementRow[],
    operationsTresorerie: OperationTresorerieRow[],
    ecritures: EcritureRow[]
  ): DossierTimelineEvent[] {
    const events: Array<DossierTimelineEvent & { sequence: number }> = [];
    let sequence = 1;

    if (chain.reservation_id && chain.reservation_date) {
      events.push({
        id: `evt-reservation-${chain.reservation_id}`,
        type: 'reservation',
        label: `Reservation ${chain.reservation_numero ?? ''}`.trim(),
        timestamp: this.toTimestamp(chain.reservation_date, chain.reservation_created_at),
        entityId: chain.reservation_id,
        entityType: 'reservation',
        status: chain.reservation_statut ?? undefined,
        actor: chain.reservation_created_by
          ? { userId: chain.reservation_created_by, action: 'creation-reservation' }
          : undefined,
        correlationId: chain.reservation_id,
        sequence
      });
      sequence += 1;
    }

    if (chain.engagement_id && chain.engagement_date) {
      events.push({
        id: `evt-engagement-${chain.engagement_id}`,
        type: 'engagement',
        label: `Engagement ${chain.engagement_numero ?? ''}`.trim(),
        timestamp: this.toTimestamp(chain.engagement_date, chain.engagement_created_at),
        entityId: chain.engagement_id,
        entityType: 'engagement',
        status: chain.engagement_statut ?? undefined,
        actor: chain.engagement_created_by
          ? { userId: chain.engagement_created_by, action: 'creation-engagement' }
          : undefined,
        correlationId: chain.engagement_id,
        sequence
      });
      sequence += 1;
    }

    for (const row of bonsCommande) {
      events.push({
        id: `evt-bc-${row.id}`,
        type: 'bon-commande',
        label: `Bon de commande ${row.numero}`,
        timestamp: this.toTimestamp(row.date_commande, row.created_at),
        entityId: row.id,
        entityType: 'bon-commande',
        status: row.statut,
        amount: Number(row.montant ?? 0),
        actor: row.created_by ? { userId: row.created_by, action: 'creation-bon-commande' } : undefined,
        correlationId: row.id,
        sequence
      });
      sequence += 1;
    }

    for (const row of factures) {
      events.push({
        id: `evt-facture-${row.id}`,
        type: 'facture',
        label: `Facture ${row.numero}`,
        timestamp: this.toTimestamp(row.date_facture, row.created_at),
        entityId: row.id,
        entityType: 'facture',
        status: row.statut,
        amount: Number(row.montant_ttc ?? 0),
        actor: row.created_by ? { userId: row.created_by, action: 'creation-facture' } : undefined,
        correlationId: row.id,
        details: row.reference_piece ? `Piece: ${row.reference_piece}` : 'Piece justificative manquante',
        sequence
      });
      sequence += 1;
    }

    events.push({
      id: `evt-depense-${chain.depense_id}`,
      type: 'depense',
      label: `Depense ${chain.depense_numero}`,
      timestamp: this.toTimestamp(chain.depense_date, chain.depense_created_at),
      entityId: chain.depense_id,
      entityType: 'depense',
      status: chain.depense_statut,
      amount: Number(chain.depense_montant ?? 0),
      actor: chain.depense_created_by ? { userId: chain.depense_created_by, action: 'creation-depense' } : undefined,
      correlationId: chain.depense_id,
      sequence
    });
    sequence += 1;

    for (const row of paiements) {
      events.push({
        id: `evt-paiement-${row.id}`,
        type: 'paiement',
        label: `Paiement ${row.numero}`,
        timestamp: this.toTimestamp(row.date_paiement, row.created_at),
        entityId: row.id,
        entityType: 'paiement',
        status: row.statut,
        amount: Number(row.montant ?? 0),
        actor: row.created_by ? { userId: row.created_by, action: 'creation-paiement' } : undefined,
        correlationId: row.id,
        details: row.reference_paiement ? `Reference: ${row.reference_paiement}` : undefined,
        sequence
      });
      sequence += 1;
    }

    for (const row of operationsTresorerie) {
      events.push({
        id: `evt-ot-${row.id}`,
        type: 'operation-tresorerie',
        label: `Operation tresorerie ${row.numero}`,
        timestamp: this.toTimestamp(row.date_operation, row.created_at),
        entityId: row.id,
        entityType: 'operation-tresorerie',
        correlationId: row.paiement_id ?? row.depense_id ?? row.id,
        actor: row.created_by ? { userId: row.created_by, action: 'operation-tresorerie' } : undefined,
        details: row.piece_justificative ? `Piece: ${row.piece_justificative}` : undefined,
        sequence
      });
      sequence += 1;
    }

    for (const row of ecritures) {
      events.push({
        id: `evt-ecriture-${row.id}`,
        type: 'ecriture-comptable',
        label: `Ecriture ${row.numero_piece}`,
        timestamp: row.created_at,
        entityId: row.id,
        entityType: 'ecriture-comptable',
        correlationId:
          row.paiement_id ?? row.depense_id ?? row.facture_id ?? row.bon_commande_id ?? row.engagement_id ?? row.reservation_id ?? row.id,
        amount: Number(row.montant ?? 0),
        details: row.type_operation,
        sequence
      });
      sequence += 1;
    }

    return events
      .sort((left, right) => {
        if (left.timestamp === right.timestamp) {
          return left.sequence - right.sequence;
        }
        return left.timestamp.localeCompare(right.timestamp);
      })
      .map(({ sequence: _sequence, ...rest }) => rest);
  }

  private buildPreuves(
    chain: DepenseChainRow,
    factures: FactureRow[],
    paiements: PaiementRow[],
    operationsTresorerie: OperationTresorerieRow[]
  ): DossierPreuve[] {
    const preuves: DossierPreuve[] = [];

    if (chain.depense_reference_paiement) {
      preuves.push({
        id: `preuve-depense-reference-${chain.depense_id}`,
        type: 'reference-paiement',
        label: 'Reference de paiement depense',
        source: 'depenses.reference_paiement',
        value: chain.depense_reference_paiement,
        entityId: chain.depense_id,
        entityType: 'depense',
        missing: false
      });
    }

    for (const facture of factures) {
      preuves.push({
        id: `preuve-facture-reference-${facture.id}`,
        type: 'reference-piece',
        label: `Reference piece facture ${facture.numero}`,
        source: 'factures.reference_piece',
        value: facture.reference_piece ?? 'absente',
        entityId: facture.id,
        entityType: 'facture',
        missing: !facture.reference_piece
      });
    }

    for (const paiement of paiements) {
      preuves.push({
        id: `preuve-paiement-reference-${paiement.id}`,
        type: 'reference-paiement',
        label: `Reference paiement ${paiement.numero}`,
        source: 'paiements.reference_paiement',
        value: paiement.reference_paiement ?? 'absente',
        entityId: paiement.id,
        entityType: 'paiement',
        missing: !paiement.reference_paiement
      });
    }

    for (const operation of operationsTresorerie) {
      preuves.push({
        id: `preuve-operation-piece-${operation.id}`,
        type: 'piece-justificative',
        label: `Piece operation tresorerie ${operation.numero}`,
        source: 'operations_tresorerie.piece_justificative',
        value: operation.piece_justificative ?? 'absente',
        entityId: operation.id,
        entityType: 'operation-tresorerie',
        missing: !operation.piece_justificative
      });
    }

    if (preuves.length === 0) {
      preuves.push({
        id: `preuve-missing-${chain.depense_id}`,
        type: 'metadata-audit',
        label: 'Aucune preuve detectee',
        source: 'dossier-compose',
        value: 'Le dossier ne contient aucune preuve exploitable',
        entityId: chain.depense_id,
        entityType: 'depense',
        missing: true
      });
    }

    return preuves;
  }

  private buildControles(
    chain: DepenseChainRow,
    factures: FactureRow[],
    paiements: PaiementRow[],
    preuves: DossierPreuve[]
  ): DossierControle[] {
    const controles: DossierControle[] = [];

    controles.push({
      code: 'tenant-scope',
      label: 'Isolation tenant',
      status: 'ok',
      detail: `Depense scopee sur tenant et depenseId (${chain.depense_id}).`
    });

    controles.push({
      code: 'chain-factures',
      label: 'Chainage factures',
      status: factures.length > 0 ? 'ok' : 'warning',
      detail: factures.length > 0 ? `${factures.length} facture(s) liee(s)` : 'Aucune facture liee detectee'
    });

    controles.push({
      code: 'chain-paiements',
      label: 'Chainage paiements',
      status: paiements.length > 0 ? 'ok' : 'warning',
      detail: paiements.length > 0 ? `${paiements.length} paiement(s) lie(s)` : 'Aucun paiement lie detecte'
    });

    const missingProofs = preuves.filter((preuve) => preuve.missing).length;
    controles.push({
      code: 'preuves-completes',
      label: 'Completude des preuves',
      status: missingProofs === 0 ? 'ok' : 'warning',
      detail: missingProofs === 0 ? 'Toutes les preuves requises sont presentes' : `${missingProofs} preuve(s) manquante(s)`
    });

    return controles;
  }

  private buildEcarts(factures: FactureRow[], preuves: DossierPreuve[]): DossierEcarts[] {
    const ecarts: DossierEcarts[] = [];

    const totalFacture = factures.reduce((sum, row) => sum + Number(row.montant_ttc ?? 0), 0);
    const totalLiquide = factures.reduce((sum, row) => sum + Number(row.montant_liquide ?? 0), 0);

    if (Math.abs(totalFacture - totalLiquide) > 0.01) {
      ecarts.push({
        code: 'ecart-liquidation-facture',
        label: 'Ecart liquidation/facture',
        severity: 'medium',
        detail: `Total facture=${totalFacture.toFixed(2)} vs liquide=${totalLiquide.toFixed(2)}`
      });
    }

    const missingPreuves = preuves.filter((preuve) => preuve.missing);
    if (missingPreuves.length > 0) {
      ecarts.push({
        code: 'preuves-manquantes',
        label: 'Preuves manquantes',
        severity: 'low',
        detail: `${missingPreuves.length} element(s) de preuve absent(s)`
      });
    }

    return ecarts;
  }

  private toTimestamp(primaryDate: string | null, fallbackIso: string | null): string {
    if (primaryDate) {
      return primaryDate.length > 10 ? primaryDate : `${primaryDate}T00:00:00.000Z`;
    }

    if (fallbackIso) {
      return fallbackIso;
    }

    return new Date(0).toISOString();
  }

  private buildPdfDocument(dossier: Awaited<ReturnType<DossierDepenseUnifieService['getDossier']>>): Buffer {
    const lines = [
      'Dossier de depense unifie',
      `Dossier ID: ${dossier.dossierId}`,
      `Depense: ${dossier.depense.numero} (${dossier.depense.id})`,
      `Statut: ${dossier.depense.statut}`,
      `Montant: ${dossier.depense.montant}`,
      `Montant paye: ${dossier.depense.montantPaye}`,
      `Timeline events: ${dossier.timeline.length}`,
      `Preuves: ${dossier.preuves.length}`,
      `Ecarts: ${dossier.synthese.ecarts.length}`
    ];

    const contentLines = lines.map((line, index) => `BT /F1 11 Tf 72 ${760 - index * 16} Td (${this.escapePdfText(line)}) Tj ET`);
    const contentStream = contentLines.join('\n');

    const objects = [
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj',
      '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
      '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
      `5 0 obj << /Length ${Buffer.byteLength(contentStream, 'utf-8')} >> stream\n${contentStream}\nendstream endobj`
    ];

    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [0];

    for (const object of objects) {
      offsets.push(Buffer.byteLength(pdf, 'utf-8'));
      pdf += `${object}\n`;
    }

    const xrefOffset = Buffer.byteLength(pdf, 'utf-8');
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;

    for (let index = 1; index <= objects.length; index += 1) {
      pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
    }

    pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return Buffer.from(pdf, 'utf-8');
  }

  private buildZipArchive(files: Array<{ name: string; content: string }>): Buffer {
    const localParts: Buffer[] = [];
    const centralParts: Buffer[] = [];
    let offset = 0;

    for (const file of files) {
      const nameBuffer = Buffer.from(file.name, 'utf-8');
      const dataBuffer = Buffer.from(file.content, 'utf-8');
      const crc32 = this.computeCrc32(dataBuffer);

      const localHeader = Buffer.alloc(30);
      localHeader.writeUInt32LE(0x04034b50, 0);
      localHeader.writeUInt16LE(20, 4);
      localHeader.writeUInt16LE(0, 6);
      localHeader.writeUInt16LE(0, 8);
      localHeader.writeUInt16LE(0, 10);
      localHeader.writeUInt16LE(0, 12);
      localHeader.writeUInt32LE(crc32, 14);
      localHeader.writeUInt32LE(dataBuffer.length, 18);
      localHeader.writeUInt32LE(dataBuffer.length, 22);
      localHeader.writeUInt16LE(nameBuffer.length, 26);
      localHeader.writeUInt16LE(0, 28);

      localParts.push(localHeader, nameBuffer, dataBuffer);

      const centralHeader = Buffer.alloc(46);
      centralHeader.writeUInt32LE(0x02014b50, 0);
      centralHeader.writeUInt16LE(20, 4);
      centralHeader.writeUInt16LE(20, 6);
      centralHeader.writeUInt16LE(0, 8);
      centralHeader.writeUInt16LE(0, 10);
      centralHeader.writeUInt16LE(0, 12);
      centralHeader.writeUInt16LE(0, 14);
      centralHeader.writeUInt32LE(crc32, 16);
      centralHeader.writeUInt32LE(dataBuffer.length, 20);
      centralHeader.writeUInt32LE(dataBuffer.length, 24);
      centralHeader.writeUInt16LE(nameBuffer.length, 28);
      centralHeader.writeUInt16LE(0, 30);
      centralHeader.writeUInt16LE(0, 32);
      centralHeader.writeUInt16LE(0, 34);
      centralHeader.writeUInt16LE(0, 36);
      centralHeader.writeUInt32LE(0, 38);
      centralHeader.writeUInt32LE(offset, 42);

      centralParts.push(centralHeader, nameBuffer);
      offset += localHeader.length + nameBuffer.length + dataBuffer.length;
    }

    const centralDirectory = Buffer.concat(centralParts);
    const endRecord = Buffer.alloc(22);
    endRecord.writeUInt32LE(0x06054b50, 0);
    endRecord.writeUInt16LE(0, 4);
    endRecord.writeUInt16LE(0, 6);
    endRecord.writeUInt16LE(files.length, 8);
    endRecord.writeUInt16LE(files.length, 10);
    endRecord.writeUInt32LE(centralDirectory.length, 12);
    endRecord.writeUInt32LE(offset, 16);
    endRecord.writeUInt16LE(0, 20);

    return Buffer.concat([...localParts, centralDirectory, endRecord]);
  }

  private computeCrc32(buffer: Buffer): number {
    let crc = 0xffffffff;
    for (const value of buffer) {
      const index = (crc ^ value) & 0xff;
      crc = (crc >>> 8) ^ CRC32_TABLE[index];
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  private escapePdfText(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }
}
