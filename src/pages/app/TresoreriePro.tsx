import { PageHeader } from '@/components/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wallet, ArrowDownUp, Plus, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useComptesTresorerie } from '@/hooks/useComptesTresorerie';
import { useRecettes } from '@/hooks/useRecettes';
import { useOperationsTresorerie } from '@/hooks/useOperationsTresorerie';
import { StatsCard } from '@/components/ui/stats-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';

const TresoreriePro = () => {
  const { stats: comptesStats, comptes } = useComptesTresorerie();
  const { stats: recettesStats } = useRecettes();
  const { stats: operationsStats } = useOperationsTresorerie();
  const [activeTab, setActiveTab] = useState('comptes');

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(montant);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion de Trésorerie"
        description="Suivi professionnel des comptes bancaires et caisses"
      />
      
      <div className="px-8 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Solde Total"
            value={formatMontant(comptesStats?.soldeTotal || 0)}
            icon={Wallet}
          />
          <StatsCard
            title="Encaissements"
            value={formatMontant(recettesStats?.montantCeMois || 0)}
            icon={TrendingUp}
            trend="Ce mois"
            color="text-green-600"
          />
          <StatsCard
            title="Décaissements"
            value={formatMontant(operationsStats?.montantDecaissements || 0)}
            icon={ArrowDownUp}
            trend="Exercice en cours"
            color="text-red-600"
          />
          <StatsCard
            title="Comptes Actifs"
            value={`${comptesStats?.nombreTotal || 0}`}
            icon={Wallet}
            trend={`${comptesStats?.nombreBanques || 0} banques, ${comptesStats?.nombreCaisses || 0} caisses`}
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="comptes">Comptes</TabsTrigger>
            <TabsTrigger value="operations">Opérations</TabsTrigger>
            <TabsTrigger value="recettes">Recettes</TabsTrigger>
            <TabsTrigger value="rapprochement">Rapprochement</TabsTrigger>
          </TabsList>

          <TabsContent value="comptes">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Comptes de Trésorerie</CardTitle>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Nouveau Compte
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {comptes.map((compte) => (
                    <div key={compte.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">{compte.libelle}</div>
                        <div className="text-sm text-muted-foreground">{compte.code} • {compte.type}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatMontant(compte.soldeActuel)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="operations">
            <Card>
              <CardHeader>
                <CardTitle>Journal des Opérations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Liste des opérations à venir...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recettes">
            <Card>
              <CardHeader>
                <CardTitle>Encaissements</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Gestion des recettes à venir...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rapprochement">
            <Card>
              <CardHeader>
                <CardTitle>Rapprochement Bancaire</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Interface de rapprochement à venir...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TresoreriePro;
