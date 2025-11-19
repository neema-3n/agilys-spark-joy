import { useState } from 'react';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import { PageHeader } from '@/components/PageHeader';
import { useSections } from '@/hooks/useSections';
import { useProgrammes } from '@/hooks/useProgrammes';
import { useActions } from '@/hooks/useActions';
import { Section, Programme, Action } from '@/types/budget.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, Layers, GitBranch, Zap } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SectionDialog } from '@/components/budget/SectionDialog';
import { ProgrammeDialog } from '@/components/budget/ProgrammeDialog';
import { ActionDialog } from '@/components/budget/ActionDialog';
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

const StructureBudgetaire = () => {
  const { currentClient } = useClient();
  const { currentExercice } = useExercice();
  const { sections, createSection, updateSection, deleteSection, isLoading: loadingSections } = useSections();
  const { programmes, createProgramme, updateProgramme, deleteProgramme, isLoading: loadingProgrammes } = useProgrammes();
  const { actions, createAction, updateAction, deleteAction, isLoading: loadingActions } = useActions();

  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [programmeDialogOpen, setProgrammeDialogOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);

  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [selectedProgramme, setSelectedProgramme] = useState<Programme | null>(null);
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<{ type: 'section' | 'programme' | 'action'; id: string } | null>(null);

  if (!currentClient || !currentExercice) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Veuillez sélectionner un exercice</p>
      </div>
    );
  }

  const handleCreateSection = async (data: Omit<Section, 'id' | 'created_at' | 'updated_at'>) => {
    await createSection(data);
  };

  const handleUpdateSection = async (data: Omit<Section, 'id' | 'created_at' | 'updated_at'>) => {
    if (selectedSection) {
      await updateSection({ id: selectedSection.id, updates: data });
    }
  };

  const handleCreateProgramme = async (data: Omit<Programme, 'id' | 'created_at' | 'updated_at'>) => {
    await createProgramme(data);
  };

  const handleUpdateProgramme = async (data: Omit<Programme, 'id' | 'created_at' | 'updated_at'>) => {
    if (selectedProgramme) {
      await updateProgramme({ id: selectedProgramme.id, updates: data });
    }
  };

  const handleCreateAction = async (data: Omit<Action, 'id' | 'created_at' | 'updated_at'>) => {
    await createAction(data);
  };

  const handleUpdateAction = async (data: Omit<Action, 'id' | 'created_at' | 'updated_at'>) => {
    if (selectedAction) {
      await updateAction({ id: selectedAction.id, updates: data });
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;

    switch (deleteItem.type) {
      case 'section':
        await deleteSection(deleteItem.id);
        break;
      case 'programme':
        await deleteProgramme(deleteItem.id);
        break;
      case 'action':
        await deleteAction(deleteItem.id);
        break;
    }

    setDeleteDialogOpen(false);
    setDeleteItem(null);
  };

  const getSectionProgrammesCount = (sectionId: string) => {
    return programmes.filter(p => p.section_id === sectionId).length;
  };

  const getProgrammeActionsCount = (programmeId: string) => {
    return actions.filter(a => a.programme_id === programmeId).length;
  };

  if (loadingSections || loadingProgrammes || loadingActions) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Structure Budgétaire"
        description="Gestion de la nomenclature budgétaire (Sections > Programmes > Actions)"
      />
      <div className="px-8">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Sections</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sections.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Programmes</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{programmes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Actions</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{actions.length}</div>
          </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="sections" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sections">Sections</TabsTrigger>
          <TabsTrigger value="programmes">Programmes</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="sections" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Sections Budgétaires</CardTitle>
                <Button onClick={() => { setSelectedSection(null); setSectionDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle Section
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Libellé</TableHead>
                    <TableHead>Ordre</TableHead>
                    <TableHead>Programmes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sections.map((section) => (
                    <TableRow key={section.id}>
                      <TableCell className="font-medium">{section.code}</TableCell>
                      <TableCell>{section.libelle}</TableCell>
                      <TableCell>{section.ordre}</TableCell>
                      <TableCell>{getSectionProgrammesCount(section.id)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setSelectedSection(section); setSectionDialogOpen(true); }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setDeleteItem({ type: 'section', id: section.id }); setDeleteDialogOpen(true); }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="programmes" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Programmes</CardTitle>
                <Button onClick={() => { setSelectedProgramme(null); setProgrammeDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau Programme
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Section</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Libellé</TableHead>
                    <TableHead>Ordre</TableHead>
                    <TableHead>Actions</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {programmes.map((programme) => {
                    const section = sections.find(s => s.id === programme.section_id);
                    return (
                      <TableRow key={programme.id}>
                        <TableCell>{section?.code}</TableCell>
                        <TableCell className="font-medium">{programme.code}</TableCell>
                        <TableCell>{programme.libelle}</TableCell>
                        <TableCell>{programme.ordre}</TableCell>
                        <TableCell>{getProgrammeActionsCount(programme.id)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { setSelectedProgramme(programme); setProgrammeDialogOpen(true); }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { setDeleteItem({ type: 'programme', id: programme.id }); setDeleteDialogOpen(true); }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Actions Budgétaires</CardTitle>
                <Button onClick={() => { setSelectedAction(null); setActionDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle Action
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Programme</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Libellé</TableHead>
                    <TableHead>Ordre</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actions.map((action) => {
                    const programme = programmes.find(p => p.id === action.programme_id);
                    return (
                      <TableRow key={action.id}>
                        <TableCell>{programme?.code}</TableCell>
                        <TableCell className="font-medium">{action.code}</TableCell>
                        <TableCell>{action.libelle}</TableCell>
                        <TableCell>{action.ordre}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { setSelectedAction(action); setActionDialogOpen(true); }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { setDeleteItem({ type: 'action', id: action.id }); setDeleteDialogOpen(true); }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>
      </div>

      <SectionDialog
        open={sectionDialogOpen}
        onClose={() => { setSectionDialogOpen(false); setSelectedSection(null); }}
        onSubmit={selectedSection ? handleUpdateSection : handleCreateSection}
        section={selectedSection}
        clientId={currentClient.id}
        exerciceId={currentExercice.id}
      />

      <ProgrammeDialog
        open={programmeDialogOpen}
        onClose={() => { setProgrammeDialogOpen(false); setSelectedProgramme(null); }}
        onSubmit={selectedProgramme ? handleUpdateProgramme : handleCreateProgramme}
        programme={selectedProgramme}
        sections={sections}
        clientId={currentClient.id}
        exerciceId={currentExercice.id}
      />

      <ActionDialog
        open={actionDialogOpen}
        onClose={() => { setActionDialogOpen(false); setSelectedAction(null); }}
        onSubmit={selectedAction ? handleUpdateAction : handleCreateAction}
        action={selectedAction}
        programmes={programmes}
        clientId={currentClient.id}
        exerciceId={currentExercice.id}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible.
              {deleteItem?.type === 'section' && ' Tous les programmes et actions associés seront également supprimés.'}
              {deleteItem?.type === 'programme' && ' Toutes les actions associées seront également supprimées.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StructureBudgetaire;
