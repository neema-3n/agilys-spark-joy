import { Badge } from '@/components/ui/badge';
import type { PrioriteProjet, Projet } from '@/types/projet.types';

const PRIORITE_CLASSNAMES: Record<PrioriteProjet, string> = {
  haute: 'bg-destructive text-destructive-foreground',
  moyenne: 'bg-accent text-accent-foreground',
  basse: 'bg-muted text-muted-foreground',
};

const PRIORITE_LABELS: Record<PrioriteProjet, string> = {
  haute: 'Haute',
  moyenne: 'Moyenne',
  basse: 'Basse',
};

export const getProjetBudgetDisponible = (projet: Pick<Projet, 'budgetAlloue' | 'budgetConsomme'>) =>
  projet.budgetAlloue - projet.budgetConsomme;

export const getProjetBudgetConsumptionRate = (
  projet: Pick<Projet, 'budgetAlloue' | 'budgetConsomme'>,
) => (projet.budgetAlloue > 0 ? (projet.budgetConsomme / projet.budgetAlloue) * 100 : 0);

export const getProjetBudgetEngagementRate = (
  projet: Pick<Projet, 'budgetAlloue' | 'budgetEngage'>,
) => (projet.budgetAlloue > 0 ? (projet.budgetEngage / projet.budgetAlloue) * 100 : 0);

export const ProjetPrioriteBadge = ({
  priorite,
}: {
  priorite?: PrioriteProjet | null;
}) => {
  if (!priorite) return null;

  return (
    <Badge className={PRIORITE_CLASSNAMES[priorite]}>
      {PRIORITE_LABELS[priorite]}
    </Badge>
  );
};
