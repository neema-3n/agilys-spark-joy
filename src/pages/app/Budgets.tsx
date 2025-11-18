import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useExercice } from '@/contexts/ExerciceContext';
import { useClient } from '@/contexts/ClientContext';
import { useAuth } from '@/contexts/AuthContext';
import { budgetService } from '@/services/api/budget.service';
import { useSections } from '@/hooks/useSections';
import { useProgrammes } from '@/hooks/useProgrammes';
import { useActions } from '@/hooks/useActions';
import { useComptes } from '@/hooks/useComptes';
import { useEnveloppes } from '@/hooks/useEnveloppes';
import { useReservations } from '@/hooks/useReservations';
import { LigneBudgetaire, ModificationBudgetaire } from '@/types/budget.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, FileEdit, CheckCircle, XCircle, Clock, Send, ArrowDown } from 'lucide-react';
import { BudgetTable } from '@/components/budget/BudgetTable';
import { LigneBudgetaireDialog } from '@/components/budget/LigneBudgetaireDialog';
import { ModificationBudgetaireDialog } from '@/components/budget/ModificationBudgetaireDialog';
import { ReservationDialog } from '@/components/reservations/ReservationDialog';
import { useToast } from '@/hooks/use-toast';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const Budgets = () => {
  const { currentExercice } = useExercice();
  const { currentClient } = useClient();
  const { user } = useAuth();
  const { toast } = useToast();

  const { sections, isLoading: loadingSections } = useSections();
  const { programmes, isLoading: loadingProgrammes } = useProgrammes();
  const { actions, isLoading: loadingActions } = useActions();
  const { comptes, isLoading: loadingComptes } = useComptes();
  const { enveloppes, isLoading: loadingEnveloppes } = useEnveloppes();
  const { createReservation } = useReservations();

  const [lignes, setLignes] = useState<LigneBudgetaire[]>([]);
  const [modifications, setModifications] = useState<ModificationBudgetaire[]>([]);
  const [loading, setLoading] = useState(true);

  const [ligneDialogOpen, setLigneDialogOpen] = useState(false);
  const [modificationDialogOpen, setModificationDialogOpen] = useState(false);
  const [selectedLigne, setSelectedLigne] = useState<LigneBudgetaire | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reservationDialogOpen, setReservationDialogOpen] = useState(false);
  const [ligneForReservation, setLigneForReservation] = useState<LigneBudgetaire | null>(null);
  const [ligneToDelete, setLigneToDelete] = useState<string | null>(null);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'lignes';
  
  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  useEffect(() => {
    loadData();
  }, [currentExercice, currentClient]);

  const loadData = async () => {
    if (!currentExercice || !currentClient) return;

    setLoading(true);
    try {
      const [lignesData, modificationsData] = 
        await Promise.all([
          budgetService.getLignesBudgetaires(currentExercice.id, currentClient.id),
          budgetService.getModifications(currentExercice.id, currentClient.id),
        ]);

      setLignes(lignesData);
      setModifications(modificationsData);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données budgétaires',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLigne = async (data: Partial<LigneBudgetaire>) => {
    if (!currentClient || !user) return;
    
    try {
      await budgetService.createLigneBudgetaire(data as any, currentClient.id, user.id);
      toast({
        title: 'Succès',
        description: 'Ligne budgétaire créée avec succès',
      });
      loadData();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer la ligne budgétaire',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateLigne = async (data: Partial<LigneBudgetaire>) => {
    if (!data.id) return;
    
    try {
      await budgetService.updateLigneBudgetaire(data.id, data);
      toast({
        title: 'Succès',
        description: 'Ligne budgétaire modifiée avec succès',
      });
      setSelectedLigne(null);
      loadData();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier la ligne budgétaire',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteLigne = async () => {
    if (!ligneToDelete) return;

    try {
      await budgetService.deleteLigneBudgetaire(ligneToDelete);
      toast({
        title: 'Succès',
        description: 'Ligne budgétaire supprimée avec succès',
      });
      setLigneToDelete(null);
      setDeleteDialogOpen(false);
      loadData();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la ligne budgétaire',
        variant: 'destructive',
      });
    }
  };

  const handleCreateModification = async (data: any) => {
    if (!currentExercice || !currentClient) return;

    try {
      await budgetService.createModification({
        ...data,
        exerciceId: currentExercice.id,
        statut: 'brouillon' as const,
      }, currentClient.id);
      toast({
        title: 'Succès',
        description: 'Modification budgétaire créée avec succès',
      });
      loadData();
      setSearchParams({ tab: 'modifications' });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer la modification budgétaire',
        variant: 'destructive',
      });
    }
  };

  const handleValiderModification = async (id: string) => {
    if (!user) return;

    try {
      await budgetService.validerModification(id, user.id);
      toast({
        title: 'Succès',
        description: 'Modification validée avec succès',
      });
      loadData();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de valider la modification',
        variant: 'destructive',
      });
    }
  };

  const handleSoumettreModification = async (id: string) => {
    try {
      await budgetService.soumettreModification(id);
      toast({
        title: 'Succès',
        description: 'Modification soumise pour validation',
      });
      loadData();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de soumettre la modification',
        variant: 'destructive',
      });
    }
  };

  const handleRejeterModification = async (id: string) => {
    try {
      await budgetService.rejeterModification(id);
      toast({
        title: 'Succès',
        description: 'Modification rejetée',
      });
      loadData();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de rejeter la modification',
        variant: 'destructive',
      });
    }
  };

  const handleReserverCredit = (ligne: LigneBudgetaire) => {
    setLigneForReservation(ligne);
    setReservationDialogOpen(true);
  };

  const handleSaveReservation = async (data: any) => {
    try {
      await createReservation(data);
      toast({
        title: 'Succès',
        description: 'Réservation de crédit créée avec succès',
      });
      setReservationDialogOpen(false);
      setLigneForReservation(null);
      loadData();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer la réservation',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(montant);
  };

  const getModificationStatusBadge = (statut: string) => {
    const variants: Record<string, 'success' | 'warning' | 'secondary' | 'destructive'> = {
      validee: 'success',
      en_attente: 'warning',
      brouillon: 'secondary',
      rejetee: 'destructive',
    };
    return variants[statut] || 'secondary';
  };

  const getModificationStatusLabel = (statut: string) => {
    const labels: Record<string, string> = {
      validee: 'Validée',
      en_attente: 'En attente',
      brouillon: 'Brouillon',
      rejetee: 'Rejetée',
    };
    return labels[statut] || statut;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      augmentation: 'Augmentation',
      diminution: 'Diminution',
      virement: 'Virement',
    };
    return labels[type] || type;
  };

  if (loading || loadingSections || loadingProgrammes || loadingActions || loadingComptes || loadingEnveloppes) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* EN-TÊTE STICKY */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border">
        <div className="p-8 pb-6">
          <h1 className="text-3xl font-bold mb-2">Gestion des Budgets</h1>
          <p className="text-muted-foreground">
            Plan budgétaire, modifications et suivi d'exécution
          </p>
        </div>
      </div>

      {/* CONTENU SCROLLABLE */}
      <div className="flex-1 overflow-y-auto p-8 pt-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList>
          <TabsTrigger value="lignes">Lignes Budgétaires</TabsTrigger>
          <TabsTrigger value="modifications">
            Modifications Budgétaires
            {modifications.filter(m => m.statut === 'en_attente').length > 0 && (
              <Badge variant="warning" className="ml-2">
                {modifications.filter(m => m.statut === 'en_attente').length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lignes" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Plan Budgétaire {currentExercice?.libelle}</CardTitle>
              <Button onClick={() => setLigneDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle ligne
              </Button>
            </CardHeader>
            <CardContent>
              <BudgetTable
                clientId={currentClient?.id || ''}
                exerciceId={currentExercice?.id || ''}
                sections={sections}
                programmes={programmes}
                actions={actions}
                lignes={lignes}
                comptes={comptes}
                enveloppes={enveloppes}
                onEdit={(ligne) => {
                  setSelectedLigne(ligne);
                  setLigneDialogOpen(true);
                }}
                onDelete={(id) => {
                  setLigneToDelete(id);
                  setDeleteDialogOpen(true);
                }}
                onReserver={handleReserverCredit}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modifications" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Modifications Budgétaires</CardTitle>
              <Button onClick={() => setModificationDialogOpen(true)}>
                <FileEdit className="h-4 w-4 mr-2" />
                Nouvelle modification
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Numéro</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Ligne</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Motif</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modifications.map((modification) => {
                    const ligne = lignes.find(l => l.id === modification.ligneDestinationId);
                    
                    return (
                      <TableRow key={modification.id} className="align-top">
                        <TableCell className="font-medium">{modification.numero}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getTypeLabel(modification.type)}</Badge>
                        </TableCell>
                        <TableCell className="min-w-[180px]">
                          {modification.type === 'virement' && modification.ligneSourceId ? (
                            <div className="flex flex-col gap-0.5 py-1">
                              <span className="text-sm text-muted-foreground truncate">
                                {lignes.find(l => l.id === modification.ligneSourceId)?.libelle || '-'}
                              </span>
                              <div className="flex justify-start">
                                <ArrowDown className="h-3 w-3 text-primary" />
                              </div>
                              <span className="text-sm font-medium truncate">
                                {ligne?.libelle || '-'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm truncate">
                              {ligne?.libelle || '-'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatMontant(modification.montant)}
                        </TableCell>
                        <TableCell className="max-w-[250px] truncate">
                          {modification.motif}
                        </TableCell>
                        <TableCell>{modification.dateCreation}</TableCell>
                        <TableCell>
                          <Badge variant={getModificationStatusBadge(modification.statut)}>
                            {getModificationStatusLabel(modification.statut)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {modification.statut === 'brouillon' && (
                            <div className="flex gap-1 justify-end">
                              <Button
                                size="sm"
                                onClick={() => handleSoumettreModification(modification.id)}
                              >
                                <Send className="h-4 w-4 mr-1" />
                                Soumettre
                              </Button>
                            </div>
                          )}
                          {modification.statut === 'en_attente' && (
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 border-green-600 hover:bg-green-50"
                                onClick={() => handleValiderModification(modification.id)}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Valider
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-600 hover:bg-red-50"
                                onClick={() => handleRejeterModification(modification.id)}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Rejeter
                              </Button>
                            </div>
                          )}
                          {modification.statut === 'validee' && (
                            <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              {modification.dateValidation}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {modifications.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Aucune modification budgétaire
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>

      <LigneBudgetaireDialog
        open={ligneDialogOpen}
        onClose={() => {
          setLigneDialogOpen(false);
          setSelectedLigne(null);
        }}
        onSubmit={selectedLigne ? handleUpdateLigne : handleCreateLigne}
        ligne={selectedLigne}
        exerciceId={currentExercice?.id || ''}
      />

      <ModificationBudgetaireDialog
        open={modificationDialogOpen}
        onClose={() => setModificationDialogOpen(false)}
        onSubmit={handleCreateModification}
        lignes={lignes}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette ligne budgétaire ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLigne}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReservationDialog
        open={reservationDialogOpen}
        onOpenChange={setReservationDialogOpen}
        onSave={handleSaveReservation}
        reservation={undefined}
        preSelectedLigneBudgetaire={ligneForReservation}
      />
    </div>
  );
};

export default Budgets;
