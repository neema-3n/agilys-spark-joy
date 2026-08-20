import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, KeyRound, Lock } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

const schema = z
  .object({
    motDePasse: z.string().min(8, { message: 'Au moins 8 caractères' }),
    confirmation: z.string(),
  })
  .refine((v) => v.motDePasse === v.confirmation, {
    message: 'Les deux saisies ne correspondent pas',
    path: ['confirmation'],
  });

/**
 * Choix d'un nouveau mot de passe, au retour du lien reçu par email.
 *
 * Le lien ouvre une session de récupération : le client Supabase la lit dans
 * l'adresse au chargement. Sans elle, la page ne sert à rien — d'où la
 * vérification préalable, qui évite de laisser saisir un mot de passe pour
 * échouer à l'enregistrement.
 */
const NouveauMotDePasse = () => {
  const navigate = useNavigate();
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [termine, setTermine] = useState(false);
  const [sessionValide, setSessionValide] = useState<boolean | null>(null);

  useEffect(() => {
    // Le jeton de récupération arrive dans l'adresse ; sa lecture est
    // asynchrone, d'où l'écoute en parallèle de la vérification directe.
    const { data: ecoute } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setSessionValide(true);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSessionValide((valide) => valide ?? !!data.session);
    });

    return () => ecoute.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErreur(null);

    const validation = schema.safeParse({ motDePasse, confirmation });
    if (!validation.success) {
      setErreur(validation.error.errors[0].message);
      return;
    }

    setEnCours(true);
    const { error } = await supabase.auth.updateUser({ password: motDePasse });
    setEnCours(false);

    if (error) {
      setErreur(error.message);
      return;
    }

    // La session de récupération est fermée : on se reconnecte avec le nouveau
    // mot de passe, ce qui vérifie au passage qu'il fonctionne.
    await supabase.auth.signOut();
    setTermine(true);
  };

  if (sessionValide === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-hero p-4">
        <Card className="w-full max-w-md shadow-primary">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-2xl font-bold">Lien expiré</CardTitle>
            <CardDescription>
              Ce lien de réinitialisation n&apos;est plus valable. Les liens expirent au bout
              d&apos;une heure et ne servent qu&apos;une fois.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate('/auth/mot-de-passe-oublie')}>
              Demander un nouveau lien
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero p-4">
      <Card className="w-full max-w-md shadow-primary">
        <CardHeader className="space-y-2 text-center">
          <div className="mb-2 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
              {termine ? (
                <CheckCircle2 className="h-6 w-6 text-primary-foreground" />
              ) : (
                <KeyRound className="h-6 w-6 text-primary-foreground" />
              )}
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {termine ? 'Mot de passe enregistré' : 'Nouveau mot de passe'}
          </CardTitle>
          <CardDescription>
            {termine
              ? 'Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.'
              : 'Choisissez un mot de passe que vous êtes seul à connaître.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {termine ? (
            <Button className="w-full" onClick={() => navigate('/auth/login')}>
              Se connecter
            </Button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {erreur ? (
                <Alert variant="destructive">
                  <AlertDescription>{erreur}</AlertDescription>
                </Alert>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="mdp">Nouveau mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="mdp"
                    type="password"
                    autoComplete="new-password"
                    className="pl-9"
                    value={motDePasse}
                    onChange={(e) => setMotDePasse(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Au moins 8 caractères.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmation">Confirmer</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirmation"
                    type="password"
                    autoComplete="new-password"
                    className="pl-9"
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={enCours || sessionValide === null}>
                {enCours ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NouveauMotDePasse;
