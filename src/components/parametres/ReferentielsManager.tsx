import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, Database, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ReferentielDialog } from './ReferentielDialog';
import { useReferentiels } from '@/hooks/useReferentiels';
import { referentielsService } from '@/services/api/referentiels.service';
import { useClient } from '@/contexts/ClientContext';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { ReferentielCategorie, ParametreReferentiel } from '@/types/referentiel.types';
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

type CategorieConfig = {
  value: ReferentielCategorie;
  label: string;
  description: string;
};

const categories: CategorieConfig[] = [
  {
    value: 'compte_type',
    label: 'Types de comptes',
    description: 'Types de comptes comptables (actif, passif, charge, produit...)'
  },
  {
    value: 'compte_categorie',
    label: 'Catégories de comptes',
    description: 'Catégories de comptes (immobilisation, stock, créance...)'
  },
  {
    value: 'structure_type',
    label: 'Types de structures',
    description: 'Types de structures organisationnelles (entité, service, direction...)'
  },
  {
    value: 'source_financement',
    label: 'Sources de financement',
    description: 'Sources de financement des enveloppes budgétaires'
  },
  {
    value: 'statut_general',
    label: 'Statuts généraux',
    description: 'Statuts généraux (actif, inactif, clôturé...)'
  }
];

export const ReferentielsManager = () => {
  const { currentClient } = useClient();
  const clientId = currentClient?.id || '';
  const queryClient = useQueryClient();
  const [activeCategorie, setActiveCategorie] = useState<ReferentielCategorie>('compte_type');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedReferentiel, setSelectedReferentiel] = useState<ParametreReferentiel | undefined>();
  const [referentielToDelete, setReferentielToDelete] = useState<ParametreReferentiel | undefined>();

  const { data: referentiels = [], isLoading } = useReferentiels(activeCategorie, false);
  
  const activeCategorieConfig = categories.find(c => c.value === activeCategorie);

  const handleCreate = () => {
    setSelectedReferentiel(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (referentiel: ParametreReferentiel) => {
    setSelectedReferentiel(referentiel);
    setDialogOpen(true);
  };

  const handleDeleteClick = (referentiel: ParametreReferentiel) => {
    setReferentielToDelete(referentiel);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (data: any) => {
    try {
      if (selectedReferentiel) {
        await referentielsService.update(selectedReferentiel.id, data);
        toast({
          title: 'Référentiel mis à jour',
          description: 'Le référentiel a été mis à jour avec succès.'
        });
      } else {
        await referentielsService.create({
          clientId,
          categorie: activeCategorie,
          ...data,
          modifiable: true
        });
        toast({
          title: 'Référentiel créé',
          description: 'Le référentiel a été créé avec succès.'
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['referentiels'] });
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving referentiel:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async () => {
    if (!referentielToDelete) return;

    try {
      await referentielsService.delete(referentielToDelete.id);
      toast({
        title: 'Référentiel supprimé',
        description: 'Le référentiel a été supprimé avec succès.'
      });
      queryClient.invalidateQueries({ queryKey: ['referentiels'] });
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting referentiel:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de supprimer ce référentiel',
        variant: 'destructive'
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Référentiels
          </CardTitle>
          <CardDescription>
            Gérez les listes de valeurs utilisées dans l'application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeCategorie} onValueChange={(v) => setActiveCategorie(v as ReferentielCategorie)}>
            <TabsList className="grid w-full grid-cols-5">
              {categories.map((cat) => (
                <TabsTrigger key={cat.value} value={cat.value}>
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map((cat) => (
              <TabsContent key={cat.value} value={cat.value} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">{cat.label}</h3>
                    <p className="text-sm text-muted-foreground">{cat.description}</p>
                  </div>
                  <Button onClick={handleCreate} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter
                  </Button>
                </div>

                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Libellé</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-center">Ordre</TableHead>
                        <TableHead className="text-center">Actif</TableHead>
                        <TableHead className="text-center">Type</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center">
                            Chargement...
                          </TableCell>
                        </TableRow>
                      ) : referentiels.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground">
                            Aucun référentiel trouvé
                          </TableCell>
                        </TableRow>
                      ) : (
                        referentiels.map((ref) => (
                          <TableRow key={ref.id}>
                            <TableCell className="font-mono text-sm">{ref.code}</TableCell>
                            <TableCell className="font-medium">{ref.libelle}</TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                              {ref.description || '-'}
                            </TableCell>
                            <TableCell className="text-center">{ref.ordre}</TableCell>
                            <TableCell className="text-center">
                              {ref.actif ? (
                                <Check className="h-4 w-4 text-green-600 mx-auto" />
                              ) : (
                                <X className="h-4 w-4 text-red-600 mx-auto" />
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {!ref.modifiable && (
                                <Badge variant="secondary" className="text-xs">Système</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(ref)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteClick(ref)}
                                  disabled={!ref.modifiable}
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
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <ReferentielDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        referentiel={selectedReferentiel}
        categorieLabel={activeCategorieConfig?.label || ''}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le référentiel "{referentielToDelete?.libelle}" ?
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
