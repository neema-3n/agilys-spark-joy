import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { RecetteStats } from '@/components/recettes/RecetteStats';
import { RecetteTable } from '@/components/recettes/RecetteTable';
import { RecetteDialog } from '@/components/recettes/RecetteDialog';
import { RecetteSnapshot } from '@/components/recettes/RecetteSnapshot';
import { AnnulerRecetteDialog } from '@/components/recettes/AnnulerRecetteDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRecettes } from '@/hooks/useRecettes';
import type { Recette } from '@/types/recette.types';

const TresorerieRecettes = () => {
  const { recettes, stats, createRecette, annulerRecette } = useRecettes();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRecette, setSelectedRecette] = useState<Recette | null>(null);
  const [recetteToAnnuler, setRecetteToAnnuler] = useState<Recette | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recettes"
        description="Encaissements et ressources enregistrés dans la trésorerie"
        sticky={false}
        actions={
          <Button onClick={() => setDialogOpen(true)}>
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
            onView={setSelectedRecette}
            onAnnuler={setRecetteToAnnuler}
          />
        </CardContent>
      </Card>

      <RecetteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={async (data) => {
          await createRecette(data);
        }}
      />

      <RecetteSnapshot
        recette={selectedRecette}
        open={!!selectedRecette}
        onOpenChange={(open) => !open && setSelectedRecette(null)}
        onAnnuler={setRecetteToAnnuler}
      />

      <AnnulerRecetteDialog
        open={!!recetteToAnnuler}
        onOpenChange={(open) => !open && setRecetteToAnnuler(null)}
        onConfirm={async (motif) => {
          if (!recetteToAnnuler) return;
          await annulerRecette({ id: recetteToAnnuler.id, motif });
          setRecetteToAnnuler(null);
          setSelectedRecette(null);
        }}
        recetteNumero={recetteToAnnuler?.numero}
      />
    </div>
  );
};

export default TresorerieRecettes;
