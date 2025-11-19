import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { DepenseStatsCards } from '@/components/depenses/DepensesStats';
import { DepenseTable } from '@/components/depenses/DepenseTable';
import { DepenseDialog } from '@/components/depenses/DepenseDialog';
import { useDepenses } from '@/hooks/useDepenses';
import type { DepenseFormData, Depense } from '@/types/depense.types';
import { toast } from '@/hooks/use-toast';

const Depenses = () => {
  const { depenses, isLoading, createDepense, updateDepense } = useDepenses();
  const [depenseDialogOpen, setDepenseDialogOpen] = useState(false);
  const [selectedDepense, setSelectedDepense] = useState<Depense | undefined>();

  const handleSaveDepense = async (data: DepenseFormData) => {
    try {
      if (selectedDepense) {
        await updateDepense({ id: selectedDepense.id, updates: data });
        toast({
          title: 'Succès',
          description: 'Dépense modifiée avec succès',
        });
      } else {
        await createDepense(data);
        toast({
          title: 'Succès',
          description: 'Dépense créée avec succès',
        });
      }
      setDepenseDialogOpen(false);
      setSelectedDepense(undefined);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
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
      
      <DepenseDialog
        open={depenseDialogOpen}
        onOpenChange={(open) => {
          setDepenseDialogOpen(open);
          if (!open) setSelectedDepense(undefined);
        }}
        onSave={handleSaveDepense}
        depense={selectedDepense}
      />
    </div>
  );
};

export default Depenses;
