import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, BookOpen, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useClient } from '@/contexts/ClientContext';
import { Compte } from '@/types/compte.types';
import { comptesService } from '@/services/api/comptes.service';
import { CompteDialog } from './CompteDialog';
import { useToast } from '@/hooks/use-toast';

const PlanComptableManager = () => {
  const { currentClient } = useClient();
  const { toast } = useToast();
  const [comptes, setComptes] = useState<Compte[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCompte, setSelectedCompte] = useState<Compte | undefined>();
  const [compteToDelete, setCompteToDelete] = useState<Compte | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadComptes();
  }, [currentClient]);

  const loadComptes = async () => {
    if (!currentClient) return;

    try {
      setIsLoading(true);
      const data = await comptesService.getAll(currentClient.id);
      setComptes(data);
    } catch (error) {
      console.error('Erreur lors du chargement des comptes:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les comptes',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (data: any) => {
    if (!currentClient) return;

    try {
      await comptesService.create({
        ...data,
        clientId: currentClient.id
      });
      
      toast({
        title: 'Succès',
        description: 'Compte créé avec succès'
      });
      
      setDialogOpen(false);
      await loadComptes();
    } catch (error) {
      console.error('Erreur lors de la création:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de créer le compte',
        variant: 'destructive'
      });
    }
  };

  const handleUpdate = async (data: any) => {
    if (!selectedCompte) return;

    try {
      await comptesService.update(selectedCompte.id, data);
      
      toast({
        title: 'Succès',
        description: 'Compte mis à jour avec succès'
      });
      
      setDialogOpen(false);
      setSelectedCompte(undefined);
      await loadComptes();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le compte',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async () => {
    if (!compteToDelete) return;

    try {
      await comptesService.delete(compteToDelete.id);
      
      toast({
        title: 'Succès',
        description: 'Compte supprimé avec succès'
      });
      
      setDeleteDialogOpen(false);
      setCompteToDelete(null);
      await loadComptes();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le compte',
        variant: 'destructive'
      });
    }
  };

  const openEditDialog = (compte: Compte) => {
    setSelectedCompte(compte);
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setSelectedCompte(undefined);
    setDialogOpen(true);
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      actif: 'Actif',
      passif: 'Passif',
      charge: 'Charge',
      produit: 'Produit',
      resultat: 'Résultat'
    };
    return labels[type] || type;
  };

  const getCategorieLabel = (categorie: string) => {
    const labels: Record<string, string> = {
      immobilisation: 'Immobilisation',
      stock: 'Stock',
      creance: 'Créance',
      tresorerie: 'Trésorerie',
      dette: 'Dette',
      capital: 'Capital',
      exploitation: 'Exploitation',
      financier: 'Financier',
      exceptionnel: 'Exceptionnel',
      autre: 'Autre'
    };
    return labels[categorie] || categorie;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Plan Comptable
              </CardTitle>
              <CardDescription>
                Gérez les comptes comptables et leur structure
              </CardDescription>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau compte
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Chargement...
            </div>
          ) : comptes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Aucun compte enregistré</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numéro</TableHead>
                  <TableHead>Libellé</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Niveau</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comptes.map((compte) => (
                  <TableRow key={compte.id}>
                    <TableCell className="font-mono">{compte.numero}</TableCell>
                    <TableCell className="font-medium">{compte.libelle}</TableCell>
                    <TableCell>{getTypeLabel(compte.type)}</TableCell>
                    <TableCell>{getCategorieLabel(compte.categorie)}</TableCell>
                    <TableCell>{compte.niveau}</TableCell>
                    <TableCell>
                      <Badge variant={compte.statut === 'actif' ? 'default' : 'secondary'}>
                        {compte.statut === 'actif' ? 'Actif' : 'Inactif'}
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
                          <DropdownMenuItem onClick={() => openEditDialog(compte)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setCompteToDelete(compte);
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

      <CompteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={selectedCompte ? handleUpdate : handleCreate}
        compte={selectedCompte}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le compte "{compteToDelete?.numero} - {compteToDelete?.libelle}" ?
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

export { PlanComptableManager };
