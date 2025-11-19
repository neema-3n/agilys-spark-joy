import { PageHeader } from '@/components/PageHeader';
import { DepenseStatsCards } from '@/components/depenses/DepensesStats';
import { DepenseTable } from '@/components/depenses/DepenseTable';
import { useDepenses } from '@/hooks/useDepenses';

const Depenses = () => {
  const { depenses, isLoading } = useDepenses();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Gestion des Dépenses"
          description="Ordonnancement et liquidation des dépenses"
        />
        <p className="text-center text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des Dépenses"
        description="Ordonnancement et liquidation des dépenses"
      />

      <DepenseStatsCards depenses={depenses} />
      <DepenseTable depenses={depenses} />
    </div>
  );
};

export default Depenses;
