import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Lock, Mail, User } from 'lucide-react';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email({ message: "Email invalide" }),
  password: z.string().min(6, { message: "Minimum 6 caractères" })
});

const signupSchema = z.object({
  email: z.string().email({ message: "Email invalide" }),
  password: z.string().min(8, { message: "Minimum 8 caractères" }),
  confirmPassword: z.string(),
  nom: z.string().min(2, { message: "Nom requis (min 2 caractères)" }),
  prenom: z.string().min(2, { message: "Prénom requis (min 2 caractères)" })
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"]
});

const Login = () => {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});
  const [signupErrors, setSignupErrors] = useState<Record<string, string>>({});
  const { login, signup, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = location.state?.from || '/app/dashboard';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErrors({});
    
    const validation = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) errors[err.path[0].toString()] = err.message;
      });
      setLoginErrors(errors);
      return;
    }

    setIsLoading(true);
    const result = await login(loginEmail, loginPassword);
    setIsLoading(false);

    if (result.success) {
      toast({
        title: 'Connexion réussie',
        description: 'Bienvenue sur AGILYS',
      });
      navigate(from);
    } else {
      toast({
        title: 'Erreur de connexion',
        description: result.error || 'Email ou mot de passe incorrect',
        variant: 'destructive',
      });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupErrors({});
    
    const validation = signupSchema.safeParse({ 
      email: signupEmail, 
      password: signupPassword,
      confirmPassword,
      nom,
      prenom
    });
    
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) errors[err.path[0].toString()] = err.message;
      });
      setSignupErrors(errors);
      return;
    }

    setIsLoading(true);
    const result = await signup(signupEmail, signupPassword, nom, prenom);
    setIsLoading(false);
    
    if (result.success) {
      toast({
        title: 'Inscription réussie',
        description: 'Vérifiez votre email pour confirmer votre compte',
      });
      // Reset form
      setSignupEmail('');
      setSignupPassword('');
      setConfirmPassword('');
      setNom('');
      setPrenom('');
    } else {
      toast({
        title: 'Erreur d\'inscription',
        description: result.error || 'Une erreur est survenue',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4 animate-in fade-in duration-500">
      <Card className="w-full max-w-md shadow-primary">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-primary rounded-xl flex items-center justify-center shadow-glow">
              <span className="text-2xl font-bold text-primary-foreground">A</span>
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">AGILYS</CardTitle>
          <CardDescription>
            Plateforme de gestion budgétaire et comptable
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Connexion</TabsTrigger>
              <TabsTrigger value="signup">Inscription</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="votre@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                  {loginErrors.email && (
                    <p className="text-xs text-destructive">{loginErrors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                  {loginErrors.password && (
                    <p className="text-xs text-destructive">{loginErrors.password}</p>
                  )}
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? 'Connexion...' : 'Se connecter'}
                </Button>
              </form>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Comptes de test :</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>• <strong>Super Admin :</strong> super@agilys.com / MotDePasse123!</p>
                  <p>• <strong>Admin :</strong> admin@portonovo.bj / MotDePasse123!</p>
                  <p>• <strong>Directeur :</strong> directeur@portonovo.bj / MotDePasse123!</p>
                  <p>• <strong>Comptable :</strong> comptable@portonovo.bj / MotDePasse123!</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nom">Nom</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="nom"
                        type="text"
                        placeholder="Nom"
                        value={nom}
                        onChange={(e) => setNom(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                    {signupErrors.nom && (
                      <p className="text-xs text-destructive">{signupErrors.nom}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prenom">Prénom</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="prenom"
                        type="text"
                        placeholder="Prénom"
                        value={prenom}
                        onChange={(e) => setPrenom(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                    {signupErrors.prenom && (
                      <p className="text-xs text-destructive">{signupErrors.prenom}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="votre@email.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                  {signupErrors.email && (
                    <p className="text-xs text-destructive">{signupErrors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                  {signupErrors.password && (
                    <p className="text-xs text-destructive">{signupErrors.password}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmer mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                  {signupErrors.confirmPassword && (
                    <p className="text-xs text-destructive">{signupErrors.confirmPassword}</p>
                  )}
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? 'Inscription...' : "S'inscrire"}
                </Button>
              </form>
              <p className="text-xs text-muted-foreground mt-4 text-center">
                Un email de confirmation sera envoyé après l'inscription
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
