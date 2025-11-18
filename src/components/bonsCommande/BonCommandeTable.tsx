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
  Trash2,
  Eye
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

// Helper function to safely format dates
const formatDate = (dateString?: string | null): string => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return format(date, 'dd/MM/yyyy', { locale: fr });
  } catch {
    return '-';
  }
};

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

const getRetardStatus = (bc: BonCommande): 'on_time' | 'late' | 'pending_late' | 'no_data' => {
  if (!bc.dateLivraisonPrevue) return 'no_data';
  
  const datePrevue = new Date(bc.dateLivraisonPrevue);
  
  // Si réceptionné : comparer date réelle vs prévue
  if (bc.dateLivraisonReelle) {
    const dateReelle = new Date(bc.dateLivraisonReelle);
    return dateReelle <= datePrevue ? 'on_time' : 'late';
  }
  
  // Si en cours ou validé : comparer date actuelle vs prévue
  if (bc.statut === 'en_cours' || bc.statut === 'valide') {
    const dateActuelle = new Date();
    return dateActuelle > datePrevue ? 'pending_late' : 'no_data';
  }
  
  return 'no_data';
};

const getRetardColorClass = (status: ReturnType<typeof getRetardStatus>): string => {
  switch (status) {
    case 'on_time':
      return 'text-secondary font-semibold'; // Vert pour à l'heure
    case 'late':
      return 'text-destructive font-semibold'; // Rouge pour retard confirmé
    case 'pending_late':
      return 'text-orange-600 font-semibold'; // Orange pour retard en cours
    case 'no_data':
    default:
      return ''; // Style par défaut
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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
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
      <div className="rounded-md border max-h-[600px] overflow-auto">
        <div className="[&>div]:max-h-none [&>div]:overflow-visible">
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
                    {formatDate(bc.dateCommande)}
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
                    {bc.dateLivraisonPrevue ? (
                      <span className={
                        getRetardStatus(bc) === 'pending_late' 
                          ? getRetardColorClass('pending_late')
                          : ''
                      }>
                        {formatDate(bc.dateLivraisonPrevue)}
                      </span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {bc.dateLivraisonReelle ? (
                      <span className={getRetardColorClass(getRetardStatus(bc))}>
                        {formatDate(bc.dateLivraisonReelle)}
                      </span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(bc)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Voir les détails
                        </DropdownMenuItem>
                        
                        {bc.statut === 'brouillon' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onValider(bc.id)}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Valider
                            </DropdownMenuItem>
                          </>
                        )}
                        
                        {bc.statut === 'valide' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onMettreEnCours(bc.id)}>
                              <Truck className="h-4 w-4 mr-2" />
                              Mettre en cours
                            </DropdownMenuItem>
                          </>
                        )}
                        
                        {bc.statut === 'en_cours' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onReceptionner(bc.id)}>
                              <Package className="h-4 w-4 mr-2" />
                              Réceptionner
                            </DropdownMenuItem>
                          </>
                        )}
                        
                        {bc.statut !== 'receptionne' && bc.statut !== 'annule' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onAnnuler(bc.id)}>
                              <XCircle className="h-4 w-4 mr-2" />
                              Annuler
                            </DropdownMenuItem>
                          </>
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
