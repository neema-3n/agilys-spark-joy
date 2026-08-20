import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const [parametres] = useSearchParams();
  // Un invité n'a jamais eu de mot de passe : lui parler de « nouveau » mot de
  // passe ou de « lien expiré » n'aurait aucun sens de son point de vue.
  const estInvitation = parametres.get('invitation') === '1';
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

    // La réussite est actée avant la déconnexion : celle-ci supprime la
    // session, et rien de ce qu'elle déclenche ne doit pouvoir repeindre en
    // « lien expiré » un mot de passe déjà enregistré.
    setTermine(true);
    await supabase.auth.signOut();
  };

  // `termine` prime : une fois le mot de passe accepté par le serveur, la
  // disparition de la session est le résultat attendu, pas un lien invalide.
  if (sessionValide === false && !termine) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-hero p-4">
        <Card className="w-full max-w-md shadow-primary">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-2xl font-bold">Lien expiré</CardTitle>
            <CardDescription>
              {estInvitation
                ? "Ce lien d'invitation n'est plus valable. Demandez à votre administrateur de vous en envoyer un nouveau."
                : "Ce lien de réinitialisation n'est plus valable. Les liens expirent au bout d'une heure et ne servent qu'une fois."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => navigate(estInvitation ? '/auth/login' : '/auth/mot-de-passe-oublie')}
            >
              {estInvitation ? 'Retour à la connexion' : 'Demander un nouveau lien'}
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
            {termine
              ? 'Mot de passe enregistré'
              : estInvitation
                ? 'Bienvenue sur AGILYS'
                : 'Nouveau mot de passe'}
          </CardTitle>
          <CardDescription>
            {termine
              ? 'Vous pouvez maintenant vous connecter avec votre mot de passe.'
              : estInvitation
                ? 'Votre accès est créé. Choisissez le mot de passe qui vous servira à vous connecter.'
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
                <Label htmlFor="mdp">{estInvitation ? 'Mot de passe' : 'Nouveau mot de passe'}</Label>
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
