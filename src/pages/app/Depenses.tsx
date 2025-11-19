import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { DepenseStatsCards } from '@/components/depenses/DepensesStats';
import { DepenseTable } from '@/components/depenses/DepenseTable';
import { useDepenses } from '@/hooks/useDepenses';

const Depenses = () => {
  const { depenses, isLoading } = useDepenses();
  const [depenseDialogOpen, setDepenseDialogOpen] = useState(false);

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
        actions={
          <Button onClick={() => setDepenseDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle dépense
          </Button>
        }
      />

      <DepenseStatsCards depenses={depenses} />
      <DepenseTable depenses={depenses} />
    </div>
  );
};

export default Depenses;
