import { useMemo, useState } from 'react';
import { useMatch, useNavigate, useParams } from 'react-router-dom';
import { useExercice } from '@/contexts/ExerciceContext';
import { useClient } from '@/contexts/ClientContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreVertical, Edit, Lock, Trash2 } from 'lucide-react';
import { Exercice } from '@/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ExerciceForm, ExerciceFormValues } from './ExerciceForm';
import { ParametreEditorPage } from './ParametreEditorPage';

export function ExercicesManager() {
  const { exercices, isLoading, createExercice, updateExercice, cloturerExercice, deleteExercice } = useExercice();
  const { currentClient } = useClient();
  const navigate = useNavigate();
  const { itemId } = useParams<{ itemId?: string }>();
  const isCreateRoute = !!useMatch('/app/parametres/exercices/create');
  const isEditRoute = !!useMatch('/app/parametres/exercices/:itemId/edit');
  const isEditorMode = isCreateRoute || isEditRoute;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exerciceToDelete, setExerciceToDelete] = useState<Exercice | null>(null);
  const [isExerciceDirty, setIsExerciceDirty] = useState(false);
  const selectedExercice = useMemo(
    () => (isEditRoute ? exercices.find((exercice) => exercice.id === itemId) : undefined),
    [exercices, isEditRoute, itemId]
  );

  const handleSave = async (data: ExerciceFormValues) => {
    if (!currentClient) return;

    if (selectedExercice) {
      await updateExercice(selectedExercice.id, {
        libelle: data.libelle,
        code: data.code || undefined,
        dateDebut: data.dateDebut,
        dateFin: data.dateFin,
        statut: data.statut,
      });
    } else {
      await createExercice({
        clientId: currentClient.id,
        libelle: data.libelle,
        code: data.code || undefined,
        dateDebut: data.dateDebut,
        dateFin: data.dateFin,
        statut: data.statut,
      });
    }

    navigate('/app/parametres/exercices');
  };

  const handleCloturer = async (exercice: Exercice) => {
    await cloturerExercice(exercice.id);
  };

  const handleDelete = async () => {
    if (!exerciceToDelete) return;
    await deleteExercice(exerciceToDelete.id);
    setDeleteDialogOpen(false);
    setExerciceToDelete(null);
  };

  const openEditDialog = (exercice: Exercice) => {
    navigate(`/app/parametres/exercices/${exercice.id}/edit`);
  };

  const openCreateDialog = () => {
    navigate('/app/parametres/exercices/create');
  };

  const handleEditorCancel = () => {
    navigate('/app/parametres/exercices');
  };

  if (isEditorMode) {
    return (
      <ParametreEditorPage
        title={selectedExercice ? `Modifier ${selectedExercice.libelle}` : 'Nouvel exercice'}
        description="Gérez un exercice budgétaire dans un espace de travail dédié."
        backLabel="Retour aux exercices"
        onBack={handleEditorCancel}
        dirty={isExerciceDirty}
        entityLabel="ce formulaire d'exercice"
      >
        {isEditRoute && !selectedExercice ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Cet exercice est introuvable.
          </div>
        ) : (
          <ExerciceForm
            exercice={selectedExercice}
            onSubmit={handleSave}
            onCancel={handleEditorCancel}
            onDirtyChange={setIsExerciceDirty}
          />
        )}
      </ParametreEditorPage>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Exercices Budgétaires</CardTitle>
              <CardDescription>
                Gérez les exercices budgétaires de votre organisation
              </CardDescription>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvel exercice
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Chargement des exercices...
            </div>
          ) : exercices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun exercice défini. Créez votre premier exercice budgétaire.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
              <TableHead>Libellé / Code</TableHead>
              <TableHead>Période</TableHead>
              <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
            {exercices.map((exercice) => (
              <TableRow key={exercice.id}>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span>{exercice.libelle}</span>
                    {exercice.code && (
                      <span className="text-sm text-muted-foreground">{exercice.code}</span>
                    )}
                  </div>
                </TableCell>
                    <TableCell>
                      {format(new Date(exercice.dateDebut), 'dd MMMM yyyy', { locale: fr })}
                      {' - '}
                      {format(new Date(exercice.dateFin), 'dd MMMM yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={exercice.statut === 'ouvert' ? 'default' : 'secondary'}>
                        {exercice.statut === 'ouvert' ? 'Ouvert' : 'Clôturé'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(exercice)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Modifier
                          </DropdownMenuItem>
                          {exercice.statut === 'ouvert' && (
                            <DropdownMenuItem onClick={() => handleCloturer(exercice)}>
                              <Lock className="mr-2 h-4 w-4" />
                              Clôturer
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => {
                              setExerciceToDelete(exercice);
                              setDeleteDialogOpen(true);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l'exercice "{exerciceToDelete?.libelle}" ? 
              Cette action est irréversible et supprimera toutes les données associées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
