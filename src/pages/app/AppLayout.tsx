import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Wallet, FileText, Receipt, BarChart3, Settings, ChevronLeft, ChevronRight, ChevronDown, Users, CreditCard, Wallet2, ShieldCheck, LineChart, TrendingUp, BookmarkCheck, ShoppingCart, DollarSign, FolderKanban, Layers, PlayCircle, Target, Building2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AppHeader } from '@/components/app/AppHeader';
const AppLayout = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Fonction pour déterminer le groupe actif basé sur le pathname
  const getGroupFromPath = (pathname: string): 'operationnel' | 'pilotage' => {
    // Chercher la section qui contient cette route
    const section = allNavigationSections.find(s => 
      s.items.some(item => item.href === pathname)
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
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    'Fournisseurs': true,
    'Budget': true,
    'Opérations': true,
    'Trésorerie': true,
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

  // Synchroniser le groupe actif avec la route actuelle
  useEffect(() => {
    const group = getGroupFromPath(location.pathname);
    setActiveGroup(group);
  }, [location.pathname]);

  // Groupes principaux inspirés d'AirBooks
  const menuGroups = {
    operationnel: {
      label: 'Opérationnel',
      icon: PlayCircle,
      sections: ['Fournisseurs', 'Budget', 'Opérations', 'Trésorerie']
    },
    pilotage: {
      label: 'Pilotage & Contrôle',
      icon: Target,
      sections: ['Conformité', 'Analyse', 'Système']
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

  // Filtrer les sections selon le groupe actif
  const navigationSections = allNavigationSections.filter(section => 
    menuGroups[activeGroup].sections.includes(section.title)
  );
  
  return <div className="min-h-screen bg-background flex w-full">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-card border-r border-sidebar-border transition-all duration-300 flex flex-col h-screen`}>
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

        {/* Sélecteur de groupe (style AirBooks avec 2 icônes en haut) */}
        {sidebarOpen && <div className="flex-shrink-0 p-3 border-b border-sidebar-border bg-sidebar-accent">
          <div className="flex gap-2">
            <Button
              variant={activeGroup === 'operationnel' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveGroup('operationnel')}
              className="flex-1 justify-start gap-2"
            >
              <PlayCircle className="h-4 w-4" />
              <span className="text-xs font-medium">Opérationnel</span>
            </Button>
            <Button
              variant={activeGroup === 'pilotage' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveGroup('pilotage')}
              className="flex-1 justify-start gap-2"
            >
              <Target className="h-4 w-4" />
              <span className="text-xs font-medium">Pilotage</span>
            </Button>
          </div>
        </div>}


        {/* Navigation - Style AirBooks */}
        <nav className="flex-1 p-3 space-y-2 overflow-y-auto">
          {navigationSections.map((section, sectionIndex) => {
            const isSingleItem = section.items.length === 1;
            const SectionIcon = section.icon;
            
            if (isSingleItem) {
              // Pour les sections avec un seul item, afficher directement
              const item = section.items[0];
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              
              return (
                <div key={section.title} className="space-y-1">
                  {sidebarOpen && (
                    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {section.title}
                    </div>
                  )}
                  <NavLink
                    to={item.href}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-all duration-200 ${
                      isActive
                        ? 'bg-primary text-primary-foreground font-medium'
                        : 'text-foreground hover:bg-sidebar-accent'
                    }`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {sidebarOpen && <span>{item.name}</span>}
                  </NavLink>
                </div>
              );
            }
            
            // Pour les sections avec plusieurs items
            return (
              <Collapsible key={section.title} open={openSections[section.title]} onOpenChange={() => toggleSection(section.title)} className="space-y-1">
                {/* Section Header */}
                {sidebarOpen && (
                  <CollapsibleTrigger 
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <SectionIcon className="h-4 w-4" />
                      <span>{section.title}</span>
                    </div>
                    <ChevronDown className={`h-3 w-3 transition-transform duration-300 ${openSections[section.title] ? 'rotate-0' : '-rotate-90'}`} />
                  </CollapsibleTrigger>
                )}
                
                {/* Section Items avec indentation visible */}
                <CollapsibleContent className="space-y-1">
                  {section.items.map(item => {
                    const isActive = location.pathname === item.href;
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
                        {sidebarOpen && <span>{item.name}</span>}
                      </NavLink>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
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
        <AppHeader />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>;
};

export default AppLayout;