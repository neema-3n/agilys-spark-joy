import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';

export interface SetupCounts {
  exercices: number;
  comptes: number;
  sections: number;
  programmes: number;
  actions: number;
  lignes: number;
}

type SetupTable =
  | 'exercices'
  | 'comptes'
  | 'sections'
  | 'programmes'
  | 'actions'
  | 'lignes_budgetaires';

const countRows = async (table: SetupTable, clientId: string, exerciceId?: string) => {
  // `from()` avec un nom de table variable fait diverger l'inférence des types
  // générés : TypeScript tente de résoudre l'union de toutes les tables et
  // abandonne (TS2589). On ne récupère ici qu'un compteur, jamais de lignes,
  // donc le type précis du builder n'apporte rien.
  const from = supabase.from as (table: string) => ReturnType<typeof supabase.from>;

  let query = from(table)
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId);

  // sections, programmes, actions et lignes sont rattachés à un exercice ;
  // exercices et comptes vivent au niveau du client.
  if (exerciceId) {
    query = query.eq('exercice_id', exerciceId);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
};

/**
 * État de configuration du client courant.
 *
 * Un client nouvellement créé n'a ni exercice, ni plan comptable, ni structure
 * budgétaire : l'application fonctionne mais rien n'y est possible, et rien
 * n'indique pourquoi. Ces compteurs alimentent la liste de contrôle qui rend
 * ce point de départ lisible.
 */
export const useClientSetupStatus = () => {
  const { currentClient } = useClient();
  const { currentExercice } = useExercice();

  const clientId = currentClient?.id;
  const exerciceId = currentExercice?.id;

  const { data, isLoading } = useQuery({
    queryKey: ['client-setup-status', clientId, exerciceId],
    enabled: !!clientId,
    queryFn: async (): Promise<SetupCounts> => {
      const [exercices, comptes] = await Promise.all([
        countRows('exercices', clientId!),
        countRows('comptes', clientId!),
      ]);

      // Sans exercice sélectionné, la structure budgétaire n'a pas de portée :
      // inutile d'interroger la base pour des compteurs qui vaudraient zéro.
      if (!exerciceId) {
        return { exercices, comptes, sections: 0, programmes: 0, actions: 0, lignes: 0 };
      }

      const [sections, programmes, actions, lignes] = await Promise.all([
        countRows('sections', clientId!, exerciceId),
        countRows('programmes', clientId!, exerciceId),
        countRows('actions', clientId!, exerciceId),
        countRows('lignes_budgetaires', clientId!, exerciceId),
      ]);

      return { exercices, comptes, sections, programmes, actions, lignes };
    },
  });

  const counts: SetupCounts = data ?? {
    exercices: 0, comptes: 0, sections: 0, programmes: 0, actions: 0, lignes: 0,
  };

  // La présence des données est le seul signal fiable : `isLoading` de React
  // Query vaut false aussi bien avant qu'après une requête désactivée, ce qui
  // ferait conclure « non configuré » avant même d'avoir compté quoi que ce soit.
  const isReady = data !== undefined;

  const hasExercice = counts.exercices > 0;
  const hasPlanComptable = counts.comptes > 0;
  const hasStructure = counts.sections > 0 && counts.programmes > 0 && counts.actions > 0;
  const hasLignes = counts.lignes > 0;

  return {
    counts,
    isLoading,
    isReady,
    hasExercice,
    hasPlanComptable,
    hasStructure,
    hasLignes,
    /** Le client peut réellement travailler : le budget est amorcé. */
    isConfigured: hasExercice && hasPlanComptable && hasStructure && hasLignes,
  };
};
