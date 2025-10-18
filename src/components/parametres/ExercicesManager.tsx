import { useState } from 'react';
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
import { ExerciceDialog } from './ExerciceDialog';
import { Plus, MoreVertical, Edit, Lock, Trash2 } from 'lucide-react';
import { Exercice } from '@/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function ExercicesManager() {
  const { exercices, isLoading, createExercice, updateExercice, cloturerExercice, deleteExercice } = useExercice();
  const { currentClient } = useClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedExercice, setSelectedExercice] = useState<Exercice | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exerciceToDelete, setExerciceToDelete] = useState<Exercice | null>(null);

  const handleCreate = async (data: any) => {
    if (!currentClient) return;
    await createExercice({
      clientId: currentClient.id,
      annee: data.annee,
      dateDebut: data.dateDebut,
      dateFin: data.dateFin,
      statut: data.statut,
    });
  };

  const handleUpdate = async (data: any) => {
    if (!selectedExercice) return;
    await updateExercice(selectedExercice.id, {
      annee: data.annee,
      dateDebut: data.dateDebut,
      dateFin: data.dateFin,
      statut: data.statut,
    });
    setSelectedExercice(undefined);
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
    setSelectedExercice(exercice);
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setSelectedExercice(undefined);
    setDialogOpen(true);
  };

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
                  <TableHead>Année</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exercices.map((exercice) => (
                  <TableRow key={exercice.id}>
                    <TableCell className="font-medium">{exercice.annee}</TableCell>
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

      <ExerciceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={selectedExercice ? handleUpdate : handleCreate}
        exercice={selectedExercice}
        title={selectedExercice ? 'Modifier l\'exercice' : 'Créer un exercice'}
        description={
          selectedExercice
            ? 'Modifiez les informations de l\'exercice budgétaire'
            : 'Créez un nouvel exercice budgétaire pour votre organisation'
        }
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l'exercice {exerciceToDelete?.annee} ? 
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
