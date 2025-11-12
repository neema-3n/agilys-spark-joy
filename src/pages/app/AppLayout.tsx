import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Wallet, FileText, Receipt, Building2, BarChart3, Settings, LogOut, ChevronDown, Menu, X, Users, FileCheck, CreditCard, Wallet2, BookOpen, ShieldCheck, LineChart, TrendingUp, BookmarkCheck, ShoppingCart, Briefcase, CalendarDays, DollarSign, FolderKanban, Layers } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
const AppLayout = () => {
  const {
    user,
    logout
  } = useAuth();
  const {
    currentClient,
    clients,
    setCurrentClient
  } = useClient();
  const {
    currentExercice,
    exercices,
    setCurrentExercice
  } = useExercice();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    'Gestion': true,
    'Budget': true,
    'Opérations': true,
    'Trésorerie': true,
    'Comptabilité': true,
    'Conformité': true,
    'Analyse': true,
    'Système': true
  });
  const toggleSection = (sectionTitle: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle]
    }));
  };
  // Color mapping for each section
  const sectionColors: Record<string, { bg: string; border: string; text: string; hover: string }> = {
    'Fournisseurs': { 
      bg: 'bg-gradient-to-r from-blue-50/50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/30', 
      border: 'border-l-blue-500', 
      text: 'text-blue-700 dark:text-blue-300',
      hover: 'hover:bg-blue-50/80 dark:hover:bg-blue-950/50'
    },
    'Budget': { 
      bg: 'bg-gradient-to-r from-purple-50/50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/30', 
      border: 'border-l-purple-500', 
      text: 'text-purple-700 dark:text-purple-300',
      hover: 'hover:bg-purple-50/80 dark:hover:bg-purple-950/50'
    },
    'Opérations': { 
      bg: 'bg-gradient-to-r from-amber-50/50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/30', 
      border: 'border-l-amber-500', 
      text: 'text-amber-700 dark:text-amber-300',
      hover: 'hover:bg-amber-50/80 dark:hover:bg-amber-950/50'
    },
    'Trésorerie': { 
      bg: 'bg-gradient-to-r from-green-50/50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/30', 
      border: 'border-l-green-500', 
      text: 'text-green-700 dark:text-green-300',
      hover: 'hover:bg-green-50/80 dark:hover:bg-green-950/50'
    },
    'Conformité': { 
      bg: 'bg-gradient-to-r from-red-50/50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/30', 
      border: 'border-l-red-500', 
      text: 'text-red-700 dark:text-red-300',
      hover: 'hover:bg-red-50/80 dark:hover:bg-red-950/50'
    },
    'Analyse': { 
      bg: 'bg-gradient-to-r from-indigo-50/50 to-indigo-100/50 dark:from-indigo-950/30 dark:to-indigo-900/30', 
      border: 'border-l-indigo-500', 
      text: 'text-indigo-700 dark:text-indigo-300',
      hover: 'hover:bg-indigo-50/80 dark:hover:bg-indigo-950/50'
    },
    'Système': { 
      bg: 'bg-gradient-to-r from-slate-50/50 to-slate-100/50 dark:from-slate-950/30 dark:to-slate-900/30', 
      border: 'border-l-slate-500', 
      text: 'text-slate-700 dark:text-slate-300',
      hover: 'hover:bg-slate-50/80 dark:hover:bg-slate-950/50'
    }
  };

  const navigationSections = [{
    title: 'Fournisseurs',
    icon: Users,
    items: [{
      name: 'Fournisseurs',
      href: '/app/fournisseurs',
      icon: Users
    }]
  }, {
    title: 'Budget',
    icon: Wallet,
    items: [{
      name: 'Budget',
      href: '/app/budgets',
      icon: Wallet
    }, {
      name: 'Structure Budgétaire',
      href: '/app/structure-budgetaire',
      icon: Layers
    }, {
      name: 'Prévisions Budgétaires',
      href: '/app/previsions',
      icon: TrendingUp
    }]
  }, {
    title: 'Opérations',
    icon: FileCheck,
    items: [{
      name: 'Réservation De Crédits',
      href: '/app/reservations',
      icon: BookmarkCheck
    }, {
      name: 'Engagements',
      href: '/app/engagements',
      icon: FileText
    }, {
      name: 'Bons De Commande',
      href: '/app/bons-commande',
      icon: ShoppingCart
    }, {
      name: 'Factures',
      href: '/app/factures',
      icon: Receipt
    }, {
      name: 'Dépenses',
      href: '/app/depenses',
      icon: DollarSign
    }, {
      name: 'Paiements',
      href: '/app/paiements',
      icon: CreditCard
    }]
  }, {
    title: 'Trésorerie',
    icon: Wallet2,
    items: [{
      name: 'Suivi De Trésorerie',
      href: '/app/tresorerie',
      icon: Wallet2
    }]
  }, {
    title: 'Conformité',
    icon: ShieldCheck,
    items: [{
      name: 'Contrôle Interne',
      href: '/app/controle-interne',
      icon: ShieldCheck
    }]
  }, {
    title: 'Analyse',
    icon: BarChart3,
    items: [{
      name: 'Tableau De Bord',
      href: '/app/dashboard',
      icon: LayoutDashboard
    }, {
      name: 'Projets & Analytique',
      href: '/app/projets',
      icon: FolderKanban
    }, {
      name: 'Analyses Financières',
      href: '/app/analyses',
      icon: LineChart
    }, {
      name: 'Reporting',
      href: '/app/reporting',
      icon: BarChart3
    }]
  }, {
    title: 'Système',
    icon: Settings,
    items: [{
      name: 'Paramètres',
      href: '/app/parametres',
      icon: Settings
    }]
  }];
  const handleLogout = async () => {
    await logout();
  };
  return <div className="min-h-screen bg-background flex w-full">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-card border-r border-border transition-all duration-300 flex flex-col h-screen`}>
        {/* Header Sidebar - FIXE */}
        <div className="flex-shrink-0 p-4 border-b border-border flex items-center justify-between bg-gradient-to-r from-primary/5 to-primary/10">
          {sidebarOpen && <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center shadow-md">
                <span className="text-sm font-bold text-primary-foreground">A</span>
              </div>
              <span className="font-bold text-lg bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">AGILYS</span>
            </div>}
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="ml-auto hover:bg-primary/10">
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>

        {/* Sélecteurs - FIXES */}
        {sidebarOpen && <div className="flex-shrink-0 p-4 space-y-3 border-b border-border bg-gradient-to-b from-muted/20 to-transparent">
            {/* Sélecteur de client */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wide">Client</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between text-sm hover:bg-accent/50 transition-colors">
                    <span className="truncate font-medium">{currentClient?.nom || 'Sélectionner'}</span>
                    <ChevronDown className="h-4 w-4 ml-2 flex-shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  {clients.map(client => <DropdownMenuItem key={client.id} onClick={() => setCurrentClient(client)}>
                      {client.nom}
                    </DropdownMenuItem>)}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Sélecteur d'exercice */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wide">Exercice</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between text-sm hover:bg-accent/50 transition-colors">
                    <span className="font-medium">{currentExercice?.libelle || 'Sélectionner'}</span>
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  {exercices.map(exercice => <DropdownMenuItem key={exercice.id} onClick={() => setCurrentExercice(exercice)}>
                      {exercice.libelle} ({exercice.statut})
                    </DropdownMenuItem>)}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navigationSections.map((section, sectionIndex) => {
            const isSingleItem = section.items.length === 1;
            const SectionIcon = section.icon;
            const colors = sectionColors[section.title];
            
            if (isSingleItem) {
              // Pour les sections avec un seul item, afficher directement sans collapsible
              const item = section.items[0];
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              
              return (
                <div key={section.title} className="space-y-1">
                  <NavLink
                    to={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 border-l-4 ${
                      isActive
                        ? `${colors.border} ${colors.bg} ${colors.text} font-semibold shadow-sm`
                        : `border-l-transparent text-muted-foreground ${colors.hover}`
                    }`}
                  >
                    <Icon className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                    {sidebarOpen && <span>{item.name}</span>}
                  </NavLink>
                  {sidebarOpen && sectionIndex < navigationSections.length - 1 && (
                    <div className="my-3 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                  )}
                </div>
              );
            }
            
            // Pour les sections avec plusieurs items, utiliser le collapsible
            return (
              <Collapsible key={section.title} open={openSections[section.title]} onOpenChange={() => toggleSection(section.title)} className="space-y-1">
                {/* Section Header - Cliquable pour toggle */}
                {sidebarOpen && (
                  <CollapsibleTrigger 
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold tracking-wider transition-all duration-200 border-l-4 ${colors.border} ${colors.bg} ${colors.text} ${colors.hover} shadow-sm group`}
                  >
                    <div className="flex items-center gap-2">
                      <SectionIcon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                      <span>{section.title}</span>
                      <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-background/50 text-muted-foreground font-medium">
                        {section.items.length}
                      </span>
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${openSections[section.title] ? 'rotate-0' : '-rotate-90'}`} />
                  </CollapsibleTrigger>
                )}
                
                {/* Section Items - Collapsible */}
                <CollapsibleContent className="space-y-1 pt-1">
                  {section.items.map(item => {
                    const isActive = location.pathname === item.href;
                    const Icon = item.icon;
                    
                    return (
                      <NavLink
                        key={item.href}
                        to={item.href}
                        className={`flex items-center gap-3 px-3 py-2 ml-2 rounded-lg text-sm transition-all duration-200 border-l-3 ${
                          isActive
                            ? `${colors.border} ${colors.bg} ${colors.text} font-semibold shadow-sm`
                            : `border-l-transparent text-muted-foreground ${colors.hover}`
                        }`}
                      >
                        <Icon className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                        {sidebarOpen && <span>{item.name}</span>}
                      </NavLink>
                    );
                  })}
                </CollapsibleContent>
                
                {/* Separator entre sections sauf la dernière */}
                {sidebarOpen && sectionIndex < navigationSections.length - 1 && (
                  <div className="my-3 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                )}
              </Collapsible>
            );
          })}
        </nav>

        {/* User Menu - FIXE */}
        <div className="flex-shrink-0 p-4 border-t border-border bg-gradient-to-t from-muted/20 to-transparent">
          {sidebarOpen ? <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">
                  {user?.prenom} {user?.nom}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="hover:bg-destructive/10 hover:text-destructive">
                <LogOut className="h-4 w-4" />
              </Button>
            </div> : <Button variant="ghost" size="icon" onClick={handleLogout} className="w-full hover:bg-destructive/10 hover:text-destructive">
              <LogOut className="h-4 w-4" />
            </Button>}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-hidden">
        <Outlet />
      </main>
    </div>;
};
export default AppLayout;