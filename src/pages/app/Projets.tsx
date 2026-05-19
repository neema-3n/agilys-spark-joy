import { useCallback, useMemo, useState } from 'react';
import { useMatch, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
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
import { ArrowLeft, Plus } from 'lucide-react';
import { useProjets } from '@/hooks/useProjets';
import { projetsService } from '@/services/api/projets.service';
import { ProjetForm } from '@/components/projets/ProjetForm';
import { ProjetCard } from '@/components/projets/ProjetCard';
import { ProjetsTable } from '@/components/projets/ProjetsTable';
import { ProjetStats } from '@/components/projets/ProjetStats';
import { ProjetSnapshot } from '@/components/projets/ProjetSnapshot';
import { Projet } from '@/types/projet.types';
import { useToast } from '@/hooks/use-toast';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useFocusedEditorGuard } from '@/components/editors/FocusedEditorGuard';

const Projets = () => {
  const { toast } = useToast();
  const { currentClient } = useClient();
  const { currentExercice } = useExercice();
  const { hasAnyRole } = useAuth();
  const navigate = useNavigate();
  const { projetId } = useParams<{ projetId: string }>();
  const { projets, isLoading, refetch } = useProjets();
  const isCreateRoute = !!useMatch('/app/projets/create');
  const isEditRoute = !!useMatch('/app/projets/:projetId/edit');
  const isDetailRoute = !!useMatch('/app/projets/:projetId');

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projetToDelete, setProjetToDelete] = useState<Projet | null>(null);
  const [isProjetDirty, setIsProjetDirty] = useState(false);
  const selectedProjet = useMemo(
    () => (projetId ? projets.find((projet) => projet.id === projetId) || null : null),
    [projets, projetId]
  );

  const canEdit = hasAnyRole(['super_admin', 'admin_client', 'directeur_financier', 'chef_service']);
  const handleSingleCancel = useCallback(() => {
    navigate(selectedProjet ? `/app/projets/${selectedProjet.id}` : '/app/projets');
  }, [navigate, selectedProjet]);

  const handleCreate = () => {
    navigate('/app/projets/create');
  };

  const { guard } = useFocusedEditorGuard({
    active: isCreateRoute || isEditRoute,
    dirty: isProjetDirty,
    onExit: handleSingleCancel,
    entityLabel: 'ce formulaire de projet',
    overlayAriaLabel: 'Quitter le formulaire de projet',
  });

  const handleEdit = (projet: Projet) => {
    navigate(`/app/projets/${projet.id}/edit`);
  };

  const handleDeleteClick = (projet: Projet) => {
    setProjetToDelete(projet);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (data: any) => {
    try {
      if (selectedProjet) {
        const projet = await projetsService.update(selectedProjet.id, data);
        toast({
          title: 'Succès',
          description: 'Projet modifié avec succès',
        });
        navigate(`/app/projets/${projet.id}`);
      } else {
        const projet = await projetsService.create({
          ...data,
          clientId: currentClient!.id,
          exerciceId: currentExercice!.id,
        });
        toast({
          title: 'Succès',
          description: 'Projet créé avec succès',
        });
        navigate(`/app/projets/${projet.id}`);
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
      <div>
        <div className="text-center text-muted-foreground">
          Chargement des projets...
        </div>
      </div>
    );
  }

  if ((isEditRoute || isDetailRoute) && projetId && !selectedProjet) {
    return <div className="text-center text-muted-foreground">Chargement du projet...</div>;
  }

  if (isCreateRoute || isEditRoute) {
    return (
      <div className="space-y-6">
        {guard}
        <PageHeader
          title={selectedProjet ? 'Modifier le projet' : 'Nouveau projet'}
          description="Structurez le suivi budgétaire et analytique du projet."
          actions={
            <Button variant="outline" onClick={handleSingleCancel}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux projets
            </Button>
          }
        />
        <ProjetForm
          projet={selectedProjet}
          onSubmit={handleSubmit}
          onCancel={handleSingleCancel}
          onDirtyChange={setIsProjetDirty}
        />
      </div>
    );
  }

  if (isDetailRoute && selectedProjet) {
    return (
      <ProjetSnapshot
        projet={selectedProjet}
        onClose={() => navigate('/app/projets')}
        onEdit={canEdit ? () => handleEdit(selectedProjet) : undefined}
        onDelete={canEdit ? () => handleDeleteClick(selectedProjet) : undefined}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projets & Analytique"
        description="Suivi financier multi-projet avec axe analytique"
        actions={
          canEdit ? (
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau projet
            </Button>
          ) : undefined
        }
      />
      <div>

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
              onView={(id) => navigate(`/app/projets/${id}`)}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
              canEdit={canEdit}
            />
          </div>
        </TabsContent>

        <TabsContent value="table">
          <ProjetsTable
            projets={projets}
            onView={(id) => navigate(`/app/projets/${id}`)}
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
                  onView={(id) => navigate(`/app/projets/${id}`)}
                  onEdit={handleEdit}
                  onDelete={handleDeleteClick}
                  canEdit={canEdit}
                />
              ))}
            </div>
          )}
        </TabsContent>
        </Tabs>
      </div>

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
