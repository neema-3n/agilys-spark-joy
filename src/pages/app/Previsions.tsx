import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Wand2 } from 'lucide-react';
import { usePrevisions } from '@/hooks/usePrevisions';
import { ScenarioDialog } from '@/components/previsions/ScenarioDialog';
import { ScenarioCard } from '@/components/previsions/ScenarioCard';
import { GenerateurPrevisions } from '@/components/previsions/GenerateurPrevisions';
import { Scenario } from '@/types/prevision.types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const Previsions = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generateurOpen, setGenerateurOpen] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scenarioToDelete, setScenarioToDelete] = useState<string | null>(null);

  const {
    scenarios,
    loadingScenarios,
    createScenario,
    updateScenario,
    deleteScenario,
    validerScenario,
    archiverScenario,
    dupliquerScenario,
    genererPrevisions,
  } = usePrevisions();

  const handleCreateEdit = (data: any) => {
    if (selectedScenario) {
      updateScenario.mutate({ id: selectedScenario.id, updates: data });
    } else {
      createScenario.mutate(data);
    }
    setSelectedScenario(null);
  };

  const handleEdit = (scenario: Scenario) => {
    setSelectedScenario(scenario);
    setDialogOpen(true);
  };

  const handleDuplicate = (scenario: Scenario) => {
    const nouveauCode = `${scenario.code}-COPIE`;
    const nouveauNom = `${scenario.nom} (Copie)`;
    dupliquerScenario.mutate({ id: scenario.id, code: nouveauCode, nom: nouveauNom });
  };

  const handleDelete = (id: string) => {
    setScenarioToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (scenarioToDelete) {
      deleteScenario.mutate(scenarioToDelete);
      setScenarioToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleOpenGenerateur = (scenario: Scenario) => {
    setSelectedScenario(scenario);
    setGenerateurOpen(true);
  };

  const handleGenerate = (params: any) => {
    genererPrevisions.mutate(params, {
      onSuccess: () => {
        setGenerateurOpen(false);
        setSelectedScenario(null);
      },
    });
  };

  const scenariosBrouillon = scenarios?.filter(s => s.statut === 'brouillon') || [];
  const scenariosValides = scenarios?.filter(s => s.statut === 'valide') || [];
  const scenariosArchives = scenarios?.filter(s => s.statut === 'archive') || [];

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Prévisions Budgétaires</h1>
            <p className="text-muted-foreground">
              Projections pluriannuelles et scénarios budgétaires
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setSelectedScenario(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouveau scénario
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="brouillon" className="space-y-6">
        <TabsList>
          <TabsTrigger value="brouillon">
            Brouillons ({scenariosBrouillon.length})
          </TabsTrigger>
          <TabsTrigger value="valides">
            Validés ({scenariosValides.length})
          </TabsTrigger>
          <TabsTrigger value="archives">
            Archivés ({scenariosArchives.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="brouillon" className="space-y-4">
          {loadingScenarios ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Chargement...
              </CardContent>
            </Card>
          ) : scenariosBrouillon.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Aucun scénario en brouillon
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scenariosBrouillon.map((scenario) => (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  onEdit={handleEdit}
                  onDuplicate={handleDuplicate}
                  onValidate={(id) => validerScenario.mutate(id)}
                  onArchive={(id) => archiverScenario.mutate(id)}
                  onDelete={handleDelete}
                  onViewDetails={handleOpenGenerateur}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="valides" className="space-y-4">
          {loadingScenarios ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Chargement...
              </CardContent>
            </Card>
          ) : scenariosValides.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Aucun scénario validé
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scenariosValides.map((scenario) => (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  onEdit={handleEdit}
                  onDuplicate={handleDuplicate}
                  onValidate={(id) => validerScenario.mutate(id)}
                  onArchive={(id) => archiverScenario.mutate(id)}
                  onDelete={handleDelete}
                  onViewDetails={handleOpenGenerateur}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="archives" className="space-y-4">
          {loadingScenarios ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Chargement...
              </CardContent>
            </Card>
          ) : scenariosArchives.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Aucun scénario archivé
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scenariosArchives.map((scenario) => (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  onEdit={handleEdit}
                  onDuplicate={handleDuplicate}
                  onValidate={(id) => validerScenario.mutate(id)}
                  onArchive={(id) => archiverScenario.mutate(id)}
                  onDelete={handleDelete}
                  onViewDetails={handleOpenGenerateur}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ScenarioDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreateEdit}
        scenario={selectedScenario || undefined}
      />

      <GenerateurPrevisions
        open={generateurOpen}
        onOpenChange={setGenerateurOpen}
        scenario={selectedScenario}
        onGenerate={handleGenerate}
        isGenerating={genererPrevisions.isPending}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce scénario ? Cette action est irréversible et
              supprimera également toutes les lignes de prévision associées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Previsions;
