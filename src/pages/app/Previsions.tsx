import { useMemo, useState } from 'react';
import { useMatch, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus } from 'lucide-react';
import { usePrevisions } from '@/hooks/usePrevisions';
import { ScenarioForm } from '@/components/previsions/ScenarioForm';
import { ScenarioCard } from '@/components/previsions/ScenarioCard';
import { GenerateurPrevisions } from '@/components/previsions/GenerateurPrevisions';
import { Scenario } from '@/types/prevision.types';
import { useFocusedEditorGuard } from '@/components/editors/FocusedEditorGuard';
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
  const [generateurOpen, setGenerateurOpen] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scenarioToDelete, setScenarioToDelete] = useState<string | null>(null);
  const [isScenarioDirty, setIsScenarioDirty] = useState(false);
  const navigate = useNavigate();
  const { scenarioId } = useParams<{ scenarioId?: string }>();
  const isCreateRoute = !!useMatch('/app/previsions/create');
  const isEditRoute = !!useMatch('/app/previsions/:scenarioId/edit');

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

  const editingScenario = useMemo(
    () => (isEditRoute && scenarioId ? scenarios?.find((scenario) => scenario.id === scenarioId) || null : null),
    [isEditRoute, scenarioId, scenarios]
  );

  const handleCreateEdit = async (data: any) => {
    if (editingScenario) {
      await updateScenario.mutateAsync({ id: editingScenario.id, updates: data });
    } else {
      await createScenario.mutateAsync(data);
    }
  };

  const handleEdit = (scenario: Scenario) => {
    navigate(`/app/previsions/${scenario.id}/edit`);
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
  const handleSingleCancel = () => {
    navigate('/app/previsions');
  };

  const { guard } = useFocusedEditorGuard({
    active: isCreateRoute || isEditRoute,
    dirty: isScenarioDirty,
    onExit: handleSingleCancel,
    entityLabel: 'ce formulaire de scénario',
    overlayAriaLabel: 'Quitter le formulaire de scénario',
  });

  if ((isCreateRoute || isEditRoute) && isEditRoute && scenarioId && !editingScenario) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Prévisions Budgétaires"
          description="Projections pluriannuelles et scénarios budgétaires"
          sticky={false}
        />
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Chargement du scénario...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isCreateRoute || isEditRoute) {
    return (
      <div className="space-y-6">
        {guard}
        <PageHeader
          title={editingScenario ? 'Modifier le scénario' : 'Nouveau scénario'}
          description="Gérez un scénario budgétaire dans un espace de travail dédié."
          sticky={false}
          actions={
            <Button variant="outline" onClick={handleSingleCancel}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux prévisions
            </Button>
          }
        />

        <ScenarioForm
          scenario={editingScenario}
          onSubmit={async (data) => {
            await handleCreateEdit(data);
            navigate('/app/previsions');
          }}
          onCancel={handleSingleCancel}
          onDirtyChange={setIsScenarioDirty}
          submitLabel={editingScenario ? 'Enregistrer les modifications' : 'Créer le scénario'}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prévisions Budgétaires"
        description="Projections pluriannuelles et scénarios budgétaires"
        actions={
          <Button
            onClick={() => {
              navigate('/app/previsions/create');
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouveau scénario
          </Button>
        }
      />
      <div>

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
      </div>

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
