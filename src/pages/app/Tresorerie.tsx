import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TresorerieStats } from '@/components/tresorerie/TresorerieStats';
import { FluxTresorerieTable } from '@/components/tresorerie/FluxTresorerieTable';
import { PrevisionsTresorerie } from '@/components/tresorerie/PrevisionsTresorerie';
import { useTresorerie } from '@/hooks/useTresorerie';
import { Loader2, Activity } from 'lucide-react';

const Tresorerie = () => {
  const { stats, flux, previsions, isLoading, error } = useTresorerie();

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Gestion de Trésorerie"
          description="Suivi des flux et prévisions de trésorerie"
        />
        <div className="px-8">
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <p className="text-destructive">
                  Erreur lors du chargement des données de trésorerie
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion de Trésorerie"
        description="Suivi des flux et prévisions de trésorerie"
      />
      
      <div className="px-8 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <TresorerieStats stats={stats} />

            <Tabs defaultValue="flux" className="space-y-4">
              <TabsList>
                <TabsTrigger value="flux">
                  <Activity className="h-4 w-4 mr-2" />
                  Flux de Trésorerie
                </TabsTrigger>
                <TabsTrigger value="previsions">Prévisions</TabsTrigger>
              </TabsList>

              <TabsContent value="flux" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Historique des Flux</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FluxTresorerieTable flux={flux} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="previsions" className="space-y-4">
                <PrevisionsTresorerie previsions={previsions} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
};

export default Tresorerie;
