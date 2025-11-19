import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus } from 'lucide-react';
import { useFournisseurs } from '@/hooks/useFournisseurs';
import { FournisseurDialog } from '@/components/fournisseurs/FournisseurDialog';
import { FournisseurTable } from '@/components/fournisseurs/FournisseurTable';
import { FournisseurStats } from '@/components/fournisseurs/FournisseurStats';
import { Fournisseur } from '@/types/fournisseur.types';

const Fournisseurs = () => {
  const { fournisseurs, stats, isLoading, create, update, delete: deleteFournisseur } = useFournisseurs();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFournisseur, setSelectedFournisseur] = useState<Fournisseur | undefined>();

  const handleCreate = async (data: any) => {
    await create(data);
  };

  const handleEdit = (fournisseur: Fournisseur) => {
    setSelectedFournisseur(fournisseur);
    setDialogOpen(true);
  };

  const handleUpdate = async (data: any) => {
    if (selectedFournisseur) {
      await update({ id: selectedFournisseur.id, input: data });
    }
  };

  const handleDelete = async (id: string) => {
    await deleteFournisseur(id);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedFournisseur(undefined);
    }
  };

  const fournisseursActifs = fournisseurs.filter(f => f.statut === 'actif');
  const fournisseursInactifs = fournisseurs.filter(f => f.statut === 'inactif');

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des Fournisseurs"
        description="Référentiel fournisseurs et suivi des contrats"
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau fournisseur
          </Button>
        }
      />
      <div className="px-8">

      <Tabs defaultValue="vue-ensemble" className="space-y-6">
        <TabsList>
          <TabsTrigger value="vue-ensemble">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="tous">Tous</TabsTrigger>
          <TabsTrigger value="actifs">Actifs</TabsTrigger>
          <TabsTrigger value="inactifs">Inactifs</TabsTrigger>
        </TabsList>

        <TabsContent value="vue-ensemble" className="space-y-6">
          <FournisseurStats stats={stats} />

          {stats && stats.topFournisseurs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top 5 Fournisseurs par montant engagé</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.topFournisseurs.map((f, index) => (
                    <div key={f.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{f.nom}</div>
                          <div className="text-sm text-muted-foreground">
                            {f.nombreEngagements} engagement{f.nombreEngagements > 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">
                          {new Intl.NumberFormat('fr-FR', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(f.montantTotal)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tous">
          <FournisseurTable
            fournisseurs={fournisseurs}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="actifs">
          <FournisseurTable
            fournisseurs={fournisseursActifs}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </TabsContent>

        <TabsContent value="inactifs">
          <FournisseurTable
            fournisseurs={fournisseursInactifs}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </TabsContent>
      </Tabs>

      </div>

      <FournisseurDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        onSubmit={selectedFournisseur ? handleUpdate : handleCreate}
        fournisseur={selectedFournisseur}
      />
    </div>
  );
};

export default Fournisseurs;
