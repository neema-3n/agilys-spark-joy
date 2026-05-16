import { useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Plus, Scale, Unplug } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { OperationTresorerieTable } from '@/components/tresorerie/OperationTresorerieTable';
import { OperationTresorerieDialog } from '@/components/tresorerie/OperationTresorerieDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCard } from '@/components/ui/stats-card';
import { useOperationsTresorerie } from '@/hooks/useOperationsTresorerie';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
  }).format(value);

const TresorerieOperations = () => {
  const { operations, stats, createOperation } = useOperationsTresorerie();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Opérations de trésorerie"
        description="Mouvements de caisse et de banque, transferts et régularisations"
        sticky={false}
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle opération
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard title="Encaissements" value={formatCurrency(stats?.montantEncaissements || 0)} icon={ArrowDownCircle} />
        <StatsCard title="Décaissements" value={formatCurrency(stats?.montantDecaissements || 0)} icon={ArrowUpCircle} />
        <StatsCard title="Solde net" value={formatCurrency(stats?.soldeNet || 0)} icon={Scale} />
        <StatsCard title="Non rapprochées" value={`${stats?.operationsNonRapprochees || 0}`} icon={Unplug} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Journal des opérations</CardTitle>
        </CardHeader>
        <CardContent>
          <OperationTresorerieTable operations={operations} />
        </CardContent>
      </Card>

      <OperationTresorerieDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={async (data) => {
          await createOperation(data);
        }}
      />
    </div>
  );
};

export default TresorerieOperations;
