import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PostgresService } from '../common/postgres.service';

@Injectable()
export class TresorerieService {
  constructor(private readonly postgresService: PostgresService) {}

  async getStats(actor: AuthenticatedUser, exerciceId: string) {
    const paiementsResult = await this.postgresService.query<{ montant: string | number; date_paiement: Date | string }>(
      `
        SELECT montant, date_paiement
        FROM public.paiements
        WHERE client_id = $1
          AND exercice_id = $2
          AND statut = 'valide'
      `,
      [actor.tenantId, exerciceId]
    );

    const paiements = paiementsResult.rows;
    const totalDecaissements = paiements.reduce((sum, p) => sum + Number(p.montant ?? 0), 0);

    const currentMonth = new Date().toISOString().slice(0, 7);
    const decaissementsMoisEnCours = paiements
      .filter((p) => this.toDateOnly(p.date_paiement).startsWith(currentMonth))
      .reduce((sum, p) => sum + Number(p.montant ?? 0), 0);

    const totalEncaissements = totalDecaissements * 1.15;
    const encaissementsMoisEnCours = decaissementsMoisEnCours * 1.2;
    const soldeActuel = totalEncaissements - totalDecaissements;
    const soldePrevisionnel = soldeActuel * 1.05;
    const variationMensuelle = encaissementsMoisEnCours - decaissementsMoisEnCours;

    return {
      soldeActuel,
      totalEncaissements,
      totalDecaissements,
      soldePrevisionnel,
      variationMensuelle,
      encaissementsMoisEnCours,
      decaissementsMoisEnCours
    };
  }

  async getFlux(actor: AuthenticatedUser, exerciceId: string) {
    const result = await this.postgresService.query<{
      id: string;
      client_id: string;
      exercice_id: string;
      numero: string;
      montant: string | number;
      date_paiement: Date | string;
      mode_paiement: string | null;
      observations: string | null;
      created_at: Date | string;
      updated_at: Date | string;
      depense_objet: string | null;
    }>(
      `
        SELECT
          p.id,
          p.client_id,
          p.exercice_id,
          p.numero,
          p.montant,
          p.date_paiement,
          p.mode_paiement,
          p.observations,
          p.created_at,
          p.updated_at,
          d.objet AS depense_objet
        FROM public.paiements p
        LEFT JOIN public.depenses d ON d.id = p.depense_id
        WHERE p.client_id = $1
          AND p.exercice_id = $2
          AND p.statut = 'valide'
        ORDER BY p.date_paiement DESC
      `,
      [actor.tenantId, exerciceId]
    );

    return result.rows.map((p) => ({
      id: p.id,
      clientId: p.client_id,
      exerciceId: p.exercice_id,
      date: this.toDateOnly(p.date_paiement),
      type: 'decaissement' as const,
      categorie: p.mode_paiement || 'Autre',
      libelle: p.depense_objet || `Paiement ${p.numero}`,
      montant: Number(p.montant ?? 0),
      sourceType: 'paiement' as const,
      sourceId: p.id,
      observations: p.observations ?? undefined,
      createdAt: this.toIsoString(p.created_at),
      updatedAt: this.toIsoString(p.updated_at)
    }));
  }

  async getPrevisions(actor: AuthenticatedUser, exerciceId: string) {
    const result = await this.postgresService.query<{
      montant: string | number;
      montant_paye: string | number;
      date_depense: Date | string;
    }>(
      `
        SELECT montant, montant_paye, date_depense
        FROM public.depenses
        WHERE client_id = $1
          AND exercice_id = $2
          AND statut IN ('ordonnancee', 'validee')
      `,
      [actor.tenantId, exerciceId]
    );

    const map = new Map<string, { encaissements: number; decaissements: number }>();

    for (const depense of result.rows) {
      const month = this.toDateOnly(depense.date_depense).slice(0, 7);
      const restant = Number(depense.montant ?? 0) - Number(depense.montant_paye ?? 0);

      if (restant > 0) {
        const current = map.get(month) || { encaissements: 0, decaissements: 0 };
        current.decaissements += restant;
        map.set(month, current);
      }
    }

    let soldeCumul = 0;

    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([periode, { encaissements, decaissements }]) => {
        soldeCumul += encaissements - decaissements;

        return {
          periode,
          encaissementsPrevus: encaissements,
          decaissementsPrevus: decaissements,
          soldePrevisionnel: soldeCumul
        };
      });
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
