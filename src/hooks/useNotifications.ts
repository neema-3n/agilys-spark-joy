import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import { usePermissions } from '@/hooks/usePermissions';

export interface FileAttente {
  cle: string;
  libelle: string;
  nombre: number;
  route: string;
}

/**
 * Une file d'attente : des pièces arrêtées à une étape, et la permission qui
 * autorise à les faire avancer.
 */
const FILES = [
  {
    cle: 'engagements',
    table: 'engagements',
    statut: 'brouillon',
    permission: 'engagements.valider',
    route: '/app/engagements',
    singulier: 'engagement à valider',
    pluriel: 'engagements à valider',
  },
  {
    cle: 'bons_commande',
    table: 'bons_commande',
    statut: 'brouillon',
    permission: 'bons_commande.valider',
    route: '/app/bons-commande',
    singulier: 'bon de commande à émettre',
    pluriel: 'bons de commande à émettre',
  },
  {
    cle: 'factures',
    table: 'factures',
    statut: 'brouillon',
    permission: 'factures.valider',
    route: '/app/factures',
    singulier: 'facture à valider',
    pluriel: 'factures à valider',
  },
  {
    cle: 'depenses',
    table: 'depenses',
    statut: 'brouillon',
    permission: 'depenses.valider',
    route: '/app/depenses',
    singulier: 'dépense à liquider',
    pluriel: 'dépenses à liquider',
  },
  {
    cle: 'paiements',
    table: 'paiements',
    statut: 'brouillon',
    permission: 'paiements.valider',
    route: '/app/paiements',
    singulier: 'paiement à décaisser',
    pluriel: 'paiements à décaisser',
  },
  {
    cle: 'modifications',
    table: 'modifications_budgetaires',
    statut: 'en_attente',
    permission: 'budgets.valider',
    route: '/app/budgets',
    singulier: 'modification budgétaire à arbitrer',
    pluriel: 'modifications budgétaires à arbitrer',
  },
  {
    cle: 'rapprochements',
    table: 'rapprochements_bancaires',
    statut: 'en_cours',
    permission: 'tresorerie.rapprocher',
    route: '/app/tresorerie/rapprochements',
    singulier: 'rapprochement à finaliser',
    pluriel: 'rapprochements à finaliser',
  },
] as const;

/**
 * Ce qui attend l'action de l'utilisateur, sur l'exercice ouvert.
 *
 * On ne compte que les files que ses permissions lui ouvrent : un opérateur de
 * saisie ne valide rien, sa cloche reste donc muette — et c'est juste. Annoncer
 * un travail qu'on n'a pas le droit de faire ne rend service à personne.
 *
 * Aucune table dédiée : les statuts portent déjà l'information. Ce qui attend
 * une validation, c'est ce qui est resté en brouillon.
 */
export const useNotifications = () => {
  const { currentClient } = useClient();
  const { currentExercice } = useExercice();
  const { can, isLoading: permissionsEnCours } = usePermissions();

  const clientId = currentClient?.id;
  const exerciceId = currentExercice?.id;
  const ouvertes = FILES.filter((f) => can(f.permission));

  const { data, isLoading, error } = useQuery({
    queryKey: ['notifications', clientId, exerciceId, ouvertes.map((f) => f.cle).join(',')],
    enabled: !!clientId && !!exerciceId && !permissionsEnCours && ouvertes.length > 0,
    // Une file bouge au rythme des validations, pas des secondes : inutile de
    // la relire à chaque rendu, mais elle doit se rafraîchir au retour sur
    // l'onglet, quand on revient d'avoir traité une pièce.
    staleTime: 30_000,
    queryFn: async (): Promise<FileAttente[]> => {
      const comptes = await Promise.all(
        ouvertes.map(async (f) => {
          const { count, error: erreur } = await supabase
            .from(f.table)
            .select('id', { count: 'exact', head: true })
            .eq('client_id', clientId!)
            .eq('exercice_id', exerciceId!)
            .eq('statut', f.statut);

          // Une file illisible doit se voir : la compter comme vide
          // laisserait croire qu'il n'y a rien à traiter.
          if (erreur) throw erreur;

          const nombre = count ?? 0;
          return {
            cle: f.cle,
            libelle: `${nombre} ${nombre > 1 ? f.pluriel : f.singulier}`,
            nombre,
            route: f.route,
          };
        }),
      );

      return comptes.filter((c) => c.nombre > 0);
    },
  });

  const files = data ?? [];

  return {
    files,
    total: files.reduce((somme, f) => somme + f.nombre, 0),
    isLoading: isLoading && ouvertes.length > 0,
    /** Rien à traiter et rien à surveiller : le rôle n'ouvre aucune file. */
    aucuneFile: ouvertes.length === 0,
    /** Sans exercice ouvert, il n'y a rien à compter — ce n'est pas la même
     *  chose que n'avoir rien à faire, et le dire évite un contresens. */
    sansExercice: !exerciceId,
    error: error as Error | null,
  };
};
