import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useClientSetupStatus } from '@/hooks/useClientSetupStatus';

/**
 * Rappel permanent de la configuration incomplète du client.
 *
 * La liste de contrôle vit sur le tableau de bord : un utilisateur qui l'a
 * quittée n'a plus aucun moyen d'y revenir, ni aucune indication de ce qui
 * manque. Ce bandeau la rend joignable depuis n'importe quel écran, et
 * disparaît de lui-même dès que le client est opérationnel.
 */
export const SetupBanner = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isReady, isConfigured, hasExercice, hasPlanComptable, hasStructure, hasLignes } =
    useClientSetupStatus();

  // Inutile sur le tableau de bord : la liste complète y est déjà affichée.
  const isOnDashboard = location.pathname.startsWith('/app/executive-dashboard');

  if (!isReady || isConfigured || isOnDashboard) return null;

  const done = [hasExercice, hasPlanComptable, hasStructure, hasLignes].filter(Boolean).length;
  const nextStep = !hasExercice
    ? 'créer un exercice budgétaire'
    : !hasPlanComptable
      ? 'importer un plan comptable'
      : !hasStructure
        ? 'définir la structure budgétaire'
        : 'créer une première ligne budgétaire';

  return (
    <div className="border-b border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30">
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-6">
        <div className="flex items-start gap-3 sm:items-center">
          <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500 sm:mt-0" />
          <p className="text-sm text-amber-900 dark:text-amber-200">
            <span className="font-medium">Configuration incomplète — {done}/4 étapes.</span>{' '}
            Prochaine étape : {nextStep}.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 border-amber-300 bg-white text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-transparent dark:text-amber-200"
          onClick={() => navigate('/app/executive-dashboard')}
        >
          Voir les étapes
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
