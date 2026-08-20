import { useEffect, useState } from 'react';
import { KeyRound, Mail, ShieldCheck, UserCircle } from 'lucide-react';
import { z } from 'zod';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useClient } from '@/contexts/ClientContext';
import { supabase } from '@/integrations/supabase/client';

const motDePasseSchema = z
  .object({
    nouveau: z.string().min(8, { message: 'Au moins 8 caractères' }),
    confirmation: z.string(),
  })
  .refine((v) => v.nouveau === v.confirmation, {
    message: 'Les deux saisies ne correspondent pas',
    path: ['confirmation'],
  });

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super administrateur',
  admin_client: 'Administrateur',
  directeur_financier: 'Directeur financier',
  chef_service: 'Chef de service',
  comptable: 'Comptable',
  operateur_saisie: 'Opérateur de saisie',
};

/**
 * Profil de l'utilisateur connecté.
 *
 * L'adresse email n'est pas modifiable ici : elle sert d'identifiant de
 * connexion et de destinataire des liens de récupération. La changer suppose
 * de vérifier la nouvelle adresse, ce qui relève d'un parcours distinct.
 */
const MonProfil = () => {
  const { user } = useAuth();
  const { currentClient, clients } = useClient();
  const { toast } = useToast();

  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [enregistrementIdentite, setEnregistrementIdentite] = useState(false);

  const [nouveau, setNouveau] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [erreurMotDePasse, setErreurMotDePasse] = useState<string | null>(null);
  const [enregistrementMotDePasse, setEnregistrementMotDePasse] = useState(false);

  useEffect(() => {
    setPrenom(user?.prenom ?? '');
    setNom(user?.nom ?? '');
  }, [user]);

  const enregistrerIdentite = async () => {
    if (!user) return;
    setEnregistrementIdentite(true);

    const { error } = await supabase
      .from('profiles')
      .update({ prenom: prenom.trim(), nom: nom.trim(), updated_at: new Date().toISOString() })
      .eq('id', user.id);

    setEnregistrementIdentite(false);

    if (error) {
      toast({ title: 'Enregistrement impossible', description: error.message, variant: 'destructive' });
      return;
    }

    toast({
      title: 'Profil mis à jour',
      description: 'Votre nom apparaîtra sous cette forme à votre prochaine connexion.',
    });
  };

  const changerMotDePasse = async () => {
    setErreurMotDePasse(null);

    const validation = motDePasseSchema.safeParse({ nouveau, confirmation });
    if (!validation.success) {
      setErreurMotDePasse(validation.error.errors[0].message);
      return;
    }

    setEnregistrementMotDePasse(true);
    const { error } = await supabase.auth.updateUser({ password: nouveau });
    setEnregistrementMotDePasse(false);

    if (error) {
      setErreurMotDePasse(error.message);
      return;
    }

    setNouveau('');
    setConfirmation('');
    toast({
      title: 'Mot de passe modifié',
      description: 'Il sera demandé à votre prochaine connexion.',
    });
  };

  const acces = clients.map((c) => ({
    nom: c.nom,
    role: ROLE_LABELS[c.role] ?? c.role,
    actif: c.id === currentClient?.id,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Mon profil" description="Vos informations et votre mot de passe" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserCircle className="h-5 w-5" />
              Identité
            </CardTitle>
            <CardDescription>
              Ce nom apparaît sur les pièces que vous saisissez et validez.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="prenom">Prénom</Label>
                <Input id="prenom" value={prenom} onChange={(e) => setPrenom(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nom">Nom</Label>
                <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Adresse email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" value={user?.email ?? ''} disabled className="pl-9" />
              </div>
              <p className="text-xs text-muted-foreground">
                Elle sert d&apos;identifiant de connexion et reçoit les liens de récupération.
                Contactez votre administrateur pour la changer.
              </p>
            </div>

            <Button
              onClick={() => void enregistrerIdentite()}
              disabled={enregistrementIdentite || (!prenom.trim() && !nom.trim())}
            >
              {enregistrementIdentite ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <KeyRound className="h-5 w-5" />
              Mot de passe
            </CardTitle>
            <CardDescription>
              Choisissez un mot de passe que vous êtes seul à connaître.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {erreurMotDePasse ? (
              <Alert variant="destructive">
                <AlertDescription>{erreurMotDePasse}</AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="nouveau">Nouveau mot de passe</Label>
              <Input
                id="nouveau"
                type="password"
                autoComplete="new-password"
                value={nouveau}
                onChange={(e) => setNouveau(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Au moins 8 caractères.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmation">Confirmer</Label>
              <Input
                id="confirmation"
                type="password"
                autoComplete="new-password"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
              />
            </div>

            <Button
              onClick={() => void changerMotDePasse()}
              disabled={enregistrementMotDePasse || !nouveau || !confirmation}
            >
              {enregistrementMotDePasse ? 'Enregistrement…' : 'Changer le mot de passe'}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="h-5 w-5" />
              Vos accès
            </CardTitle>
            <CardDescription>
              Les organisations auxquelles vous êtes rattaché, et votre rôle dans chacune.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {acces.map((a) => (
              <div
                key={a.nom}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{a.nom}</span>
                  {a.actif ? <Badge variant="outline">Organisation active</Badge> : null}
                </div>
                <span className="text-sm text-muted-foreground">{a.role}</span>
              </div>
            ))}
            {acces.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun rattachement.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MonProfil;
