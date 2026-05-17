import { useMemo } from 'react';
import { useMatch, useNavigate, useParams } from 'react-router-dom';
import { ArrowDownCircle, ArrowUpCircle, Plus, Scale, Unplug } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { OperationTresorerieTable } from '@/components/tresorerie/OperationTresorerieTable';
import { OperationTresorerieForm } from '@/components/tresorerie/OperationTresorerieForm';
import { OperationTresorerieDetails } from '@/components/tresorerie/OperationTresorerieDetails';
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
  const navigate = useNavigate();
  const { operationId } = useParams<{ operationId: string }>();
  const { operations, stats, createOperation } = useOperationsTresorerie();
  const isCreateRoute = !!useMatch('/app/tresorerie/operations/create');
  const isDetailRoute = !!useMatch('/app/tresorerie/operations/:operationId');
  const selectedOperation = useMemo(
    () => (operationId ? operations.find((operation) => operation.id === operationId) || null : null),
    [operations, operationId]
  );

  const handleSubmit = async (data: import('@/types/operation-tresorerie.types').OperationTresorerieFormData) => {
    const created = await createOperation(data);
    if (created?.id) {
      navigate(`/app/tresorerie/operations/${created.id}`);
      return;
    }
    navigate('/app/tresorerie/operations');
  };

  if (isDetailRoute && operationId && !selectedOperation) {
    return <div className="text-center text-muted-foreground">Chargement de l'opération...</div>;
  }

  if (isCreateRoute) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Nouvelle opération de trésorerie"
          description="Enregistrez un encaissement, un décaissement ou un transfert."
          sticky={false}
          actions={<Button variant="outline" onClick={() => navigate('/app/tresorerie/operations')}>Retour aux opérations</Button>}
        />
        <OperationTresorerieForm onSubmit={handleSubmit} onCancel={() => navigate('/app/tresorerie/operations')} submitLabel="Créer l'opération" />
      </div>
    );
  }

  if (isDetailRoute && selectedOperation) {
    return <OperationTresorerieDetails operation={selectedOperation} onClose={() => navigate('/app/tresorerie/operations')} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Opérations de trésorerie"
        description="Mouvements de caisse et de banque, transferts et régularisations"
        sticky={false}
        actions={
          <Button onClick={() => navigate('/app/tresorerie/operations/create')}>
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
          <OperationTresorerieTable operations={operations} onViewDetails={(id) => navigate(`/app/tresorerie/operations/${id}`)} />
        </CardContent>
      </Card>
    </div>
  );
};

export default TresorerieOperations;
