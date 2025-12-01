import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Wallet, FileText, ArrowLeftRight, CheckSquare } from 'lucide-react';
import { useRecettes } from '@/hooks/useRecettes';
import { useOperationsTresorerie } from '@/hooks/useOperationsTresorerie';
import { useComptesTresorerie } from '@/hooks/useComptesTresorerie';
import { RecetteDialog } from '@/components/recettes/RecetteDialog';
import { RecetteTable } from '@/components/recettes/RecetteTable';
import { RecetteStats } from '@/components/recettes/RecetteStats';
import { RecetteSnapshot } from '@/components/recettes/RecetteSnapshot';
import { AnnulerRecetteDialog } from '@/components/recettes/AnnulerRecetteDialog';
import { CompteTresorerieDialog } from '@/components/tresorerie/CompteTresorerieDialog';
import { CompteTresorerieTable } from '@/components/tresorerie/CompteTresorerieTable';
import { OperationTresorerieDialog } from '@/components/tresorerie/OperationTresorerieDialog';
import { OperationTresorerieTable } from '@/components/tresorerie/OperationTresorerieTable';
import type { Recette } from '@/types/recette.types';
import type { CompteTresorerie } from '@/types/compte-tresorerie.types';

const Tresorerie = () => {
  const [activeTab, setActiveTab] = useState('comptes');
  
  // Recettes
  const { recettes, stats: recetteStats, isLoading: loadingRecettes, createRecette, annulerRecette } = useRecettes();
  const [recetteDialogOpen, setRecetteDialogOpen] = useState(false);
  const [selectedRecette, setSelectedRecette] = useState<Recette | null>(null);
  const [recetteToAnnuler, setRecetteToAnnuler] = useState<Recette | null>(null);
  
  // Opérations
  const { operations, isLoading: loadingOperations, createOperation } = useOperationsTresorerie();
  const [operationDialogOpen, setOperationDialogOpen] = useState(false);
  
  // Comptes
  const { comptes, isLoading: loadingComptes, createCompte } = useComptesTresorerie();
  const [compteDialogOpen, setCompteDialogOpen] = useState(false);
  const [compteToEdit, setCompteToEdit] = useState<CompteTresorerie | null>(null);

  const handleViewRecette = (recette: Recette) => {
    setSelectedRecette(recette);
  };

  const handleAnnulerRecette = (recette: Recette) => {
    setRecetteToAnnuler(recette);
  };

  const handleConfirmAnnulation = async (motif: string) => {
    if (!recetteToAnnuler) return;
    await annulerRecette({ id: recetteToAnnuler.id, motif });
    setRecetteToAnnuler(null);
    setSelectedRecette(null);
  };

  const isLoading = loadingRecettes || loadingOperations || loadingComptes;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Gestion de Trésorerie"
          description="Suivi des comptes, recettes, opérations et rapprochements bancaires"
        />
        <div className="px-8 flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion de Trésorerie"
        description="Suivi des comptes, recettes, opérations et rapprochements bancaires"
      />
      
      <div className="px-8 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="comptes">
              <Wallet className="h-4 w-4 mr-2" />
              Comptes
            </TabsTrigger>
            <TabsTrigger value="recettes">
              <FileText className="h-4 w-4 mr-2" />
              Recettes
            </TabsTrigger>
            <TabsTrigger value="operations">
              <ArrowLeftRight className="h-4 w-4 mr-2" />
              Opérations
            </TabsTrigger>
            <TabsTrigger value="rapprochement">
              <CheckSquare className="h-4 w-4 mr-2" />
              Rapprochement
            </TabsTrigger>
          </TabsList>

          <TabsContent value="comptes" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setCompteDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau Compte
              </Button>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Comptes de Trésorerie</CardTitle>
              </CardHeader>
              <CardContent>
                <CompteTresorerieTable
                  comptes={comptes}
                  onEdit={(compte) => {
                    setCompteToEdit(compte);
                    setCompteDialogOpen(true);
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recettes" className="space-y-4">
            <RecetteStats stats={recetteStats} />
            
            <div className="flex justify-end">
              <Button onClick={() => setRecetteDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle Recette
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Liste des Recettes</CardTitle>
              </CardHeader>
              <CardContent>
                <RecetteTable
                  recettes={recettes}
                  onView={handleViewRecette}
                  onAnnuler={handleAnnulerRecette}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="operations" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setOperationDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle Opération
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Journal des Opérations</CardTitle>
              </CardHeader>
              <CardContent>
                <OperationTresorerieTable operations={operations} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rapprochement" className="space-y-4">
            <Card>
              <CardContent className="py-12">
                <div className="text-center space-y-4">
                  <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Fonctionnalité de rapprochement bancaire à venir...
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <CompteTresorerieDialog
        open={compteDialogOpen}
        onOpenChange={(open) => {
          setCompteDialogOpen(open);
          if (!open) setCompteToEdit(null);
        }}
        onSubmit={async (data) => {
          await createCompte(data);
        }}
        initialData={compteToEdit || undefined}
        title={compteToEdit ? 'Modifier le compte' : 'Nouveau Compte de Trésorerie'}
      />

      <RecetteDialog
        open={recetteDialogOpen}
        onOpenChange={setRecetteDialogOpen}
        onSubmit={async (data) => {
          await createRecette(data);
        }}
      />

      <RecetteSnapshot
        recette={selectedRecette}
        open={!!selectedRecette}
        onOpenChange={(open) => !open && setSelectedRecette(null)}
        onAnnuler={handleAnnulerRecette}
      />

      <AnnulerRecetteDialog
        open={!!recetteToAnnuler}
        onOpenChange={(open) => !open && setRecetteToAnnuler(null)}
        onConfirm={handleConfirmAnnulation}
        recetteNumero={recetteToAnnuler?.numero}
      />

      <OperationTresorerieDialog
        open={operationDialogOpen}
        onOpenChange={setOperationDialogOpen}
        onSubmit={async (data) => {
          await createOperation(data);
        }}
      />
    </div>
  );
};

export default Tresorerie;
