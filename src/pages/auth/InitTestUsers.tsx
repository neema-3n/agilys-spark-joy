import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function InitTestUsers() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const initializeUsers = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('init-test-users', {
        body: {}
      });

      if (invokeError) {
        throw invokeError;
      }

      setResults(data);
    } catch (err: any) {
      console.error('Error initializing users:', err);
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Initialisation des utilisateurs de test</CardTitle>
          <CardDescription>
            Cette page permet de créer les utilisateurs de test pour l'application.
            Cette opération ne doit être effectuée qu'une seule fois.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={initializeUsers} 
            disabled={loading}
            className="w-full"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Initialiser les utilisateurs
          </Button>

          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {results && (
            <div className="space-y-3">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  {results.message}
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <h3 className="font-semibold">Résultats détaillés:</h3>
                {results.results?.map((result: any, index: number) => (
                  <Card key={index}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{result.email}</p>
                          <p className="text-sm text-muted-foreground">{result.message}</p>
                          {result.role && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Rôle: {result.role}
                            </p>
                          )}
                        </div>
                        {result.status === 'success' && (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        )}
                        {result.status === 'error' && (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        {result.status === 'skipped' && (
                          <CheckCircle2 className="h-5 w-5 text-blue-500" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Alert>
                <AlertDescription>
                  <strong>Utilisateurs créés:</strong>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>• super@agilys.com / MotDePasse123! (Super Admin)</li>
                    <li>• admin@portonovo.bj / MotDePasse123! (Admin Client)</li>
                    <li>• directeur@portonovo.bj / MotDePasse123! (Directeur Financier)</li>
                    <li>• comptable@portonovo.bj / MotDePasse123! (Comptable)</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
