import { ListTable, ListColumn } from '@/components/lists/ListTable';
import type { CompteTresorerie } from '@/types/compte-tresorerie.types';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Eye, Edit } from 'lucide-react';

interface CompteTresorerieTableProps {
  comptes: CompteTresorerie[];
  onView?: (compte: CompteTresorerie) => void;
  onEdit?: (compte: CompteTresorerie) => void;
}

export const CompteTresorerieTable = ({ comptes, onView, onEdit }: CompteTresorerieTableProps) => {
  const columns: ListColumn<CompteTresorerie>[] = [
    {
      id: 'code',
      header: 'Code',
      render: (compte) => <span className="font-medium">{compte.code}</span>,
    },
    {
      id: 'libelle',
      header: 'Libellé',
      render: (compte) => compte.libelle,
    },
    {
      id: 'type',
      header: 'Type',
      render: (compte) => (
        <Badge variant="outline">
          {compte.type === 'banque' ? 'Banque' : 'Caisse'}
        </Badge>
      ),
    },
    {
      id: 'banque',
      header: 'Banque',
      render: (compte) => compte.banque || '-',
    },
    {
      id: 'numeroCompte',
      header: 'N° Compte',
      render: (compte) => compte.numeroCompte || '-',
    },
    {
      id: 'soldeActuel',
      header: 'Solde actuel',
      render: (compte) => (
        <span
          className={`font-bold ${
            compte.soldeActuel >= 0 ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {formatCurrency(compte.soldeActuel)} {compte.devise}
        </span>
      ),
    },
    {
      id: 'statut',
      header: 'Statut',
      render: (compte) => {
        const statut = compte.statut;
        const variant =
          statut === 'actif' ? 'default' : statut === 'inactif' ? 'secondary' : 'destructive';
        return <Badge variant={variant}>{statut}</Badge>;
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      render: (compte) => (
        <div className="flex gap-2">
          {onView && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onView(compte)}
              title="Voir détails"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(compte)}
              title="Modifier"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return <ListTable columns={columns} items={comptes} getRowId={(c) => c.id} />;
};
