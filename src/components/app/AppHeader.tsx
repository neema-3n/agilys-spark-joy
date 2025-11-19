import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import { useTheme } from 'next-themes';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Bell,
  ChevronDown,
  LogOut,
  Moon,
  Search,
  Settings,
  Sun,
  User,
  HelpCircle,
  Menu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';

interface AppHeaderProps {
  onMenuClick?: () => void;
}

export const AppHeader = ({ onMenuClick }: AppHeaderProps) => {
  const { user, logout } = useAuth();
  const { currentClient, clients, setCurrentClient } = useClient();
  const { currentExercice, exercices, setCurrentExercice } = useExercice();
  const { theme, setTheme } = useTheme();
  const isMobile = useIsMobile();
  const [notificationCount] = useState(3); // Mock notifications

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-full items-center justify-between px-2 md:px-4 gap-1 md:gap-2 lg:gap-4">
        {/* Bouton menu mobile */}
        {isMobile && onMenuClick && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="shrink-0"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        {/* Zone gauche/centre: Sélecteurs */}
        <div className="flex items-center gap-1 md:gap-2 lg:gap-3 flex-1 min-w-0">
          {/* Sélecteur CLIENT */}
          <div className="flex flex-col gap-1 min-w-0">
            <label className="hidden md:block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              CLIENT
            </label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="min-w-[90px] md:min-w-[140px] lg:min-w-[180px] justify-between bg-card hover:bg-accent h-9"
                >
                  <span className="truncate text-xs md:text-sm">
                    {currentClient?.nom || 'Client'}
                  </span>
                  <ChevronDown className="ml-1 md:ml-2 h-3 w-3 md:h-4 md:w-4 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[200px]">
                {clients.map((client) => (
                  <DropdownMenuItem
                    key={client.id}
                    onClick={() => setCurrentClient(client)}
                    className={
                      currentClient?.id === client.id
                        ? 'bg-primary/10 text-primary'
                        : ''
                    }
                  >
                    {client.nom}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Sélecteur EXERCICE */}
          <div className="flex flex-col gap-1 min-w-0">
            <label className="hidden md:block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              EXERCICE
            </label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="min-w-[90px] md:min-w-[140px] lg:min-w-[180px] justify-between bg-card hover:bg-accent h-9"
                >
                  <span className="truncate text-xs md:text-sm">
                    {currentExercice?.libelle || 'Exercice'}
                  </span>
                  <ChevronDown className="ml-1 md:ml-2 h-3 w-3 md:h-4 md:w-4 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[200px]">
                {exercices.map((exercice) => (
                  <DropdownMenuItem
                    key={exercice.id}
                    onClick={() => setCurrentExercice(exercice)}
                    className={
                      currentExercice?.id === exercice.id
                        ? 'bg-primary/10 text-primary'
                        : ''
                    }
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{exercice.libelle}</span>
                      {exercice.code && (
                        <span className="text-xs text-muted-foreground">
                          {exercice.code}
                        </span>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Zone droite: Recherche et actions */}
        <div className="flex items-center gap-1 md:gap-2 shrink-0">
          {/* Barre de recherche - masquée sur petits écrans */}
          <div className="relative hidden xl:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Rechercher..."
              className="pl-9 w-[200px] lg:w-[300px] h-9 bg-card"
            />
          </div>

          {/* Toggle theme */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-semibold">
                    {notificationCount}
                  </span>
                )}
                <span className="sr-only">Notifications</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="p-4 text-sm text-muted-foreground text-center">
                Aucune notification pour le moment
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Profil utilisateur */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-1 md:gap-2 pl-1 md:pl-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                    {user?.prenom?.[0]?.toUpperCase()}
                    {user?.nom?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden xl:block text-sm font-medium">
                  {user?.prenom} {user?.nom}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">
                    {user?.prenom} {user?.nom}
                  </p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Mon profil
              </DropdownMenuItem>

              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Paramètres
              </DropdownMenuItem>

              <DropdownMenuItem>
                <HelpCircle className="mr-2 h-4 w-4" />
                Aide & Support
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
