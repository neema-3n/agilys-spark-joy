import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExecutionBudgetaireReport } from '@/components/reporting/ExecutionBudgetaireReport';
import { EtatsFinanciersReport } from '@/components/reporting/EtatsFinanciersReport';
import { DSFReport } from '@/components/reporting/DSFReport';
import { Button } from '@/components/ui/button';
import { useTresorerie } from '@/hooks/useTresorerie';
import { BookOpen, FileText, Landmark, TrendingUp, WalletCards } from 'lucide-react';

const Reporting = () => {
  const navigate = useNavigate();
  const { reportType } = useParams();
  const activeTab = reportType || 'budgetaire';
  const { stats: tresorerieStats } = useTresorerie();

  const formatMontant = (value: number) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(value);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reporting"
        description="États budgétaires, financiers, comptables, trésorerie et réglementaires"
        sticky={false}
      />
      
      <div>
        <Tabs
          value={activeTab}
          onValueChange={(value) => navigate(`/app/reporting/${value}`)}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-2 gap-2 md:grid-cols-5">
            <TabsTrigger value="budgetaire" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span>Budgétaire</span>
            </TabsTrigger>
            <TabsTrigger value="financier" className="flex items-center gap-2">
              <Landmark className="h-4 w-4" />
              <span>Financier</span>
            </TabsTrigger>
            <TabsTrigger value="comptable" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span>Comptable</span>
            </TabsTrigger>
            <TabsTrigger value="tresorerie" className="flex items-center gap-2">
              <WalletCards className="h-4 w-4" />
              <span>Trésorerie</span>
            </TabsTrigger>
            <TabsTrigger value="reglementaire" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Réglementaire</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="budgetaire" className="space-y-6">
            <ExecutionBudgetaireReport />
          </TabsContent>

          <TabsContent value="financier" className="space-y-6">
            <EtatsFinanciersReport />
          </TabsContent>

          <TabsContent value="comptable" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Reporting comptable</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Accédez aux états comptables détaillés et au journal comptable.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button asChild>
                    <Link to="/app/journal-comptable">Ouvrir le journal comptable</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/app/plan-comptable">Ouvrir le plan comptable</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tresorerie" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Solde actuel</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">
                    {formatMontant(tresorerieStats?.soldeActuel || 0)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Encaissements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold text-emerald-600">
                    {formatMontant(tresorerieStats?.totalEncaissements || 0)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Décaissements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold text-rose-600">
                    {formatMontant(tresorerieStats?.totalDecaissements || 0)}
                  </div>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Reporting trésorerie</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Vue transversale sur les flux de trésorerie et accès au journal global.
                </p>
                <Button asChild>
                  <Link to="/app/journal-tresorerie">Ouvrir le journal de trésorerie</Link>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reglementaire" className="space-y-6">
            <DSFReport />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Reporting;
