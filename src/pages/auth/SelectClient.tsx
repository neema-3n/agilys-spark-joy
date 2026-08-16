import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Building2, ShieldAlert, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useClient } from '@/contexts/ClientContext';
import { cn } from '@/lib/utils';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super administrateur',
  admin_client: 'Administrateur',
  directeur_financier: 'Directeur financier',
  chef_service: 'Chef de service',
  comptable: 'Comptable',
  operateur_saisie: 'Opérateur de saisie',
};

/**
 * Choix du client après connexion, présenté uniquement lorsqu'il y a
 * réellement un choix à faire : avec un seul client accessible, la sélection
 * est automatique et l'écran n'apparaît jamais.
 */
const SelectClient = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const destination = (location.state as { from?: string } | null)?.from ?? '/app/executive-dashboard';
  const { clients, hasLoaded, switchClient, isSwitching } = useClient();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    if (!hasLoaded) return;
    if (clients.length === 1) {
      void handleSelect(clients[0].id);
    }
  }, [hasLoaded, clients.length]);

  const handleSelect = async (clientId: string) => {
    setError(null);
    setPendingId(clientId);
    try {
      await switchClient(clientId);
      navigate(destination, { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sélection impossible.');
    } finally {
      setPendingId(null);
    }
  };

  if (!hasLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-hero">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-hero p-4">
        <Card className="w-full max-w-md shadow-primary">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-2xl font-bold">Aucun accès</CardTitle>
            <CardDescription>
              Votre compte n'est rattaché à aucune organisation. Contactez votre administrateur.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero p-4">
      <Card className="w-full max-w-lg shadow-primary">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl font-bold">Choisir une organisation</CardTitle>
          <CardDescription>
            Vous avez accès à plusieurs organisations. Sélectionnez celle sur laquelle travailler.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {clients.map((client) => {
            const access = client as typeof client & { role?: string; isTakeover?: boolean };
            const isPending = pendingId === client.id;

            return (
              <button
                key={client.id}
                type="button"
                disabled={isSwitching}
                onClick={() => handleSelect(client.id)}
                className={cn(
                  'flex w-full items-center gap-4 rounded-lg border border-border p-4 text-left transition-colors',
                  'hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60',
                  isPending && 'bg-accent',
                )}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-primary">
                  <Building2 className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{client.nom}</span>
                    {access.isTakeover ? (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <ShieldAlert className="h-3 w-3" />
                        Prise en main
                      </Badge>
                    ) : null}
                    {client.statut !== 'actif' ? (
                      <Badge variant="secondary" className="text-xs">Lecture seule</Badge>
                    ) : null}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {client.code}
                    {access.role ? ` · ${ROLE_LABELS[access.role] ?? access.role}` : ''}
                  </p>
                </div>
                {isPending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
                ) : null}
              </button>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

export default SelectClient;
