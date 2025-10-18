import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Building2, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import { Structure } from '@/types/structure.types';
import { structuresService } from '@/services/api/structures.service';
import { StructureDialog } from './StructureDialog';
import { useToast } from '@/hooks/use-toast';

const StructureManager = () => {
  const { currentClient } = useClient();
  const { currentExercice } = useExercice();
  const { toast } = useToast();
  const [structures, setStructures] = useState<Structure[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStructure, setSelectedStructure] = useState<Structure | undefined>();
  const [structureToDelete, setStructureToDelete] = useState<Structure | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStructures();
  }, [currentClient, currentExercice]);

  const loadStructures = async () => {
    if (!currentClient) return;

    try {
      setIsLoading(true);
      const data = await structuresService.getAll(
        currentClient.id,
        currentExercice?.id
      );
      setStructures(data);
    } catch (error) {
      console.error('Erreur lors du chargement des structures:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les structures',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (data: any) => {
    if (!currentClient) return;

    try {
      await structuresService.create({
        ...data,
        clientId: currentClient.id,
        exerciceId: currentExercice?.id
      });
      
      toast({
        title: 'Succès',
        description: 'Structure créée avec succès'
      });
      
      setDialogOpen(false);
      await loadStructures();
    } catch (error) {
      console.error('Erreur lors de la création:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de créer la structure',
        variant: 'destructive'
      });
    }
  };

  const handleUpdate = async (data: any) => {
    if (!selectedStructure) return;

    try {
      await structuresService.update(selectedStructure.id, data);
      
      toast({
        title: 'Succès',
        description: 'Structure mise à jour avec succès'
      });
      
      setDialogOpen(false);
      setSelectedStructure(undefined);
      await loadStructures();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour la structure',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async () => {
    if (!structureToDelete) return;

    try {
      await structuresService.delete(structureToDelete.id);
      
      toast({
        title: 'Succès',
        description: 'Structure supprimée avec succès'
      });
      
      setDeleteDialogOpen(false);
      setStructureToDelete(null);
      await loadStructures();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la structure',
        variant: 'destructive'
      });
    }
  };

  const openEditDialog = (structure: Structure) => {
    setSelectedStructure(structure);
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setSelectedStructure(undefined);
    setDialogOpen(true);
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      entite: 'Entité',
      direction: 'Direction',
      service: 'Service',
      centre_cout: 'Centre de coût'
    };
    return labels[type] || type;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Structure Organisationnelle
              </CardTitle>
              <CardDescription>
                Gérez les entités, services et centres de coûts
              </CardDescription>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle structure
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Chargement...
            </div>
          ) : structures.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Aucune structure enregistrée</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {structures.map((structure) => (
                  <TableRow key={structure.id}>
                    <TableCell className="font-mono">{structure.code}</TableCell>
                    <TableCell className="font-medium">{structure.nom}</TableCell>
                    <TableCell>{getTypeLabel(structure.type)}</TableCell>
                    <TableCell>{structure.responsable || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={structure.statut === 'actif' ? 'default' : 'secondary'}>
                        {structure.statut === 'actif' ? 'Actif' : 'Inactif'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(structure)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setStructureToDelete(structure);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
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

      <StructureDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={selectedStructure ? handleUpdate : handleCreate}
        structure={selectedStructure}
        structures={structures}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la structure "{structureToDelete?.nom}" ?
              Cette action est irréversible.
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
};

export { StructureManager };
