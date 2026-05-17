import { useCallback, useMemo, useState } from 'react';
import { useMatch, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { RecetteStats } from '@/components/recettes/RecetteStats';
import { RecetteTable } from '@/components/recettes/RecetteTable';
import { RecetteForm } from '@/components/recettes/RecetteForm';
import { RecetteDetails } from '@/components/recettes/RecetteDetails';
import { AnnulerRecetteDialog } from '@/components/recettes/AnnulerRecetteDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRecettes } from '@/hooks/useRecettes';
import type { Recette } from '@/types/recette.types';
import { useFocusedEditorGuard } from '@/components/editors/FocusedEditorGuard';

const TresorerieRecettes = () => {
  const navigate = useNavigate();
  const { recetteId } = useParams<{ recetteId: string }>();
  const { recettes, stats, createRecette, updateRecette, annulerRecette } = useRecettes();
  const isCreateRoute = !!useMatch('/app/tresorerie/recettes/create');
  const isEditRoute = !!useMatch('/app/tresorerie/recettes/:recetteId/edit');
  const isDetailRoute = !!useMatch('/app/tresorerie/recettes/:recetteId');
  const selectedRecette = useMemo(
    () => (recetteId ? recettes.find((recette) => recette.id === recetteId) || null : null),
    [recettes, recetteId]
  );
  const [recetteToAnnuler, setRecetteToAnnuler] = useState<Recette | null>(null);
  const [isRecetteDirty, setIsRecetteDirty] = useState(false);
  const handleSingleCancel = useCallback(() => {
    navigate(selectedRecette ? `/app/tresorerie/recettes/${selectedRecette.id}` : '/app/tresorerie/recettes');
  }, [navigate, selectedRecette]);

  const handleSubmit = async (data: import('@/types/recette.types').RecetteFormData) => {
    if (selectedRecette) {
      await updateRecette({ id: selectedRecette.id, updates: data });
      navigate(`/app/tresorerie/recettes/${selectedRecette.id}`);
      return;
    }

    const created = await createRecette(data);
    if (created?.id) {
      navigate(`/app/tresorerie/recettes/${created.id}`);
      return;
    }
    navigate('/app/tresorerie/recettes');
  };

  const { guard } = useFocusedEditorGuard({
    active: isCreateRoute || isEditRoute,
    dirty: isRecetteDirty,
    onExit: handleSingleCancel,
    entityLabel: 'ce formulaire de recette',
    overlayAriaLabel: 'Quitter le formulaire de recette',
  });

  if ((isEditRoute || isDetailRoute) && recetteId && !selectedRecette) {
    return <div className="text-center text-muted-foreground">Chargement de la recette...</div>;
  }

  if (isCreateRoute || isEditRoute) {
    return (
      <div className="space-y-6">
        {guard}
        <PageHeader
          title={selectedRecette ? 'Modifier la recette' : 'Nouvelle recette'}
          description="Enregistrez un encaissement et son compte de destination."
          sticky={false}
          actions={
            <Button variant="outline" onClick={handleSingleCancel}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux recettes
            </Button>
          }
        />
        <RecetteForm
          recette={selectedRecette}
          onSubmit={handleSubmit}
          onCancel={handleSingleCancel}
          onDirtyChange={setIsRecetteDirty}
          submitLabel={selectedRecette ? 'Enregistrer les modifications' : 'Créer la recette'}
        />
      </div>
    );
  }

  if (isDetailRoute && selectedRecette) {
    return (
      <>
        <RecetteDetails
          recette={selectedRecette}
          onClose={() => navigate('/app/tresorerie/recettes')}
          onEdit={() => navigate(`/app/tresorerie/recettes/${selectedRecette.id}/edit`)}
          onAnnuler={() => setRecetteToAnnuler(selectedRecette)}
        />
        <AnnulerRecetteDialog
          open={!!recetteToAnnuler}
          onOpenChange={(open) => !open && setRecetteToAnnuler(null)}
          onConfirm={async (motif) => {
            if (!recetteToAnnuler) return;
            await annulerRecette({ id: recetteToAnnuler.id, motif });
            setRecetteToAnnuler(null);
            navigate('/app/tresorerie/recettes');
          }}
          recetteNumero={recetteToAnnuler?.numero}
        />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recettes"
        description="Encaissements et ressources enregistrés dans la trésorerie"
        sticky={false}
        actions={
          <Button onClick={() => navigate('/app/tresorerie/recettes/create')}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle recette
          </Button>
        }
      />

      <RecetteStats stats={stats} />

      <Card>
        <CardHeader>
          <CardTitle>Liste des recettes</CardTitle>
        </CardHeader>
        <CardContent>
          <RecetteTable
            recettes={recettes}
            onView={(recette) => navigate(`/app/tresorerie/recettes/${recette.id}`)}
            onAnnuler={setRecetteToAnnuler}
          />
        </CardContent>
      </Card>

      <AnnulerRecetteDialog
        open={!!recetteToAnnuler}
        onOpenChange={(open) => !open && setRecetteToAnnuler(null)}
        onConfirm={async (motif) => {
          if (!recetteToAnnuler) return;
          await annulerRecette({ id: recetteToAnnuler.id, motif });
          setRecetteToAnnuler(null);
        }}
        recetteNumero={recetteToAnnuler?.numero}
      />
    </div>
  );
};

export default TresorerieRecettes;
