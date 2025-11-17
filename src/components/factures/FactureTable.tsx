import { useState } from 'react';
import { Facture, StatutFacture } from '@/types/facture.types';
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
  Pencil, 
  Trash2, 
  CheckCircle, 
  DollarSign,
  XCircle,
  Eye
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
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


interface FactureTableProps {
  factures: Facture[];
  onEdit: (facture: Facture) => void;
  onDelete: (id: string) => void;
  onValider: (id: string) => void;
  onMarquerPayee: (id: string) => void;
  onAnnuler: (id: string) => void;
}

export const FactureTable = ({
  factures,
  onEdit,
  onDelete,
  onValider,
  onMarquerPayee,
  onAnnuler,
}: FactureTableProps) => {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const getStatutBadge = (statut: string) => {
    const variants: Record<string, any> = {
      brouillon: { variant: 'outline' as const, label: 'Brouillon' },
      validee: { variant: 'secondary' as const, label: 'Validée' },
      payee: { variant: 'default' as const, label: 'Payée' },
      annulee: { variant: 'destructive' as const, label: 'Annulée' },
    };
    const config = variants[statut] || variants.brouillon;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
    }).format(montant);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: fr });
  };

  const hasAvailableActions = (statut: StatutFacture) => {
    // "Voir les détails" est disponible pour TOUS les statuts
    return true;
  };

  return (
    <>
      <div className="rounded-md border">
        <div className="max-h-[600px] overflow-y-auto overflow-x-auto">
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Numéro</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Fournisseur</TableHead>
              <TableHead>Objet</TableHead>
              <TableHead>Bon de commande</TableHead>
              <TableHead className="text-right">Montant HT</TableHead>
              <TableHead className="text-right">TVA</TableHead>
              <TableHead className="text-right">Montant TTC</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {factures.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground">
                  Aucune facture trouvée
                </TableCell>
              </TableRow>
            ) : (
              factures.map((facture) => (
                <TableRow key={facture.id}>
                  <TableCell className="font-medium">{facture.numero}</TableCell>
                  <TableCell>{formatDate(facture.dateFacture)}</TableCell>
                  <TableCell>{facture.fournisseur?.nom || '-'}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {facture.objet}
                  </TableCell>
                  <TableCell>{facture.bonCommande?.numero || '-'}</TableCell>
                  <TableCell className="text-right">{formatMontant(facture.montantHT)}</TableCell>
                  <TableCell className="text-right">{formatMontant(facture.montantTVA)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatMontant(facture.montantTTC)}
                  </TableCell>
                  <TableCell>{getStatutBadge(facture.statut)}</TableCell>
                  <TableCell>
                    {hasAvailableActions(facture.statut) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(facture)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Voir les détails
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                        {facture.statut === 'brouillon' && (
                          <DropdownMenuItem onClick={() => onValider(facture.id)}>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Valider
                          </DropdownMenuItem>
                        )}
                        {facture.statut === 'validee' && (
                          <DropdownMenuItem onClick={() => onMarquerPayee(facture.id)}>
                            <DollarSign className="mr-2 h-4 w-4" />
                            Marquer payée
                          </DropdownMenuItem>
                        )}
                        {facture.statut !== 'payee' && facture.statut !== 'annulee' && (
                          <DropdownMenuItem onClick={() => onAnnuler(facture.id)}>
                            <XCircle className="mr-2 h-4 w-4" />
                            Annuler
                          </DropdownMenuItem>
                        )}
                        {facture.statut === 'brouillon' && (
                          <DropdownMenuItem
                            onClick={() => setDeleteId(facture.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
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
              Êtes-vous sûr de vouloir supprimer cette facture ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  onDelete(deleteId);
                  setDeleteId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
