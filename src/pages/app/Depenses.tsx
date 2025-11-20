import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { DepenseStatsCards } from '@/components/depenses/DepensesStats';
import { DepenseTable } from '@/components/depenses/DepenseTable';
import { DepenseDialog } from '@/components/depenses/DepenseDialog';
import { useDepenses } from '@/hooks/useDepenses';
import type { DepenseFormData } from '@/types/depense.types';

const Depenses = () => {
  const { depenses, isLoading, createDepense } = useDepenses();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleCreateDepense = async (data: DepenseFormData) => {
    await createDepense(data);
    setIsDialogOpen(false);
  };

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
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle dépense
          </Button>
        }
      />

      <DepenseStatsCards depenses={depenses} />
      <DepenseTable depenses={depenses} />
      
      <DepenseDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleCreateDepense}
      />
    </div>
  );
};

export default Depenses;
