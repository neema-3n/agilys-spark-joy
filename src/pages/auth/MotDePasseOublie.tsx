import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, MailCheck } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

const schema = z.object({ email: z.string().email({ message: 'Adresse email invalide' }) });

/**
 * Demande de réinitialisation du mot de passe.
 *
 * Le message de confirmation est le même que l'adresse existe ou non : révéler
 * qu'un compte est inconnu permettrait d'énumérer les utilisateurs de la
 * plateforme.
 */
const MotDePasseOublie = () => {
  const [email, setEmail] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoye, setEnvoye] = useState(false);
  const [enCours, setEnCours] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErreur(null);

    const validation = schema.safeParse({ email });
    if (!validation.success) {
      setErreur(validation.error.errors[0].message);
      return;
    }

    setEnCours(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/nouveau-mot-de-passe`,
    });
    setEnCours(false);

    // Une erreur de transport est signalée ; l'absence de compte ne l'est pas.
    if (error && !/user not found/i.test(error.message)) {
      setErreur(error.message);
      return;
    }

    setEnvoye(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero p-4">
      <Card className="w-full max-w-md shadow-primary">
        <CardHeader className="space-y-2 text-center">
          <div className="mb-2 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
              {envoye ? (
                <MailCheck className="h-6 w-6 text-primary-foreground" />
              ) : (
                <Mail className="h-6 w-6 text-primary-foreground" />
              )}
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {envoye ? 'Vérifiez votre messagerie' : 'Mot de passe oublié'}
          </CardTitle>
          <CardDescription>
            {envoye
              ? "Si un compte existe pour cette adresse, un lien de réinitialisation vient d'être envoyé. Il est valable une heure."
              : 'Indiquez votre adresse email : vous recevrez un lien pour choisir un nouveau mot de passe.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {envoye ? (
            <p className="text-center text-sm text-muted-foreground">
              Pensez à regarder vos courriers indésirables. Sans email d&apos;ici quelques minutes,
              contactez l&apos;administrateur de votre organisation.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {erreur ? (
                <Alert variant="destructive">
                  <AlertDescription>{erreur}</AlertDescription>
                </Alert>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="email">Adresse email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    className="pl-9"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={enCours}>
                {enCours ? 'Envoi…' : 'Envoyer le lien'}
              </Button>
            </form>
          )}

          <Link
            to="/auth/login"
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à la connexion
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default MotDePasseOublie;
