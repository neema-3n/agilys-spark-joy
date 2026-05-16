import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  BarChart3,
  Bell,
  BookOpen,
  BookmarkCheck,
  CheckCircle2,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  DollarSign,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Layers,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  Receipt,
  Search,
  Settings,
  ShoppingCart,
  Sun,
  WalletCards,
  User,
  Users,
  Wallet,
  Wallet2,
  X,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/contexts/AuthContext';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

type NavigationItem = {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  badge?: string;
};

type NavigationSection = {
  title: string;
  items: NavigationItem[];
};

const navigationSections: NavigationSection[] = [
  {
    title: 'Accueil',
    items: [
      {
        name: 'Tableau de bord',
        href: '/app/dashboard',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: 'Préparation',
    items: [
      {
        name: 'Budget',
        href: '/app/budgets',
        icon: Wallet,
      },
      {
        name: 'Projets & analytique',
        href: '/app/projets',
        icon: FolderKanban,
      },
    ],
  },
  {
    title: 'Exécution',
    items: [
      {
        name: 'Réservations',
        href: '/app/reservations',
        icon: BookmarkCheck,
      },
      {
        name: 'Engagements',
        href: '/app/engagements',
        icon: FileText,
      },
      {
        name: 'Dépenses',
        href: '/app/depenses',
        icon: DollarSign,
      },
      {
        name: 'Paiements',
        href: '/app/paiements',
        icon: CreditCard,
      },
    ],
  },
  {
    title: 'Achats',
    items: [
      {
        name: 'Fournisseurs',
        href: '/app/fournisseurs',
        icon: Users,
      },
      {
        name: 'Bons de commande',
        href: '/app/bons-commande',
        icon: ShoppingCart,
      },
      {
        name: 'Factures',
        href: '/app/factures',
        icon: Receipt,
      },
    ],
  },
  {
    title: 'Trésorerie',
    items: [
      {
        name: 'Comptes',
        href: '/app/tresorerie/comptes',
        icon: Wallet2,
      },
      {
        name: 'Recettes',
        href: '/app/tresorerie/recettes',
        icon: FileText,
      },
      {
        name: 'Opérations',
        href: '/app/tresorerie/operations',
        icon: ArrowLeftRight,
      },
      {
        name: 'Rapprochements',
        href: '/app/tresorerie/rapprochements',
        icon: CheckCircle2,
      },
    ],
  },
  {
    title: 'Reporting',
    items: [
      {
        name: 'Budgétaire',
        href: '/app/reporting/budgetaire',
        icon: BarChart3,
      },
      {
        name: 'Financier',
        href: '/app/reporting/financier',
        icon: Wallet,
      },
      {
        name: 'Comptable',
        href: '/app/reporting/comptable',
        icon: BookOpen,
      },
      {
        name: 'Trésorerie',
        href: '/app/reporting/tresorerie',
        icon: WalletCards,
      },
      {
        name: 'Réglementaire',
        href: '/app/reporting/reglementaire',
        icon: FileText,
      },
    ],
  },
  {
    title: 'Admin',
    items: [
      {
        name: 'Paramètres',
        href: '/app/parametres/exercices',
        icon: Settings,
      },
      {
        name: 'Plan comptable',
        href: '/app/plan-comptable',
        icon: Layers,
      },
    ],
  },
];

const isPathActive = (pathname: string, targetPath: string) => {
  if (targetPath.startsWith('/app/parametres')) {
    return pathname === targetPath || pathname.startsWith('/app/parametres/');
  }

  return pathname === targetPath || pathname.startsWith(`${targetPath}/`);
};

const getInitialOpenSections = (pathname: string) =>
  navigationSections.reduce<Record<string, boolean>>((acc, section) => {
    acc[section.title] = section.items.some((item) =>
      isPathActive(pathname, item.href),
    );
    return acc;
  }, {});

const OutletContentSkeleton = () => (
  <div className="space-y-6">
    <div className="space-y-3 border-b border-border pb-5">
      <Skeleton className="h-1.5 w-14 rounded-full bg-primary/30" />
      <Skeleton className="h-10 w-80 max-w-[70%]" />
      <Skeleton className="h-6 w-[28rem] max-w-[85%]" />
    </div>

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={`summary-skeleton-${index}`}
          className="rounded-xl border border-border bg-card p-6 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-9 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-10 w-10 rounded-xl" />
          </div>
        </div>
      ))}
    </div>

    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="space-y-4 border-b border-border px-6 py-5">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-5 w-80 max-w-[70%]" />
        <div className="flex flex-wrap gap-3 pt-1">
          <Skeleton className="h-11 flex-1 min-w-[260px]" />
          <Skeleton className="h-11 w-40" />
          <Skeleton className="h-11 w-40" />
        </div>
      </div>
      <div className="px-6 py-5">
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`row-skeleton-${index}`}
              className="grid grid-cols-[2.2fr_repeat(4,minmax(0,1fr))] gap-4"
            >
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const AppLayoutTailAdmin = () => {
  const { user, logout } = useAuth();
  const { isLoading: clientLoading, hasLoaded: clientLoaded, currentClient } = useClient();
  const { isLoading: exerciceLoading, hasLoaded: exerciceLoaded } = useExercice();
  const location = useLocation();
  const isMobile = useIsMobile();
  const mainRef = useRef<HTMLElement | null>(null);
  const scrollPositionsRef = useRef<Record<string, number>>({});
  const [sidebarExpanded, setSidebarExpanded] = useState(!isMobile);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    getInitialOpenSections(location.pathname),
  );

  const showDataLoader =
    clientLoading ||
    !clientLoaded ||
    !currentClient ||
    exerciceLoading ||
    !exerciceLoaded;

  const activeSectionTitle = useMemo(() => {
    return (
      navigationSections.find((section) =>
        section.items.some((item) => isPathActive(location.pathname, item.href)),
      )?.title ?? 'Menu'
    );
  }, [location.pathname]);

  useEffect(() => {
    setOpenSections((current) => ({
      ...current,
      ...getInitialOpenSections(location.pathname),
    }));
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  }, [isMobile, location.pathname]);

  useEffect(() => {
    if (isMobile) {
      setSidebarExpanded(false);
    } else {
      setMobileMenuOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    const mainElement = mainRef.current;
    if (!mainElement) return;

    const handleScroll = () => {
      scrollPositionsRef.current[location.pathname] = mainElement.scrollTop;
    };

    mainElement.addEventListener('scroll', handleScroll);
    return () => mainElement.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  useEffect(() => {
    const mainElement = mainRef.current;
    if (!mainElement) return;

    const savedScrollTop = scrollPositionsRef.current[location.pathname] ?? 0;
    mainElement.scrollTo({ top: savedScrollTop, behavior: 'auto' });
  }, [location.pathname]);

  const toggleSection = (sectionTitle: string) => {
    setOpenSections((current) => ({
      ...current,
      [sectionTitle]: !current[sectionTitle],
    }));
  };

  return (
    <TooltipProvider delayDuration={250}>
      <div className="min-h-screen bg-muted/40 text-foreground">
        {isMobile && mobileMenuOpen && (
          <button
            type="button"
            aria-label="Fermer le menu"
            className="fixed inset-0 z-40 bg-foreground/45 backdrop-blur-[1px]"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex h-screen flex-col border-r border-border bg-card text-card-foreground shadow-sm transition-all duration-300',
            sidebarExpanded ? 'w-[290px]' : 'w-[88px]',
            isMobile && !mobileMenuOpen && '-translate-x-full',
            isMobile && 'w-[290px]',
          )}
        >
          <SidebarChrome
            expanded={isMobile ? true : sidebarExpanded}
            activeSectionTitle={activeSectionTitle}
            openSections={openSections}
            onToggleSection={toggleSection}
            onToggleSidebar={() => setSidebarExpanded((current) => !current)}
            onCloseMobile={() => setMobileMenuOpen(false)}
            showCloseButton={isMobile}
          />
        </aside>

        <div
          className={cn(
            'flex min-h-screen flex-col transition-[padding] duration-300',
            sidebarExpanded ? 'lg:pl-[290px]' : 'lg:pl-[88px]',
          )}
        >
          <TailAdminHeader
            onMenuClick={() => setMobileMenuOpen(true)}
            onToggleSidebar={() => setSidebarExpanded((current) => !current)}
            sidebarExpanded={sidebarExpanded}
            onLogout={logout}
            user={user}
          />

          <main
            ref={mainRef}
            className="flex-1 overflow-auto bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.08),transparent_30%),hsl(var(--muted)/0.55)]"
          >
            {showDataLoader ? (
              <div className="flex min-h-[calc(100vh-76px)] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
              </div>
            ) : (
              <div className="mx-auto w-full max-w-[1680px] px-4 py-5 sm:px-5 lg:px-8 lg:py-7">
                <Suspense
                  fallback={
                    <OutletContentSkeleton />
                  }
                >
                  <Outlet />
                </Suspense>
              </div>
            )}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
};

interface SidebarChromeProps {
  expanded: boolean;
  activeSectionTitle: string;
  openSections: Record<string, boolean>;
  onToggleSection: (sectionTitle: string) => void;
  onToggleSidebar: () => void;
  onCloseMobile: () => void;
  showCloseButton: boolean;
}

const SidebarChrome = ({
  expanded,
  activeSectionTitle,
  openSections,
  onToggleSection,
  onToggleSidebar,
  onCloseMobile,
  showCloseButton,
}: SidebarChromeProps) => {
  const location = useLocation();

  return (
    <>
      <div className="flex h-[76px] items-center gap-3 border-b border-border px-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-base font-bold text-primary-foreground shadow-primary">
          A
        </div>
        {expanded && (
          <div className="min-w-0">
            <div className="truncate text-lg font-bold leading-tight">AGILYS</div>
            <div className="truncate text-xs font-medium text-muted-foreground">
              Financial operations
            </div>
          </div>
        )}
        {showCloseButton && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="ml-auto"
            onClick={onCloseMobile}
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-5">
        {navigationSections.map((section) => {
          const sectionIsActive = section.title === activeSectionTitle;
          const sectionIsOpen = openSections[section.title] ?? sectionIsActive;

          if (!expanded) {
            return (
              <div key={section.title} className="mb-5 space-y-2">
                {section.items.map((item) => (
                  <CollapsedNavigationItem
                    key={item.href}
                    item={item}
                    active={isPathActive(location.pathname, item.href)}
                  />
                ))}
              </div>
            );
          }

          return (
            <Collapsible
              key={section.title}
              open={sectionIsOpen}
              onOpenChange={() => onToggleSection(section.title)}
              className="mb-5"
            >
              <CollapsibleTrigger className="mb-2 flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <span>{section.title}</span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform',
                    !sectionIsOpen && '-rotate-90',
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1">
                {section.items.map((item) => (
                  <ExpandedNavigationItem
                    key={item.href}
                    item={item}
                    active={isPathActive(location.pathname, item.href)}
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>

      <div className="border-t border-border p-4">
        <div
          className={cn(
            'rounded-xl border border-border bg-muted/50 p-3',
            !expanded && 'flex justify-center border-transparent bg-transparent p-0',
          )}
        >
          {expanded ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">Workspace AGILYS</p>
                  <p className="truncate text-xs text-muted-foreground">Cloud Supabase</p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-center"
                onClick={showCloseButton ? onCloseMobile : onToggleSidebar}
              >
                <ChevronLeft className="h-4 w-4" />
                {showCloseButton ? 'Fermer' : 'Réduire'}
              </Button>
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onToggleSidebar}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Étendre le menu</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </>
  );
};

interface NavigationItemProps {
  item: NavigationItem;
  active: boolean;
}

const ExpandedNavigationItem = ({ item, active }: NavigationItemProps) => {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.href}
      className={cn(
        'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
        active
          ? 'bg-primary text-primary-foreground shadow-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{item.name}</span>
      {item.badge && (
        <Badge
          variant={active ? 'secondary' : 'outline'}
          className={cn(active && 'border-transparent bg-primary-foreground/20 text-primary-foreground')}
        >
          {item.badge}
        </Badge>
      )}
    </NavLink>
  );
};

const CollapsedNavigationItem = ({ item, active }: NavigationItemProps) => {
  const Icon = item.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <NavLink
          to={item.href}
          className={cn(
            'mx-auto flex h-11 w-11 items-center justify-center rounded-xl transition-all',
            active
              ? 'bg-primary text-primary-foreground shadow-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          <Icon className="h-5 w-5" />
        </NavLink>
      </TooltipTrigger>
      <TooltipContent side="right">{item.name}</TooltipContent>
    </Tooltip>
  );
};

interface TailAdminHeaderProps {
  onMenuClick: () => void;
  onToggleSidebar: () => void;
  sidebarExpanded: boolean;
  onLogout: () => Promise<void>;
  user: ReturnType<typeof useAuth>['user'];
}

const TailAdminHeader = ({
  onMenuClick,
  onToggleSidebar,
  sidebarExpanded,
  onLogout,
  user,
}: TailAdminHeaderProps) => {
  const { currentClient, clients, setCurrentClient } = useClient();
  const { currentExercice, exercices, setCurrentExercice } = useExercice();
  const { theme, setTheme } = useTheme();
  const isMobile = useIsMobile();
  const [notificationCount] = useState(3);

  return (
    <header className="sticky top-0 z-30 h-[76px] border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-full items-center gap-3 px-4 sm:px-5 lg:px-8">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="hidden lg:inline-flex"
          onClick={onToggleSidebar}
        >
          <PanelLeftClose
            className={cn('h-5 w-5 transition-transform', !sidebarExpanded && 'rotate-180')}
          />
        </Button>

        <div className="relative hidden min-w-[240px] max-w-[360px] flex-1 xl:block">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Rechercher dans AGILYS"
            className="h-11 rounded-xl border-border bg-muted/50 pl-10 pr-16"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-border bg-background px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground 2xl:block">
            ⌘ K
          </kbd>
        </div>

        <div className="ml-auto flex min-w-0 items-center gap-2">
          <ContextSwitcher
            label="Client"
            value={currentClient?.nom ?? 'Sélectionner un client'}
            items={clients.map((client) => ({
              id: client.id,
              primary: client.nom,
              active: currentClient?.id === client.id,
              onSelect: () => setCurrentClient(client),
            }))}
          />

          <ContextSwitcher
            label="Exercice"
            value={currentExercice?.libelle ?? 'Sélectionner un exercice'}
            items={exercices.map((exercice) => ({
              id: exercice.id,
              primary: exercice.libelle,
              secondary: exercice.code,
              active: currentExercice?.id === exercice.id,
              onSelect: () => setCurrentExercice(exercice),
            }))}
            className="hidden md:block"
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Changer le thème</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {notificationCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
                    {notificationCount}
                  </span>
                )}
                <span className="sr-only">Notifications</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="p-4 text-center text-sm text-muted-foreground">
                Aucune notification pour le moment
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="h-11 gap-2 rounded-xl px-2 sm:px-3"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                    {user?.prenom?.[0]?.toUpperCase()}
                    {user?.nom?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {!isMobile && (
                  <span className="hidden max-w-[150px] truncate text-sm font-semibold 2xl:block">
                    {user?.prenom} {user?.nom}
                  </span>
                )}
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold">
                    {user?.prenom} {user?.nom}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
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
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onLogout}
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

interface ContextSwitcherItem {
  id: string;
  primary: string;
  secondary?: string | null;
  active: boolean;
  onSelect: () => void;
}

interface ContextSwitcherProps {
  label: string;
  value: string;
  items: ContextSwitcherItem[];
  className?: string;
}

const ContextSwitcher = ({ label, value, items, className }: ContextSwitcherProps) => (
  <div className={className}>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-11 max-w-[220px] justify-between gap-3 rounded-xl bg-card px-3 text-left shadow-sm"
        >
          <span className="min-w-0">
            <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </span>
            <span className="block truncate text-sm font-semibold">{value}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map((item) => (
          <DropdownMenuItem
            key={item.id}
            onClick={item.onSelect}
            className={cn(item.active && 'bg-primary/10 text-primary')}
          >
            <span className="min-w-0">
              <span className="block truncate font-medium">{item.primary}</span>
              {item.secondary && (
                <span className="block truncate text-xs text-muted-foreground">
                  {item.secondary}
                </span>
              )}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);

export default AppLayoutTailAdmin;
