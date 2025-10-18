import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Plus } from 'lucide-react';
import { useProjets } from '@/hooks/useProjets';
import { projetsService } from '@/services/api/projets.service';
import { ProjetDialog } from '@/components/projets/ProjetDialog';
import { ProjetCard } from '@/components/projets/ProjetCard';
import { ProjetsTable } from '@/components/projets/ProjetsTable';
import { ProjetStats } from '@/components/projets/ProjetStats';
import { Projet } from '@/types/projet.types';
import { useToast } from '@/hooks/use-toast';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import { useAuth } from '@/contexts/AuthContext';

const Projets = () => {
  const { toast } = useToast();
  const { currentClient } = useClient();
  const { currentExercice } = useExercice();
  const { hasAnyRole } = useAuth();
  const { projets, isLoading, refetch } = useProjets();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProjet, setSelectedProjet] = useState<Projet | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projetToDelete, setProjetToDelete] = useState<Projet | null>(null);

  const canEdit = hasAnyRole(['super_admin', 'admin_client', 'directeur_financier', 'chef_service']);

  const handleCreate = () => {
    setSelectedProjet(null);
    setDialogOpen(true);
  };

  const handleEdit = (projet: Projet) => {
    setSelectedProjet(projet);
    setDialogOpen(true);
  };

  const handleDeleteClick = (projet: Projet) => {
    setProjetToDelete(projet);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (data: any) => {
    try {
      if (selectedProjet) {
        await projetsService.update(selectedProjet.id, data);
        toast({
          title: 'Succès',
          description: 'Projet modifié avec succès',
        });
      } else {
        await projetsService.create({
          ...data,
          clientId: currentClient!.id,
          exerciceId: currentExercice!.id,
        });
        toast({
          title: 'Succès',
          description: 'Projet créé avec succès',
        });
      }
      refetch();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue',
        variant: 'destructive',
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!projetToDelete) return;

    try {
      await projetsService.delete(projetToDelete.id);
      toast({
        title: 'Succès',
        description: 'Projet supprimé avec succès',
      });
      refetch();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer ce projet',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setProjetToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-center text-muted-foreground">
          Chargement des projets...
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Projets & Analytique</h1>
          <p className="text-muted-foreground">
            Suivi financier multi-projet avec axe analytique
          </p>
        </div>
        {canEdit && (
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau projet
          </Button>
        )}
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="table">Gestion des projets</TabsTrigger>
          <TabsTrigger value="cards">Vue en cartes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <ProjetStats />
          <div className="rounded-lg border p-4">
            <h2 className="text-xl font-semibold mb-4">Liste des projets</h2>
            <ProjetsTable
              projets={projets}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
              canEdit={canEdit}
            />
          </div>
        </TabsContent>

        <TabsContent value="table">
          <ProjetsTable
            projets={projets}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            canEdit={canEdit}
          />
        </TabsContent>

        <TabsContent value="cards">
          {projets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Aucun projet disponible</p>
              {canEdit && (
                <Button onClick={handleCreate} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Créer le premier projet
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {projets.map((projet) => (
                <ProjetCard
                  key={projet.id}
                  projet={projet}
                  onEdit={handleEdit}
                  onDelete={handleDeleteClick}
                  canEdit={canEdit}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ProjetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projet={selectedProjet}
        onSubmit={handleSubmit}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le projet "{projetToDelete?.nom}" ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Projets;
