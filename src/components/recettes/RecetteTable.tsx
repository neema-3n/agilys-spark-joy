import { ListTable, ListColumn } from '@/components/lists/ListTable';
import type { Recette } from '@/types/recette.types';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { Eye, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDateValue } from '@/lib/date-utils';
import { PermissionButton } from '@/components/PermissionButton';

interface RecetteTableProps {
  recettes: Recette[];
  onView: (recette: Recette) => void;
  onAnnuler: (recette: Recette) => void;
}

export const RecetteTable = ({ recettes, onView, onAnnuler }: RecetteTableProps) => {
  const columns: ListColumn<Recette>[] = [
    {
      id: 'numero',
      header: 'Numéro',
      render: (recette) => <span className="font-medium">{recette.numero}</span>,
    },
    {
      id: 'dateRecette',
      header: 'Date',
      render: (recette) => formatDateValue(recette.dateRecette),
    },
    {
      id: 'montant',
      header: 'Montant',
      render: (recette) => (
        <span className="font-semibold text-green-600">
          {formatCurrency(recette.montant)}
        </span>
      ),
    },
    {
      id: 'sourceRecette',
      header: 'Source',
      render: (recette) => recette.sourceRecette,
    },
    {
      id: 'compteDestination',
      header: 'Compte',
      render: (recette) => {
        const compte = recette.compteDestination;
        return compte ? `${compte.code} - ${compte.libelle}` : '-';
      },
    },
    {
      id: 'libelle',
      header: 'Libellé',
      render: (recette) => (
        <div className="max-w-xs truncate" title={recette.libelle}>
          {recette.libelle}
        </div>
      ),
    },
    {
      id: 'statut',
      header: 'Statut',
      render: (recette) => {
        const statut = recette.statut;
        return (
          <Badge variant={statut === 'validee' ? 'default' : 'destructive'}>
            {statut === 'validee' ? 'Validée' : 'Annulée'}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      render: (recette) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onView(recette)}
            title="Voir détails"
          >
            <Eye className="h-4 w-4" />
          </Button>
          {recette.statut === 'validee' && (
            <PermissionButton
              permission="tresorerie.gerer"
              variant="ghost"
              size="sm"
              onClick={() => onAnnuler(recette)}
              title="Annuler"
            >
              <XCircle className="h-4 w-4 text-destructive" />
            </PermissionButton>
          )}
        </div>
      ),
    },
  ];

  return <ListTable columns={columns} items={recettes} getRowId={(r) => r.id} />;
};
