import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Wallet, 
  FileText, 
  Receipt, 
  Building2, 
  BarChart3, 
  Settings, 
  LogOut,
  ChevronDown,
  Menu,
  X,
  Users,
  FileCheck,
  CreditCard,
  Wallet2,
  BookOpen,
  ShieldCheck,
  LineChart,
  TrendingUp
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const AppLayout = () => {
  const { user, logout } = useAuth();
  const { currentClient, clients, setCurrentClient } = useClient();
  const { currentExercice, exercices, setCurrentExercice } = useExercice();
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
    'Système': true,
  });

  const toggleSection = (sectionTitle: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle]
    }));
  };

  const navigationSections = [
    {
      title: 'Gestion',
      items: [
        { name: 'Structure Organisationnelle', href: '/app/structure', icon: Building2 },
        { name: 'Fournisseurs', href: '/app/fournisseurs', icon: Users },
      ]
    },
    {
      title: 'Budget',
      items: [
        { name: 'Budget', href: '/app/budgets', icon: Wallet },
        { name: 'Prévisions Budgétaires', href: '/app/previsions', icon: TrendingUp },
      ]
    },
    {
      title: 'Opérations',
      items: [
        { name: 'Engagements', href: '/app/engagements', icon: FileText },
        { name: 'Mandats', href: '/app/mandats', icon: FileCheck },
        { name: 'Factures', href: '/app/factures', icon: Receipt },
        { name: 'Paiements', href: '/app/paiements', icon: CreditCard },
      ]
    },
    {
      title: 'Trésorerie',
      items: [
        { name: 'Suivi de Trésorerie', href: '/app/tresorerie', icon: Wallet2 },
      ]
    },
    {
      title: 'Comptabilité',
      items: [
        { name: 'Plan Comptable', href: '/app/plan-comptable', icon: BookOpen },
      ]
    },
    {
      title: 'Conformité',
      items: [
        { name: 'Contrôle Interne', href: '/app/controle-interne', icon: ShieldCheck },
      ]
    },
    {
      title: 'Analyse',
      items: [
        { name: 'Tableau de bord', href: '/app/dashboard', icon: LayoutDashboard },
        { name: 'Analyses Financières', href: '/app/analyses', icon: LineChart },
        { name: 'Reporting', href: '/app/reporting', icon: BarChart3 },
      ]
    },
    {
      title: 'Système',
      items: [
        { name: 'Paramètres', href: '/app/parametres', icon: Settings },
      ]
    }
  ];

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-16'
        } bg-card border-r border-border transition-all duration-300 flex flex-col`}
      >
        {/* Header Sidebar */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <span className="text-sm font-bold text-primary-foreground">A</span>
              </div>
              <span className="font-bold text-lg">AGILYS</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ml-auto"
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>

        {/* Sélecteurs */}
        {sidebarOpen && (
          <div className="p-4 space-y-3 border-b border-border">
            {/* Sélecteur de client */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Client</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between text-sm">
                    <span className="truncate">{currentClient?.nom || 'Sélectionner'}</span>
                    <ChevronDown className="h-4 w-4 ml-2 flex-shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  {clients.map((client) => (
                    <DropdownMenuItem
                      key={client.id}
                      onClick={() => setCurrentClient(client)}
                    >
                      {client.nom}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Sélecteur d'exercice */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Exercice</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between text-sm">
                    <span>{currentExercice?.annee || 'Sélectionner'}</span>
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  {exercices.map((exercice) => (
                    <DropdownMenuItem
                      key={exercice.id}
                      onClick={() => setCurrentExercice(exercice)}
                    >
                      {exercice.annee} ({exercice.statut})
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigationSections.map((section, sectionIndex) => (
            <Collapsible
              key={section.title}
              open={openSections[section.title]}
              onOpenChange={() => toggleSection(section.title)}
              className="space-y-1"
            >
              {/* Section Header - Cliquable pour toggle */}
              {sidebarOpen && (
                <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors group">
                  <span>{section.title}</span>
                  <ChevronDown 
                    className={`h-4 w-4 transition-transform duration-200 ${
                      openSections[section.title] ? 'rotate-0' : '-rotate-90'
                    }`}
                  />
                </CollapsibleTrigger>
              )}
              
              {/* Section Items - Collapsible */}
              <CollapsibleContent className="space-y-1">
                {section.items.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      }`}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {sidebarOpen && <span className="text-sm font-medium">{item.name}</span>}
                    </NavLink>
                  );
                })}
              </CollapsibleContent>
              
              {/* Separator entre sections sauf la dernière */}
              {sidebarOpen && sectionIndex < navigationSections.length - 1 && (
                <Separator className="my-2" />
              )}
            </Collapsible>
          ))}
        </nav>

        {/* User Menu */}
        <div className="p-4 border-t border-border">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user?.prenom} {user?.nom}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="icon" onClick={handleLogout} className="w-full">
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
