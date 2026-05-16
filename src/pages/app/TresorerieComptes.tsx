import { useState } from 'react';
import { Landmark, Plus, Wallet, WalletCards } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { CompteTresorerieTable } from '@/components/tresorerie/CompteTresorerieTable';
import { CompteTresorerieDialog } from '@/components/tresorerie/CompteTresorerieDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatsCard } from '@/components/ui/stats-card';
import { useComptesTresorerie } from '@/hooks/useComptesTresorerie';
import type { CompteTresorerie } from '@/types/compte-tresorerie.types';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
  }).format(value);

const TresorerieComptes = () => {
  const { comptes, stats, isLoading, createCompte, updateCompte } = useComptesTresorerie();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompte, setEditingCompte] = useState<CompteTresorerie | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comptes de trésorerie"
        description="Gestion des comptes bancaires et caisses avec suivi des soldes"
        sticky={false}
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau compte
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard title="Solde total" value={formatCurrency(stats?.soldeTotal || 0)} icon={Wallet} />
        <StatsCard title="Banques" value={`${stats?.nombreBanques || 0}`} icon={Landmark} />
        <StatsCard title="Caisses" value={`${stats?.nombreCaisses || 0}`} icon={WalletCards} />
        <StatsCard title="Comptes actifs" value={`${stats?.nombreTotal || 0}`} icon={Wallet} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Référentiel des comptes</CardTitle>
        </CardHeader>
        <CardContent>
          <CompteTresorerieTable
            comptes={comptes}
            onEdit={(compte) => {
              setEditingCompte(compte);
              setDialogOpen(true);
            }}
          />
          {!isLoading && comptes.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aucun compte de trésorerie disponible.
            </p>
          )}
        </CardContent>
      </Card>

      <CompteTresorerieDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingCompte(null);
        }}
        onSubmit={async (data) => {
          if (editingCompte) {
            await updateCompte({ id: editingCompte.id, updates: data });
            return;
          }
          await createCompte(data);
        }}
        initialData={editingCompte || undefined}
        title={editingCompte ? 'Modifier le compte' : 'Nouveau compte de trésorerie'}
      />
    </div>
  );
};

export default TresorerieComptes;
