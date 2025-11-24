import { supabase } from '@/integrations/supabase/client';
import type { FluxTresorerie, TresorerieStats, PrevisionTresorerie } from '@/types/tresorerie.types';

export const tresorerieService = {
  async getStats(clientId: string, exerciceId: string): Promise<TresorerieStats> {
    // Récupérer tous les paiements validés
    const { data: paiements, error: paiementsError } = await supabase
      .from('paiements')
      .select('montant, date_paiement')
      .eq('client_id', clientId)
      .eq('exercice_id', exerciceId)
      .eq('statut', 'valide');

    if (paiementsError) throw paiementsError;

    const totalDecaissements = paiements?.reduce((sum, p) => sum + p.montant, 0) || 0;

    // Calculer les décaissements du mois en cours
    const currentMonth = new Date().toISOString().slice(0, 7);
    const decaissementsMoisEnCours = paiements
      ?.filter(p => p.date_paiement.startsWith(currentMonth))
      .reduce((sum, p) => sum + p.montant, 0) || 0;

    // Pour l'instant, on simule les encaissements
    // Dans une version complète, il faudrait une table dédiée pour les recettes
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
      decaissementsMoisEnCours,
    };
  },

  async getFlux(clientId: string, exerciceId: string): Promise<FluxTresorerie[]> {
    // Récupérer tous les paiements comme flux de trésorerie
    const { data: paiements, error } = await supabase
      .from('paiements')
      .select(`
        id,
        numero,
        montant,
        date_paiement,
        mode_paiement,
        observations,
        client_id,
        exercice_id,
        created_at,
        updated_at,
        depense:depenses(objet)
      `)
      .eq('client_id', clientId)
      .eq('exercice_id', exerciceId)
      .eq('statut', 'valide')
      .order('date_paiement', { ascending: false });

    if (error) throw error;

    return (paiements || []).map(p => ({
      id: p.id,
      clientId: p.client_id,
      exerciceId: p.exercice_id,
      date: p.date_paiement,
      type: 'decaissement' as const,
      categorie: p.mode_paiement || 'Autre',
      libelle: (p.depense as any)?.objet || `Paiement ${p.numero}`,
      montant: p.montant,
      sourceType: 'paiement' as const,
      sourceId: p.id,
      observations: p.observations || undefined,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));
  },

  async getPrevisions(clientId: string, exerciceId: string): Promise<PrevisionTresorerie[]> {
    // Récupérer les dépenses ordonnancées non encore payées pour les prévisions
    const { data: depenses, error } = await supabase
      .from('depenses')
      .select('montant, montant_paye, date_depense')
      .eq('client_id', clientId)
      .eq('exercice_id', exerciceId)
      .in('statut', ['ordonnancee', 'validee']);

    if (error) throw error;

    // Grouper par mois
    const previsionsByMonth = new Map<string, { encaissements: number; decaissements: number }>();

    depenses?.forEach(d => {
      const month = d.date_depense.slice(0, 7);
      const restant = d.montant - d.montant_paye;
      
      if (restant > 0) {
        const current = previsionsByMonth.get(month) || { encaissements: 0, decaissements: 0 };
        current.decaissements += restant;
        previsionsByMonth.set(month, current);
      }
    });

    // Convertir en tableau et calculer les soldes prévisionnels
    let soldeCumul = 0;
    return Array.from(previsionsByMonth.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([periode, { encaissements, decaissements }]) => {
        soldeCumul += encaissements - decaissements;
        return {
          periode,
          encaissementsPrevus: encaissements,
          decaissementsPrevus: decaissements,
          soldePrevisionnel: soldeCumul,
        };
      });
  },
};
