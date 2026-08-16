import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  stack: string | null;
}

/**
 * Sans barrière d'erreur, React démonte tout l'arbre à la première exception :
 * l'utilisateur voit une page blanche, et le message n'existe que dans la
 * console. Cet écran l'affiche à l'endroit où il s'est produit, ce qui rend un
 * incident racontable — et donc diagnosticable.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null, stack: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erreur non rattrapée :', error, info.componentStack);
    this.setState({ stack: info.componentStack ?? null });
  }

  handleReset = () => {
    this.setState({ error: null, stack: null });
  };

  render() {
    const { error, stack } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <CardTitle className="text-xl">Une erreur est survenue</CardTitle>
            </div>
            <CardDescription>
              L'écran n'a pas pu s'afficher. Le détail ci-dessous permet d'identifier la cause.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto rounded-lg border border-border bg-muted/50 p-4">
              <p className="font-mono text-sm font-medium text-destructive">
                {error.name}: {error.message}
              </p>
              {stack ? (
                <pre className="mt-3 whitespace-pre-wrap text-xs text-muted-foreground">
                  {stack.trim().split('\n').slice(0, 8).join('\n')}
                </pre>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={this.handleReset} variant="default">
                <RefreshCw className="mr-2 h-4 w-4" />
                Réessayer
              </Button>
              <Button onClick={() => window.location.assign('/auth/login')} variant="outline">
                Retour à la connexion
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}
