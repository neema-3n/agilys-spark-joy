import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus } from 'lucide-react';
import { useEcartsPrevisionExecution, usePrevisions } from '@/hooks/usePrevisions';
import { ScenarioDialog } from '@/components/previsions/ScenarioDialog';
import { ScenarioCard } from '@/components/previsions/ScenarioCard';
import { GenerateurPrevisions } from '@/components/previsions/GenerateurPrevisions';
import { EcartsPrevisionTable } from '@/components/previsions/EcartsPrevisionTable';
import { EcartsPrevisionFilters, GenerationParams, Scenario } from '@/types/prevision.types';
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
  const [pendingFilters, setPendingFilters] = useState<Omit<EcartsPrevisionFilters, 'exerciceId'>>({});
  const [appliedFilters, setAppliedFilters] = useState<Omit<EcartsPrevisionFilters, 'exerciceId'>>({});

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
  const { ecarts, totaux, isLoading: loadingEcarts, error: errorEcarts } = useEcartsPrevisionExecution(appliedFilters);

  type ScenarioSubmitPayload = Omit<Scenario, 'id' | 'createdAt' | 'updatedAt'>;

  const handleCreateEdit = (data: ScenarioSubmitPayload) => {
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

  const handleGenerate = (params: GenerationParams) => {
    genererPrevisions.mutate(params, {
      onSuccess: () => {
        setGenerateurOpen(false);
        setSelectedScenario(null);
      },
    });
  };

  const updatePendingFilter = (key: keyof Omit<EcartsPrevisionFilters, 'exerciceId'>, rawValue: string) => {
    setPendingFilters((current) => {
      const next = { ...current };
      const value = rawValue.trim();
      if (value.length === 0) {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  };

  const applyFilters = () => {
    setAppliedFilters({ ...pendingFilters });
  };

  const scenariosBrouillon = scenarios?.filter(s => s.statut === 'brouillon') || [];
  const scenariosValides = scenarios?.filter(s => s.statut === 'valide') || [];
  const scenariosArchives = scenarios?.filter(s => s.statut === 'archive') || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prévisions Budgétaires"
        description="Projections pluriannuelles et scénarios budgétaires"
        actions={
          <Button
            onClick={() => {
              setSelectedScenario(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouveau scénario
          </Button>
        }
      />
      <div className="px-8">

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

        <div className="mt-8 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Filtres des écarts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-6">
                <div className="space-y-2">
                  <Label htmlFor="ecarts-periode">Période</Label>
                  <Input
                    id="ecarts-periode"
                    placeholder="AAAA"
                    value={pendingFilters.periode ?? ''}
                    onChange={(event) => updatePendingFilter('periode', event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ecarts-section">Section</Label>
                  <Input
                    id="ecarts-section"
                    placeholder="SEC-..."
                    value={pendingFilters.sectionCode ?? ''}
                    onChange={(event) => updatePendingFilter('sectionCode', event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ecarts-programme">Programme</Label>
                  <Input
                    id="ecarts-programme"
                    placeholder="PRG-..."
                    value={pendingFilters.programmeCode ?? ''}
                    onChange={(event) => updatePendingFilter('programmeCode', event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ecarts-action">Action</Label>
                  <Input
                    id="ecarts-action"
                    placeholder="ACT-..."
                    value={pendingFilters.actionCode ?? ''}
                    onChange={(event) => updatePendingFilter('actionCode', event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ecarts-enveloppe">Enveloppe</Label>
                  <Input
                    id="ecarts-enveloppe"
                    placeholder="UUID enveloppe"
                    value={pendingFilters.enveloppeId ?? ''}
                    onChange={(event) => updatePendingFilter('enveloppeId', event.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={applyFilters} className="w-full">
                    Appliquer les filtres
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Montant prévu total</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(
                totaux?.montantPrevu ?? 0
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Montant exécuté total</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(
                totaux?.montantExecute ?? 0
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Écart global</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(
                totaux?.ecartMontant ?? 0
              )}
            </CardContent>
          </Card>
          </div>
        </div>

        <div className="mt-6">
          <EcartsPrevisionTable
            ecarts={ecarts}
            isLoading={loadingEcarts}
            errorMessage={errorEcarts?.message}
          />
        </div>
      </div>

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
