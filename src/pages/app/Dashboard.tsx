import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, AlertCircle, FileText } from 'lucide-react';

const Dashboard = () => {
  const { currentClient } = useClient();
  const { currentExercice } = useExercice();

  const stats = [
    {
      title: 'Budget Total',
      value: '150 000 000 XOF',
      icon: DollarSign,
      trend: '+12.5%',
      color: 'text-blue-500'
    },
    {
      title: 'Engagé',
      value: '65 000 000 XOF',
      icon: TrendingUp,
      trend: '43.3%',
      color: 'text-green-500'
    },
    {
      title: 'Disponible',
      value: '85 000 000 XOF',
      icon: FileText,
      trend: '56.7%',
      color: 'text-purple-500'
    },
    {
      title: 'Alertes',
      value: '3',
      icon: AlertCircle,
      trend: 'En attente',
      color: 'text-orange-500'
    }
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Tableau de Bord</h1>
        <p className="text-muted-foreground">
          {currentClient?.nom} - Exercice {currentExercice?.annee}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-1">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.trend}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Exécution Budgétaire</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Graphique à venir
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Derniers Engagements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Liste à venir
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
