import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, FolderTree, BookOpen, Upload } from 'lucide-react';
import { useClient } from '@/contexts/ClientContext';
import { Compte } from '@/types/compte.types';
import { comptesService } from '@/services/api/comptes.service';
import { CompteDialog } from './CompteDialog';
import { CompteTreeItem } from './CompteTreeItem';
import { ImportPlanComptableDialog } from './ImportPlanComptableDialog';
import { useToast } from '@/hooks/use-toast';

interface CompteNode extends Compte {
  children: CompteNode[];
}

const PlanComptableManager = () => {
  const { currentClient } = useClient();
  const { toast } = useToast();
  const [comptes, setComptes] = useState<Compte[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCompte, setSelectedCompte] = useState<Compte | undefined>();
  const [compteToDelete, setCompteToDelete] = useState<Compte | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Construire l'arbre hiérarchique
  const buildTree = (comptes: Compte[]): CompteNode[] => {
    const map = new Map<string, CompteNode>();
    const roots: CompteNode[] = [];

    // Initialiser tous les nœuds
    comptes.forEach(compte => {
      map.set(compte.id, { ...compte, children: [] });
    });

    // Construire les relations parent-enfant
    comptes.forEach(compte => {
      const node = map.get(compte.id)!;
      if (compte.parentId && map.has(compte.parentId)) {
        map.get(compte.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    // Trier par numéro
    const sortChildren = (nodes: CompteNode[]) => {
      nodes.sort((a, b) => a.numero.localeCompare(b.numero));
      nodes.forEach(node => sortChildren(node.children));
    };
    sortChildren(roots);

    return roots;
  };

  // Filtrer les comptes par recherche
  const filterComptes = (comptes: Compte[], term: string): Compte[] => {
    if (!term) return comptes;
    const lowerTerm = term.toLowerCase();
    return comptes.filter(c => 
      c.numero.toLowerCase().includes(lowerTerm) || 
      c.libelle.toLowerCase().includes(lowerTerm)
    );
  };

  const filteredComptes = filterComptes(comptes, searchTerm);
  const compteTree = buildTree(filteredComptes);

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
                <FolderTree className="h-5 w-5" />
                Plan Comptable
              </CardTitle>
              <CardDescription>
                Structure hiérarchique du plan comptable
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Importer CSV
              </Button>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau compte
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input 
              placeholder="Rechercher par numéro ou libellé..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
          
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
            <div className="border rounded-lg">
              {compteTree.map((node) => (
                <CompteTreeItem
                  key={node.id}
                  node={node}
                  onEdit={openEditDialog}
                  onDelete={(compte) => {
                    setCompteToDelete(compte);
                    setDeleteDialogOpen(true);
                  }}
                  getTypeLabel={getTypeLabel}
                  getCategorieLabel={getCategorieLabel}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CompteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={selectedCompte ? handleUpdate : handleCreate}
        compte={selectedCompte}
        comptes={comptes}
      />

      <ImportPlanComptableDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={loadComptes}
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
