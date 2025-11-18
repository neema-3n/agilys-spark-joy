import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { CalendarDays, Briefcase, Building2, BookOpen, Users, Settings as SettingsIcon, Database, Menu } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { ExercicesManager } from '@/components/parametres/ExercicesManager';
import { EnveloppesManager } from '@/components/parametres/EnveloppesManager';
import { StructureManager } from '@/components/parametres/StructureManager';
import { PlanComptableManager } from '@/components/parametres/PlanComptableManager';
import { ReferentielsManager } from '@/components/parametres/ReferentielsManager';

type ParametreSection = 
  | 'exercices' 
  | 'enveloppes' 
  | 'structure' 
  | 'plan-comptable'
  | 'referentiels' 
  | 'utilisateurs' 
  | 'general';

const Parametres = () => {
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState<ParametreSection>('exercices');
  const [sheetOpen, setSheetOpen] = useState(false);

  const sections = [
    {
      id: 'exercices' as ParametreSection,
      title: 'Exercices Budgétaires',
      description: 'Gestion des périodes budgétaires',
      icon: CalendarDays,
      component: <ExercicesManager />
    },
    {
      id: 'enveloppes' as ParametreSection,
      title: 'Enveloppes & Financement',
      description: 'Sources de financement',
      icon: Briefcase,
      component: <EnveloppesManager />
    },
    {
      id: 'structure' as ParametreSection,
      title: 'Structure Organisationnelle',
      description: 'Entités et services',
      icon: Building2,
      component: <StructureManager />
    },
    {
      id: 'plan-comptable' as ParametreSection,
      title: 'Plan Comptable',
      description: 'Comptes et structure comptable',
      icon: BookOpen,
      component: <PlanComptableManager />
    },
    {
      id: 'referentiels' as ParametreSection,
      title: 'Référentiels',
      description: 'Listes de valeurs',
      icon: Database,
      component: <ReferentielsManager />
    },
    {
      id: 'utilisateurs' as ParametreSection,
      title: 'Utilisateurs',
      description: 'Gestion des accès',
      icon: Users,
      component: (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Utilisateurs
            </CardTitle>
            <CardDescription>Module de gestion des utilisateurs à venir</CardDescription>
          </CardHeader>
        </Card>
      )
    },
    {
      id: 'general' as ParametreSection,
      title: 'Paramètres Généraux',
      description: 'Configuration système',
      icon: SettingsIcon,
      component: (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Paramètres Généraux
            </CardTitle>
            <CardDescription>Paramètres généraux à venir</CardDescription>
          </CardHeader>
        </Card>
      )
    }
  ];

  const activeContent = sections.find(s => s.id === activeSection)?.component;

  const NavigationContent = () => (
    <nav className="p-4 space-y-1">
      {sections.map((section) => {
        const Icon = section.icon;
        const isActive = activeSection === section.id;
        
        return (
          <button
            key={section.id}
            onClick={() => {
              setActiveSection(section.id);
              if (isMobile) setSheetOpen(false);
            }}
            className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors ${
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className={`font-medium text-sm ${isActive ? '' : 'text-foreground'}`}>
                {section.title}
              </div>
              <div className={`text-xs mt-0.5 ${isActive ? 'opacity-90' : ''}`}>
                {section.description}
              </div>
            </div>
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="flex h-full flex-col md:flex-row">
      {/* Desktop: Sidebar normale */}
      {!isMobile && (
        <aside className="w-72 border-r border-border bg-card/50">
          <div className="p-6 border-b border-border">
            <h1 className="text-2xl font-bold">Paramètres</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configuration de l'application
            </p>
          </div>
          <ScrollArea className="h-[calc(100vh-120px)]">
            <NavigationContent />
          </ScrollArea>
        </aside>
      )}

      {/* Mobile: En-tête avec bouton Sheet */}
      {isMobile && (
        <div className="p-4 border-b border-border bg-card/50 flex items-center gap-4">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <div className="p-6 border-b border-border">
                <h2 className="text-xl font-bold">Paramètres</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Sections
                </p>
              </div>
              <ScrollArea className="h-[calc(100vh-100px)]">
                <NavigationContent />
              </ScrollArea>
            </SheetContent>
          </Sheet>
          
          <div>
            <h1 className="text-xl font-bold">
              {sections.find(s => s.id === activeSection)?.title}
            </h1>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-8">
          {activeContent}
        </div>
      </main>
    </div>
  );
};

export default Parametres;
