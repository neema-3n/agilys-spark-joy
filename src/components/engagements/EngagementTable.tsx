import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, CheckCircle, XCircle, Trash2, FileText, Receipt } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Engagement } from '@/types/engagement.types';

interface EngagementTableProps {
  engagements: Engagement[];
  onEdit: (engagement: Engagement) => void;
  onValider: (id: string) => void;
  onAnnuler: (id: string, motif: string) => void;
  onDelete: (id: string) => void;
  onCreerBonCommande: (engagement: Engagement) => void;
  onCreerDepense: (engagement: Engagement) => void;
}

export const EngagementTable = ({
  engagements,
  onEdit,
  onValider,
  onAnnuler,
  onDelete,
  onCreerBonCommande,
  onCreerDepense,
}: EngagementTableProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getStatusBadge = (statut: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      brouillon: { variant: 'secondary', label: 'Brouillon' },
      valide: { variant: 'default', label: 'Validé' },
      engage: { variant: 'default', label: 'Engagé' },
      liquide: { variant: 'default', label: 'Liquidé' },
      annule: { variant: 'destructive', label: 'Annulé' },
    };
    const config = variants[statut] || variants.brouillon;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleAnnuler = (id: string) => {
    const motif = prompt('Motif d\'annulation :');
    if (motif) {
      onAnnuler(id, motif);
    }
  };

  if (engagements.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Aucun engagement pour le moment
      </div>
    );
  }

  return (
    <div className="rounded-md border max-h-[600px] overflow-auto">
      <div className="[&>div]:max-h-none [&>div]:overflow-visible">
        <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Numéro</TableHead>
          <TableHead>Ligne budgétaire</TableHead>
          <TableHead>Objet</TableHead>
          <TableHead>Bénéficiaire</TableHead>
          <TableHead className="text-right">Montant</TableHead>
          <TableHead className="text-right">Solde</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Date création</TableHead>
          <TableHead>Réservation</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {engagements.map((engagement) => (
          <TableRow key={engagement.id}>
            <TableCell className="font-medium">
              <Link
                to={`/app/engagements/${engagement.id}`}
                className="text-primary hover:underline"
              >
                {engagement.numero}
              </Link>
            </TableCell>
            <TableCell>
              {engagement.ligneBudgetaire?.libelle || '-'}
            </TableCell>
            <TableCell className="max-w-[200px] truncate">
              {engagement.objet}
            </TableCell>
            <TableCell>
              {engagement.fournisseur?.nom || engagement.beneficiaire || '-'}
            </TableCell>
            <TableCell className="text-right font-medium">
              {formatCurrency(engagement.montant)}
            </TableCell>
            <TableCell className="text-right">
              <span className={engagement.solde === 0 ? 'text-muted-foreground' : engagement.solde && engagement.solde < 0 ? 'text-destructive font-medium' : 'text-foreground'}>
                {formatCurrency(engagement.solde || engagement.montant)}
              </span>
            </TableCell>
            <TableCell>{getStatusBadge(engagement.statut)}</TableCell>
            <TableCell>{formatDate(engagement.dateCreation)}</TableCell>
            <TableCell>
              {engagement.reservationCredit ? (
                <Badge variant="outline" className="text-xs">
                  {engagement.reservationCredit.numero}
                </Badge>
              ) : (
                '-'
              )}
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {engagement.statut === 'brouillon' && (
                    <>
                      <DropdownMenuItem onClick={() => onEdit(engagement)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onValider(engagement.id)}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Valider
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {engagement.statut === 'valide' && (
                    <>
                      <DropdownMenuItem onClick={() => onCreerBonCommande(engagement)}>
                        <FileText className="h-4 w-4 mr-2" />
                        Créer bon de commande
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onCreerDepense(engagement)}>
                        <Receipt className="h-4 w-4 mr-2" />
                        Créer une dépense
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAnnuler(engagement.id)}>
                        <XCircle className="h-4 w-4 mr-2" />
                        Annuler
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem
                    onClick={() => onDelete(engagement.id)}
                    className="text-destructive"
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
      </div>
    </div>
  );
};
