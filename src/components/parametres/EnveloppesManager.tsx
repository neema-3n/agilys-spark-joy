import { useMemo, useState, useEffect } from 'react';
import { useMatch, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
import { Plus, Briefcase, Edit, Trash2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import { enveloppesService } from '@/services/api/enveloppes.service';
import type { Enveloppe } from '@/types/enveloppe.types';
import { EnveloppeForm, EnveloppeFormValues } from './EnveloppeForm';
import { ParametreEditorPage } from './ParametreEditorPage';
import { formatCurrency as formatSharedCurrency } from '@/lib/utils';

const EnveloppesManager = () => {
  const { currentClient } = useClient();
  const { currentExercice } = useExercice();
  const navigate = useNavigate();
  const { itemId } = useParams<{ itemId?: string }>();
  const isCreateRoute = !!useMatch('/app/parametres/enveloppes/create');
  const isEditRoute = !!useMatch('/app/parametres/enveloppes/:itemId/edit');
  const isEditorMode = isCreateRoute || isEditRoute;
  const [enveloppes, setEnveloppes] = useState<Enveloppe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [enveloppeToDelete, setEnveloppeToDelete] = useState<Enveloppe | null>(null);
  const [isEnveloppeDirty, setIsEnveloppeDirty] = useState(false);
  const selectedEnveloppe = useMemo(
    () => (isEditRoute ? enveloppes.find((enveloppe) => enveloppe.id === itemId) : undefined),
    [enveloppes, isEditRoute, itemId]
  );

  const loadEnveloppes = async () => {
    if (!currentClient || !currentExercice) return;

    setIsLoading(true);
    try {
      const data = await enveloppesService.getAll(currentClient.id, currentExercice.id);
      setEnveloppes(data);
    } catch (error) {
      console.error('Error loading enveloppes:', error);
      toast.error('Erreur lors du chargement des enveloppes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEnveloppes();
  }, [currentClient, currentExercice]);

  const handleCreate = () => navigate('/app/parametres/enveloppes/create');

  const handleEdit = (enveloppe: Enveloppe) => {
    navigate(`/app/parametres/enveloppes/${enveloppe.id}/edit`);
  };

  const handleSubmit = async (values: EnveloppeFormValues) => {
    if (!currentClient || !currentExercice) return;

    try {
      if (selectedEnveloppe) {
        await enveloppesService.update(selectedEnveloppe.id, values);
        toast.success('Enveloppe mise à jour avec succès');
      } else {
        await enveloppesService.create({
          ...values,
          clientId: currentClient.id,
          exerciceId: currentExercice.id,
        });
        toast.success('Enveloppe créée avec succès');
      }
      await loadEnveloppes();
      navigate('/app/parametres/enveloppes');
    } catch (error: any) {
      console.error('Error saving enveloppe:', error);
      toast.error(error.message || 'Erreur lors de l\'enregistrement');
      throw error;
    }
  };

  const handleEditorCancel = () => {
    navigate('/app/parametres/enveloppes');
  };

  const handleDeleteClick = (enveloppe: Enveloppe) => {
    setEnveloppeToDelete(enveloppe);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!enveloppeToDelete) return;

    try {
      await enveloppesService.delete(enveloppeToDelete.id);
      toast.success('Enveloppe supprimée avec succès');
      await loadEnveloppes();
    } catch (error: any) {
      console.error('Error deleting enveloppe:', error);
      toast.error(error.message || 'Erreur lors de la suppression');
    } finally {
      setDeleteDialogOpen(false);
      setEnveloppeToDelete(null);
    }
  };

  const handleCloturer = async (enveloppe: Enveloppe) => {
    try {
      await enveloppesService.cloturer(enveloppe.id);
      toast.success('Enveloppe clôturée avec succès');
      await loadEnveloppes();
    } catch (error: any) {
      console.error('Error closing enveloppe:', error);
      toast.error(error.message || 'Erreur lors de la clôture');
    }
  };

  const formatCurrency = (amount: number) => {
    return formatSharedCurrency(amount, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  if (!currentClient || !currentExercice) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Veuillez sélectionner un client et un exercice
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isEditorMode) {
    return (
      <ParametreEditorPage
        title={selectedEnveloppe ? `Modifier ${selectedEnveloppe.nom}` : 'Nouvelle enveloppe'}
        description="Gérez une enveloppe de financement dans un espace de travail dédié."
        backLabel="Retour aux enveloppes"
        onBack={handleEditorCancel}
        dirty={isEnveloppeDirty}
        entityLabel="ce formulaire d'enveloppe"
      >
        {isEditRoute && !selectedEnveloppe ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Cette enveloppe est introuvable.
          </div>
        ) : (
          <EnveloppeForm
            enveloppe={selectedEnveloppe}
            onSubmit={handleSubmit}
            onCancel={handleEditorCancel}
            onDirtyChange={setIsEnveloppeDirty}
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
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Enveloppes & Financement
              </CardTitle>
              <CardDescription>
                Gérez les enveloppes budgétaires et sources de financement pour {currentExercice.libelle}
              </CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle enveloppe
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Alloué</TableHead>
                <TableHead className="text-right">Consommé</TableHead>
                <TableHead className="text-right">Disponible</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : enveloppes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    <Briefcase className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Aucune enveloppe enregistrée</p>
                    <p className="text-sm mt-1">Cliquez sur "Nouvelle enveloppe" pour commencer</p>
                  </TableCell>
                </TableRow>
              ) : (
                enveloppes.map((enveloppe) => (
                  <TableRow key={enveloppe.id}>
                    <TableCell className="font-mono text-sm">{enveloppe.code}</TableCell>
                    <TableCell className="font-medium">{enveloppe.nom}</TableCell>
                    <TableCell>{enveloppe.sourceFinancement}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(enveloppe.montantAlloue)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(enveloppe.montantConsomme)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <span
                        className={
                          enveloppe.montantDisponible < 0
                            ? 'text-destructive'
                            : enveloppe.montantDisponible === 0
                            ? 'text-muted-foreground'
                            : ''
                        }
                      >
                        {formatCurrency(enveloppe.montantDisponible)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={enveloppe.statut === 'actif' ? 'default' : 'secondary'}>
                        {enveloppe.statut === 'actif' ? 'Actif' : 'Clôturé'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(enveloppe)}
                          disabled={enveloppe.statut === 'cloture'}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {enveloppe.statut === 'actif' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCloturer(enveloppe)}
                          >
                            <Lock className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(enveloppe)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l'enveloppe "{enveloppeToDelete?.nom}" ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export { EnveloppesManager };
