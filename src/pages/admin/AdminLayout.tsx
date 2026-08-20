import { Outlet, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { Building2, LogOut, ShieldCheck, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

/**
 * Espace d'administration, hors application métier.
 *
 * La séparation est ici une affaire de métier et de lisibilité, pas de
 * sécurité : une adresse distincte ne protège rien, les deux espaces partant
 * dans le même navigateur. Ce qui protège réellement, ce sont la RLS et le
 * rôle — la garde ci-dessous ne fait qu'éviter d'afficher des écrans
 * inutilisables.
 */
const AdminLayout = () => {
  const navigate = useNavigate();
  const { user, isLoading, isAuthenticated, hasRole, logout } = useAuth();

  // On ne masque la page que tant que l'état d'authentification est inconnu.
  // Recharger le profil d'un utilisateur déjà connecté ne doit pas démonter
  // ce qu'il a sous les yeux : il y perdrait sa saisie en cours.
  if (isLoading && !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  if (!hasRole('super_admin')) {
    return <Navigate to="/app/executive-dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground text-background">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="font-semibold">Administration</p>
              <p className="text-xs text-muted-foreground">AGILYS</p>
            </div>
          </div>

          <nav className="ml-6 flex items-center gap-1">
            <NavLink
              to="/admin/clients"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/60',
                )
              }
            >
              <Building2 className="h-4 w-4" />
              Organisations
            </NavLink>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={() => navigate('/app/executive-dashboard')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Application
            </Button>
            <Button variant="ghost" size="icon" onClick={() => void logout()} aria-label="Déconnexion">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
