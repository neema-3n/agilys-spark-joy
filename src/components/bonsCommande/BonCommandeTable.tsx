import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MoreHorizontal,
  Edit,
  CheckCircle,
  Truck,
  Package,
  XCircle,
  Trash2
} from 'lucide-react';
import { BonCommande } from '@/types/bonCommande.types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface BonCommandeTableProps {
  bonsCommande: BonCommande[];
  onEdit: (bonCommande: BonCommande) => void;
  onValider: (id: string) => void;
  onMettreEnCours: (id: string) => void;
  onReceptionner: (id: string) => void;
  onAnnuler: (id: string) => void;
  onDelete: (id: string) => void;
}

const getStatutColor = (statut: string) => {
  switch (statut) {
    case 'brouillon':
      return 'bg-muted text-muted-foreground';
    case 'valide':
      return 'bg-secondary text-secondary-foreground';
    case 'en_cours':
      return 'bg-primary text-primary-foreground';
    case 'receptionne':
      return 'bg-accent text-accent-foreground';
    case 'annule':
      return 'bg-destructive text-destructive-foreground';
    default:
      return 'bg-muted';
  }
};

const getStatutLabel = (statut: string) => {
  switch (statut) {
    case 'brouillon':
      return 'Brouillon';
    case 'valide':
      return 'Validé';
    case 'en_cours':
      return 'En cours';
    case 'receptionne':
      return 'Réceptionné';
    case 'annule':
      return 'Annulé';
    default:
      return statut;
  }
};

export const BonCommandeTable = ({
  bonsCommande,
  onEdit,
  onValider,
  onMettreEnCours,
  onReceptionner,
  onAnnuler,
  onDelete,
}: BonCommandeTableProps) => {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleDelete = () => {
    if (deleteId) {
      onDelete(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Numéro</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Fournisseur</TableHead>
              <TableHead>Engagement</TableHead>
              <TableHead>Objet</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Livraison prévue</TableHead>
              <TableHead>Livraison effective</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bonsCommande.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground">
                  Aucun bon de commande trouvé
                </TableCell>
              </TableRow>
            ) : (
              bonsCommande.map((bc) => (
                <TableRow key={bc.id}>
                  <TableCell className="font-medium">{bc.numero}</TableCell>
                  <TableCell>
                    {format(new Date(bc.dateCommande), 'dd/MM/yyyy', { locale: fr })}
                  </TableCell>
                  <TableCell>{bc.fournisseur?.nom || '-'}</TableCell>
                  <TableCell>
                    {bc.engagement ? (
                      <Badge variant="outline" className="text-xs">
                        {bc.engagement.numero}
                      </Badge>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{bc.objet}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(bc.montant)}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatutColor(bc.statut)}>
                      {getStatutLabel(bc.statut)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {bc.dateLivraisonPrevue
                      ? format(new Date(bc.dateLivraisonPrevue), 'dd/MM/yyyy', { locale: fr })
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {bc.dateLivraisonReelle
                      ? format(new Date(bc.dateLivraisonReelle), 'dd/MM/yyyy', { locale: fr })
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {bc.statut === 'brouillon' && (
                          <>
                            <DropdownMenuItem onClick={() => onEdit(bc)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onValider(bc.id)}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Valider
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        
                        {bc.statut === 'valide' && (
                          <>
                            <DropdownMenuItem onClick={() => onMettreEnCours(bc.id)}>
                              <Truck className="h-4 w-4 mr-2" />
                              Mettre en cours
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        
                        {bc.statut === 'en_cours' && (
                          <>
                            <DropdownMenuItem onClick={() => onReceptionner(bc.id)}>
                              <Package className="h-4 w-4 mr-2" />
                              Réceptionner
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        
                        {bc.statut !== 'receptionne' && bc.statut !== 'annule' && (
                          <DropdownMenuItem onClick={() => onAnnuler(bc.id)}>
                            <XCircle className="h-4 w-4 mr-2" />
                            Annuler
                          </DropdownMenuItem>
                        )}
                        
                        {bc.statut === 'brouillon' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDeleteId(bc.id)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce bon de commande ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
