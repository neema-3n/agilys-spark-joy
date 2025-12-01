import { ListTable, ListColumn } from '@/components/lists/ListTable';
import type { OperationTresorerie } from '@/types/operation-tresorerie.types';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowDownRight, ArrowUpRight, ArrowRightLeft } from 'lucide-react';

interface OperationTresorerieTableProps {
  operations: OperationTresorerie[];
}

export const OperationTresorerieTable = ({ operations }: OperationTresorerieTableProps) => {
  const columns: ListColumn<OperationTresorerie>[] = [
    {
      id: 'numero',
      header: 'Numéro',
      render: (operation) => <span className="font-medium">{operation.numero}</span>,
    },
    {
      id: 'dateOperation',
      header: 'Date',
      render: (operation) =>
        format(new Date(operation.dateOperation), 'dd/MM/yyyy', { locale: fr }),
    },
    {
      id: 'typeOperation',
      header: 'Type',
      render: (operation) => {
        const type = operation.typeOperation;
        const Icon =
          type === 'encaissement'
            ? ArrowDownRight
            : type === 'decaissement'
            ? ArrowUpRight
            : ArrowRightLeft;
        const color =
          type === 'encaissement'
            ? 'text-green-600'
            : type === 'decaissement'
            ? 'text-red-600'
            : 'text-blue-600';
        
        return (
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${color}`} />
            <span className="capitalize">{type}</span>
          </div>
        );
      },
    },
    {
      id: 'compte',
      header: 'Compte',
      render: (operation) => {
        const compte = operation.compte;
        return compte ? `${compte.code} - ${compte.libelle}` : '-';
      },
    },
    {
      id: 'montant',
      header: 'Montant',
      render: (operation) => {
        const type = operation.typeOperation;
        const color =
          type === 'encaissement'
            ? 'text-green-600'
            : type === 'decaissement'
            ? 'text-red-600'
            : 'text-blue-600';
        const prefix = type === 'encaissement' ? '+' : type === 'decaissement' ? '-' : '';
        
        return (
          <span className={`font-semibold ${color}`}>
            {prefix}{formatCurrency(operation.montant)}
          </span>
        );
      },
    },
    {
      id: 'libelle',
      header: 'Libellé',
      render: (operation) => (
        <div className="max-w-xs truncate" title={operation.libelle}>
          {operation.libelle}
        </div>
      ),
    },
    {
      id: 'ligneBudgetaire',
      header: 'Ligne budgétaire',
      render: (operation) => {
        const lb = operation.paiement?.depense?.ligneBudgetaire;
        if (!lb) return <span className="text-muted-foreground">-</span>;
        return (
          <div className="text-sm text-muted-foreground truncate max-w-[200px]" title={lb.libelle}>
            {lb.libelle}
          </div>
        );
      },
    },
    {
      id: 'rapproche',
      header: 'Rapproché',
      render: (operation) => (
        <Badge variant={operation.rapproche ? 'default' : 'secondary'}>
          {operation.rapproche ? 'Oui' : 'Non'}
        </Badge>
      ),
    },
    {
      id: 'statut',
      header: 'Statut',
      render: (operation) => {
        const statut = operation.statut;
        return (
          <Badge
            variant={
              statut === 'validee'
                ? 'default'
                : statut === 'rapprochee'
                ? 'secondary'
                : 'destructive'
            }
          >
            {statut === 'validee'
              ? 'Validée'
              : statut === 'rapprochee'
              ? 'Rapprochée'
              : 'Annulée'}
          </Badge>
        );
      },
    },
  ];

  return <ListTable columns={columns} items={operations} getRowId={(o) => o.id} />;
};
