import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Circle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useClient } from '@/contexts/ClientContext';
import { useClientSetupStatus } from '@/hooks/useClientSetupStatus';
import { cn } from '@/lib/utils';

type StepState = 'done' | 'todo' | 'blocked';

interface SetupStep {
  title: string;
  description: string;
  detail: string;
  state: StepState;
  href?: string;
  action?: string;
}

/**
 * Liste de contrôle du démarrage d'un client.
 *
 * Créer une ligne budgétaire — le premier geste utile de l'application —
 * suppose un exercice, un plan comptable et une structure section/programme/
 * action. Un client neuf n'a rien de tout cela : l'application s'affiche
 * normalement, mais aucune action n'y est possible et rien ne dit pourquoi.
 *
 * Volontairement une liste de contrôle et non un assistant modal : la
 * configuration d'un exercice se fait rarement d'une traite, et chaque étape
 * renvoie vers l'écran qui l'implémente déjà plutôt que d'en dupliquer la
 * saisie.
 */
export const ConfigurationInitiale = () => {
  const navigate = useNavigate();
  const { currentClient } = useClient();
  const { counts, hasExercice, hasPlanComptable, hasStructure, hasLignes, isLoading } =
    useClientSetupStatus();

  const steps: SetupStep[] = [
    {
      title: 'Exercice budgétaire',
      description: 'Définit la période sur laquelle porte le budget.',
      detail: hasExercice
        ? `${counts.exercices} exercice${counts.exercices > 1 ? 's' : ''} défini${counts.exercices > 1 ? 's' : ''}`
        : 'Aucun exercice',
      state: hasExercice ? 'done' : 'todo',
      href: '/app/parametres/exercices',
      action: 'Créer un exercice',
    },
    {
      title: 'Plan comptable',
      description: 'Les comptes sur lesquels s\'imputent les lignes budgétaires. Un import est disponible.',
      detail: hasPlanComptable ? `${counts.comptes} comptes` : 'Aucun compte',
      state: hasPlanComptable ? 'done' : 'todo',
      href: '/app/plan-comptable',
      action: 'Importer un plan comptable',
    },
    {
      title: 'Structure budgétaire',
      description: 'Sections, programmes et actions : la nomenclature de l\'exercice.',
      detail: hasExercice
        ? `${counts.sections} section${counts.sections > 1 ? 's' : ''} · ${counts.programmes} programme${counts.programmes > 1 ? 's' : ''} · ${counts.actions} action${counts.actions > 1 ? 's' : ''}`
        : 'Nécessite un exercice',
      state: hasStructure ? 'done' : hasExercice ? 'todo' : 'blocked',
      href: '/app/parametres/structure-budgetaire',
      action: 'Définir la structure',
    },
    {
      title: 'Première ligne budgétaire',
      description: 'Le budget devient exploitable : réservations, engagements et dépenses s\'ouvrent.',
      detail: hasLignes
        ? `${counts.lignes} ligne${counts.lignes > 1 ? 's' : ''} budgétaire${counts.lignes > 1 ? 's' : ''}`
        : hasStructure && hasPlanComptable
          ? 'Aucune ligne'
          : 'Nécessite le plan comptable et la structure',
      state: hasLignes ? 'done' : hasStructure && hasPlanComptable ? 'todo' : 'blocked',
      href: '/app/budgets',
      action: 'Créer une ligne',
    },
  ];

  const doneCount = steps.filter((step) => step.state === 'done').length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Configuration initiale</CardTitle>
          <CardDescription>
            {currentClient?.nom} n&apos;est pas encore opérationnel. Ces étapes ouvrent
            l&apos;usage de l&apos;application ; vous pouvez les mener à votre rythme.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(doneCount / steps.length) * 100}%` }}
              />
            </div>
            <span className="shrink-0 text-sm font-medium text-muted-foreground">
              {doneCount} / {steps.length}
            </span>
          </div>

          <ol className="space-y-3">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className={cn(
                  'flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center',
                  step.state === 'done' && 'bg-muted/40',
                  step.state === 'blocked' && 'opacity-60',
                )}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                    step.state === 'done' && 'bg-primary text-primary-foreground',
                    step.state === 'todo' && 'border-2 border-primary text-primary',
                    step.state === 'blocked' && 'border-2 border-muted-foreground/30 text-muted-foreground',
                  )}
                >
                  {step.state === 'done' ? (
                    <Check className="h-4 w-4" />
                  ) : step.state === 'blocked' ? (
                    <Lock className="h-3.5 w-3.5" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-medium">{step.title}</p>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {isLoading ? '…' : step.detail}
                  </p>
                </div>

                {step.state === 'todo' && step.href ? (
                  <Button
                    variant="default"
                    size="sm"
                    className="shrink-0"
                    onClick={() => navigate(step.href!)}
                  >
                    {step.action}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : step.state === 'done' && step.href ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={() => navigate(step.href!)}
                  >
                    Voir
                  </Button>
                ) : (
                  <Circle className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
                )}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};
