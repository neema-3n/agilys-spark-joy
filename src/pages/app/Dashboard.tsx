import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCard } from '@/components/ui/stats-card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, FileText, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MOCK_ENGAGEMENTS } from '@/services/mockData/engagements.mock';

const executionData = [
  { mois: 'Jan', budget: 12000000, engage: 8000000, paye: 6000000 },
  { mois: 'Fév', budget: 12000000, engage: 9500000, paye: 7200000 },
  { mois: 'Mar', budget: 12000000, engage: 11000000, paye: 8500000 },
  { mois: 'Avr', budget: 12000000, engage: 10500000, paye: 9000000 },
  { mois: 'Mai', budget: 12000000, engage: 9000000, paye: 7800000 },
  { mois: 'Juin', budget: 12000000, engage: 11500000, paye: 9500000 },
];

const getStatusVariant = (statut: string) => {
  switch (statut) {
    case 'valide':
      return 'success';
    case 'engage':
      return 'secondary';
    case 'en_attente':
      return 'warning';
    case 'brouillon':
      return 'outline';
    default:
      return 'default';
  }
};

const getStatusLabel = (statut: string) => {
  switch (statut) {
    case 'valide':
      return 'Validé';
    case 'engage':
      return 'Engagé';
    case 'en_attente':
      return 'En attente';
    case 'brouillon':
      return 'Brouillon';
    case 'rejete':
      return 'Rejeté';
    default:
      return statut;
  }
};

const Dashboard = () => {
  const { currentClient } = useClient();
  const { currentExercice } = useExercice();

  const stats = [
    {
      title: 'Budget Total',
      value: '150 000 000 XOF',
      icon: DollarSign,
      trend: '+12.5% vs année précédente',
      trendUp: true,
      color: 'text-primary'
    },
    {
      title: 'Engagements',
      value: '89 500 000 XOF',
      icon: TrendingUp,
      trend: '59.7% du budget',
      trendUp: true,
      color: 'text-secondary'
    },
    {
      title: 'Factures Payées',
      value: '56 000 000 XOF',
      icon: FileText,
      trend: '37.3% du budget',
      trendUp: false,
      color: 'text-accent'
    },
    {
      title: 'En Attente',
      value: '33 500 000 XOF',
      icon: AlertCircle,
      trend: '22.3% à traiter',
      trendUp: false,
      color: 'text-destructive'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Tableau de Bord</h1>
        <p className="text-muted-foreground mt-2">
          {currentClient?.nom} - {currentExercice?.libelle}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatsCard
            key={index}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            trend={stat.trend}
            trendUp={stat.trendUp}
            color={stat.color}
          />
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Execution Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Exécution Budgétaire</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={executionData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis 
                  dataKey="mois" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  formatter={(value) => `${(value as number).toLocaleString()} XOF`}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                    color: 'hsl(var(--card-foreground))'
                  }}
                />
                <Legend 
                  wrapperStyle={{
                    color: 'hsl(var(--foreground))'
                  }}
                />
                <Bar dataKey="budget" fill="hsl(var(--primary))" name="Budget" />
                <Bar dataKey="engage" fill="hsl(var(--secondary))" name="Engagé" />
                <Bar dataKey="paye" fill="hsl(var(--accent))" name="Payé" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Latest Engagements */}
        <Card>
          <CardHeader>
            <CardTitle>Derniers Engagements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {MOCK_ENGAGEMENTS.slice(0, 5).map((eng) => (
                <div key={eng.id} className="flex items-start justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{eng.objet}</p>
                    <p className="text-sm text-muted-foreground truncate">{eng.beneficiaire}</p>
                    <p className="text-xs text-muted-foreground mt-1">{eng.numero}</p>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <p className="font-semibold text-foreground whitespace-nowrap">
                      {eng.montant.toLocaleString()} XOF
                    </p>
                    <Badge variant={getStatusVariant(eng.statut)} className="mt-1">
                      {getStatusLabel(eng.statut)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
