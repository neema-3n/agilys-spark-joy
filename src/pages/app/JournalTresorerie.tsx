import { useMemo, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, ListOrdered, Unplug } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCard } from '@/components/ui/stats-card';
import { ListToolbar } from '@/components/lists/ListToolbar';
import { OperationTresorerieTable } from '@/components/tresorerie/OperationTresorerieTable';
import { useOperationsTresorerie } from '@/hooks/useOperationsTresorerie';
import { formatCurrency } from '@/lib/utils';

const JournalTresorerie = () => {
  const { operations, stats } = useOperationsTresorerie();
  const [searchValue, setSearchValue] = useState('');

  const filteredOperations = useMemo(() => {
    const term = searchValue.trim().toLowerCase();
    if (!term) return operations;

    return operations.filter((operation) =>
      [
        operation.numero,
        operation.libelle,
        operation.compte?.code,
        operation.compte?.libelle,
        operation.typeOperation,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term)),
    );
  }, [operations, searchValue]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journal de trésorerie"
        description="Vue globale de pilotage et d'audit sur l'ensemble des mouvements de trésorerie"
        sticky={false}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard title="Mouvements" value={`${stats?.nombreTotal || 0}`} icon={ListOrdered} />
        <StatsCard title="Encaissements" value={formatCurrency(stats?.montantEncaissements || 0)} icon={ArrowDownCircle} />
        <StatsCard title="Décaissements" value={formatCurrency(stats?.montantDecaissements || 0)} icon={ArrowUpCircle} />
        <StatsCard title="Non rapprochées" value={`${stats?.operationsNonRapprochees || 0}`} icon={Unplug} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registre global</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ListToolbar
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            searchPlaceholder="Rechercher par numéro, libellé ou compte..."
          />
          <OperationTresorerieTable operations={filteredOperations} />
        </CardContent>
      </Card>
    </div>
  );
};

export default JournalTresorerie;
