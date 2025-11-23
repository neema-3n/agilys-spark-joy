import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Wallet, FileText, Receipt, BarChart3, Settings, ChevronLeft, ChevronRight, ChevronDown, Users, CreditCard, Wallet2, ShieldCheck, LineChart, TrendingUp, BookmarkCheck, ShoppingCart, DollarSign, FolderKanban, Layers, PlayCircle, Target, Building2, BookOpen } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AppHeader } from '@/components/app/AppHeader';
import { useIsMobile } from '@/hooks/use-mobile';

const AppLayout = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const mainRef = useRef<HTMLElement | null>(null);
  const scrollPositionsRef = useRef<Record<string, number>>({});
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    'Fournisseurs': true,
    'Budget': true,
    'Opérations': true,
    'Trésorerie': true,
    'Comptabilité': true,
    'Conformité': true,
    'Analyse': true,
    'Système': true
  });

  // Groupes principaux inspirés d'AirBooks
  const menuGroups = {
    operationnel: {
      label: 'Opérations',
      icon: PlayCircle,
      sections: ['Fournisseurs', 'Budget', 'Opérations', 'Trésorerie']
    },
    pilotage: {
      label: 'Pilotage & Contrôle',
      icon: Target,
      sections: ['Comptabilité', 'Conformité', 'Analyse', 'Système']
    }
  };

  const allNavigationSections = [{
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
      name: 'Prévisions Budgétaires',
      href: '/app/previsions',
      icon: TrendingUp
    }]
  }, {
    title: 'Opérations',
    icon: FileText,
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
    title: 'Comptabilité',
    icon: BookOpen,
    items: [{
      name: 'Plan Comptable',
      href: '/app/plan-comptable',
      icon: Layers
    }, {
      name: 'Journal Comptable',
      href: '/app/journal-comptable',
      icon: BookOpen
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
      href: '/app/parametres/exercices',
      icon: Settings
    }]
  }];

  const isPathActive = (targetPath: string) => {
    if (targetPath.startsWith('/app/parametres')) {
      return location.pathname === targetPath || location.pathname.startsWith('/app/parametres/');
    }

    return location.pathname === targetPath || location.pathname.startsWith(`${targetPath}/`);
  };

  // Fonction pour déterminer le groupe actif basé sur le pathname
  const getGroupFromPath = (pathname: string): 'operationnel' | 'pilotage' => {
    if (pathname.startsWith('/app/parametres')) {
      return 'pilotage';
    }

    // Chercher la section qui contient cette route
    const section = allNavigationSections.find(s => 
      s.items.some(item => pathname.startsWith(item.href))
    );
    
    if (!section) return 'operationnel'; // Par défaut
    
    // Vérifier dans quel groupe se trouve cette section
    if (menuGroups.pilotage.sections.includes(section.title)) {
      return 'pilotage';
    }
    
    return 'operationnel';
  };

  const [activeGroup, setActiveGroup] = useState<'operationnel' | 'pilotage'>(
    () => getGroupFromPath(location.pathname)
  );

  const toggleSection = (sectionTitle: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle]
    }));
  };

  // Helper pour rendre les items en mode collapsé avec tooltip
  const renderCollapsedItem = (item: any) => {
    const Icon = item.icon;
    const isActive = isPathActive(item.href);
    
    return (
      <Tooltip key={item.href}>
        <TooltipTrigger asChild>
          <NavLink
            to={item.href}
            className={`flex items-center justify-center w-full h-12 rounded-lg transition-all duration-200 ${
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground hover:bg-sidebar-accent'
            }`}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
          </NavLink>
        </TooltipTrigger>
        <TooltipContent side="right">{item.name}</TooltipContent>
      </Tooltip>
    );
  };

  // Synchroniser le groupe actif avec la route actuelle
  useEffect(() => {
    const group = getGroupFromPath(location.pathname);
    setActiveGroup(group);
  }, [location.pathname]);

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  // Sauvegarde la position de scroll pour chaque route
  useEffect(() => {
    const mainElement = mainRef.current;
    if (!mainElement) return;

    const handleScroll = () => {
      scrollPositionsRef.current[location.pathname] = mainElement.scrollTop;
    };

    mainElement.addEventListener('scroll', handleScroll);
    return () => mainElement.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  // Restaure la position de scroll de la route visitée
  useEffect(() => {
    const mainElement = mainRef.current;
    if (!mainElement) return;

    const savedScrollTop = scrollPositionsRef.current[location.pathname] ?? 0;
    mainElement.scrollTo({ top: savedScrollTop, behavior: 'auto' });
  }, [location.pathname]);

  // Filtrer les sections selon le groupe actif
  const navigationSections = allNavigationSections.filter(section => 
    menuGroups[activeGroup].sections.includes(section.title)
  );
  
  return <div className="min-h-screen bg-background flex w-full">
      {/* Overlay backdrop for mobile */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`${
        sidebarOpen ? 'w-64' : 'w-[72px]'
      } ${
        isMobile && sidebarOpen ? 'fixed inset-y-0 left-0 z-50 shadow-lg' : ''
      } ${
        isMobile && !sidebarOpen ? 'hidden' : ''
      } bg-card border-r border-sidebar-border transition-all duration-300 flex flex-col h-screen`}>
        {/* Header Sidebar - Style AirBooks */}
        <div className="flex-shrink-0 p-4 border-b border-sidebar-border flex items-center justify-between bg-primary">
          {sidebarOpen && <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-md">
                <span className="text-sm font-bold text-primary">A</span>
              </div>
              <span className="font-bold text-lg text-white">AGILYS</span>
            </div>}
          {!sidebarOpen && <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-md mx-auto">
            <span className="text-sm font-bold text-primary">A</span>
          </div>}
        </div>

        {/* Séparateur élégant */}
        <div className="h-3 border-b border-sidebar-border/50" />

        {/* Group Selector */}
        {sidebarOpen ? (
          <div className="flex-shrink-0 p-3 border-b border-sidebar-border bg-sidebar-accent">
            <div className="flex gap-2">
              <Button
                variant={activeGroup === 'operationnel' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveGroup('operationnel')}
                className="flex-1 gap-2 transition-all duration-200 hover:scale-105"
              >
                <PlayCircle className="h-5 w-5" />
                <span className="text-sm font-semibold">Opérations</span>
              </Button>
              <Button
                variant={activeGroup === 'pilotage' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveGroup('pilotage')}
                className="flex-1 gap-2 transition-all duration-200 hover:scale-105"
              >
                <Target className="h-5 w-5" />
                <span className="text-sm font-semibold">Pilotage</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-shrink-0 p-2 border-b border-sidebar-border bg-sidebar-accent space-y-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={activeGroup === 'operationnel' ? 'default' : 'ghost'}
                    size="icon"
                    onClick={() => setActiveGroup('operationnel')}
                    className="w-full h-10"
                  >
                    <PlayCircle className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Opérations</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={activeGroup === 'pilotage' ? 'default' : 'ghost'}
                    size="icon"
                    onClick={() => setActiveGroup('pilotage')}
                    className="w-full h-10"
                  >
                    <Target className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Pilotage & Contrôle</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}


        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          <TooltipProvider delayDuration={300}>
            {sidebarOpen ? (
              // Version étendue
              <>
                {navigationSections.map((section) => {
                  const isSingleItem = section.items.length === 1;
                  const SectionIcon = section.icon;
                  
                  if (isSingleItem) {
                    const item = section.items[0];
                    const isActive = isPathActive(item.href);
                    const Icon = item.icon;
                    
                    return (
                      <div key={section.title} className="space-y-1">
                        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {section.title}
                        </div>
                        <NavLink
                          to={item.href}
                          className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-all duration-200 ${
                            isActive
                              ? 'bg-primary text-primary-foreground font-medium'
                              : 'text-foreground hover:bg-sidebar-accent'
                          }`}
                        >
                          <Icon className="h-4 w-4 flex-shrink-0" />
                          <span>{item.name}</span>
                        </NavLink>
                      </div>
                    );
                  }
                  
                  return (
                    <Collapsible 
                      key={section.title} 
                      open={openSections[section.title]} 
                      onOpenChange={() => toggleSection(section.title)}
                      className="space-y-1"
                    >
                      <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                        <div className="flex items-center gap-2">
                          <SectionIcon className="h-4 w-4" />
                          <span>{section.title}</span>
                        </div>
                        <ChevronDown className={`h-3 w-3 transition-transform duration-300 ${openSections[section.title] ? 'rotate-0' : '-rotate-90'}`} />
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent className="space-y-1">
                        {section.items.map(item => {
                          const isActive = isPathActive(item.href);
                          const Icon = item.icon;
                          
                          return (
                            <NavLink
                              key={item.href}
                              to={item.href}
                              className={`flex items-center gap-3 ml-6 pl-4 py-3 rounded-lg text-sm transition-all duration-200 border-l-2 ${
                                isActive
                                  ? 'bg-primary/10 text-primary border-l-primary font-medium'
                                  : 'border-l-sidebar-border text-foreground hover:bg-sidebar-accent hover:border-l-primary/50'
                              }`}
                            >
                              <Icon className="h-4 w-4 flex-shrink-0" />
                              <span>{item.name}</span>
                            </NavLink>
                          );
                        })}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </>
            ) : (
              // Version collapsée - Liste plate de toutes les icônes
              <>
                {navigationSections.map((section) =>
                  section.items.map((item) => {
                    return renderCollapsedItem(item);
                  })
                )}
              </>
            )}
          </TooltipProvider>
        </nav>

        {/* Toggle button + User Menu - Style AirBooks */}
        <div className="flex-shrink-0 border-t border-sidebar-border bg-sidebar-background">
          {/* Toggle button en bas */}
          <div className="p-3 flex justify-center border-b border-sidebar-border">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hover:bg-sidebar-accent"
            >
              {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content with Header */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <AppHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main ref={mainRef} className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>;
};

export default AppLayout;
