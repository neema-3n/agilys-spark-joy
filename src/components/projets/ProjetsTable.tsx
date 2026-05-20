import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Edit2, MoreHorizontal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { ListColumn, ListTable } from '@/components/lists/ListTable';
import { buildSelectionColumn, type ListSelectionHandlers } from '@/components/lists/selectionColumn';
import { ProjetStatusBadge } from '@/components/ui/status-badge';
import { formatMontant } from '@/lib/utils';
import type { Projet } from '@/types/projet.types';
import {
  ProjetPrioriteBadge,
  getProjetBudgetDisponible,
} from '@/components/projets/projet-ui';

interface ProjetsTableProps {
  projets: Projet[];
  onView: (projetId: string) => void;
  onEdit: (projet: Projet) => void;
  onDelete: (projet: Projet) => void;
  canEdit?: boolean;
  selection?: ListSelectionHandlers;
  stickyHeader?: boolean;
  stickyHeaderOffset?: number;
  scrollContainerClassName?: string;
  footer?: React.ReactNode;
}

export const ProjetsTable = ({
  projets,
  onView,
  onEdit,
  onDelete,
  canEdit = true,
  selection,
  stickyHeader = false,
  stickyHeaderOffset = 0,
  scrollContainerClassName,
  footer,
}: ProjetsTableProps) => {
  const columns = useMemo<ListColumn<Projet>[]>(() => {
    const baseColumns: ListColumn<Projet>[] = [
      ...(selection
        ? [
            buildSelectionColumn<Projet>({
              selection,
              getLabel: (projet) => `Sélectionner le projet ${projet.code}`,
              allLabel: 'Sélectionner tous les projets de la page',
            }),
          ]
        : []),
      {
        id: 'code',
        header: 'Code',
        render: (projet) => (
          <Link
            to={`/app/projets/${projet.id}`}
            className="font-mono text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded"
            onClick={(event) => {
              if (
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              ) {
                return;
              }
              event.preventDefault();
              onView(projet.id);
            }}
          >
            {projet.code}
          </Link>
        ),
      },
      {
        id: 'nom',
        header: 'Nom',
        cellClassName: 'max-w-[240px]',
        render: (projet) => (
          <button
            type="button"
            className="truncate text-left font-medium text-primary underline-offset-4 hover:underline"
            onClick={() => onView(projet.id)}
          >
            {projet.nom}
          </button>
        ),
      },
      {
        id: 'responsable',
        header: 'Responsable',
        render: (projet) => projet.responsable || '—',
      },
      {
        id: 'budget',
        header: 'Budget',
        render: (projet) => {
          const disponible = getProjetBudgetDisponible(projet);
          return (
            <div className="text-sm">
              <div className="font-medium">{formatMontant(projet.budgetAlloue)}</div>
              <div className="text-xs text-muted-foreground">
                Engagé: {formatMontant(projet.budgetEngage)}
              </div>
              <div className="text-xs text-muted-foreground">
                Dispo: {formatMontant(disponible)}
              </div>
            </div>
          );
        },
      },
      {
        id: 'avancement',
        header: 'Avancement',
        render: (projet) => (
          <div className="w-28 space-y-1">
            <Progress value={projet.tauxAvancement} className="h-2" />
            <div className="text-center text-xs text-muted-foreground">{projet.tauxAvancement}%</div>
          </div>
        ),
      },
      {
        id: 'statut',
        header: 'Statut',
        render: (projet) => <ProjetStatusBadge status={projet.statut} />,
      },
      {
        id: 'priorite',
        header: 'Priorité',
        render: (projet) => <ProjetPrioriteBadge priorite={projet.priorite} />,
      },
      {
        id: 'dates',
        header: 'Dates',
        render: (projet) => (
          <div className="text-sm text-muted-foreground">
            <div>{format(new Date(projet.dateDebut), 'dd/MM/yyyy')}</div>
            <div>{format(new Date(projet.dateFin), 'dd/MM/yyyy')}</div>
          </div>
        ),
      },
    ];

    if (!canEdit) return baseColumns;

    return [
      ...baseColumns,
      {
        id: 'actions',
        header: 'Actions',
        align: 'right',
        cellClassName: 'text-right w-[70px]',
        render: (projet) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(projet)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(projet)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ];
  }, [canEdit, onDelete, onEdit, onView, selection]);

  return (
    <ListTable
      items={projets}
      columns={columns}
      getRowId={(projet) => projet.id}
      onRowDoubleClick={(projet) => onView(projet.id)}
      emptyMessage="Aucun projet trouvé"
      stickyHeader={stickyHeader}
      stickyHeaderOffset={stickyHeaderOffset}
      scrollContainerClassName={scrollContainerClassName}
      footer={footer}
    />
  );
};
