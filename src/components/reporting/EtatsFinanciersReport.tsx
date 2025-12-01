import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEcrituresComptables } from '@/hooks/useEcrituresComptables';
import { useTresorerie } from '@/hooks/useTresorerie';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

export const EtatsFinanciersReport = () => {
  const { stats: ecrituresStats } = useEcrituresComptables();
  const { stats: tresorerieStats } = useTresorerie();

  const formatMontant = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const balanceData = [
    {
      name: 'Comptable',
      Débits: ecrituresStats?.montantTotalDebit || 0,
      Crédits: ecrituresStats?.montantTotalCredit || 0,
    },
  ];

  const tresorerieData = [
    { name: 'Encaissements', value: tresorerieStats?.totalEncaissements || 0 },
    { name: 'Décaissements', value: tresorerieStats?.totalDecaissements || 0 },
  ];

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))'];

  const balanceChartConfig = {
    Débits: { label: 'Débits', color: 'hsl(var(--chart-1))' },
    Crédits: { label: 'Crédits', color: 'hsl(var(--chart-2))' },
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Débits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMontant(ecrituresStats?.montantTotalDebit || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Crédits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMontant(ecrituresStats?.montantTotalCredit || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Solde Trésorerie</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMontant(tresorerieStats?.soldeActuel || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Écritures Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ecrituresStats?.nombreTotal || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Balance Comptable</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={balanceChartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={balanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line type="monotone" dataKey="Débits" stroke="var(--color-Débits)" strokeWidth={2} />
                  <Line type="monotone" dataKey="Crédits" stroke="var(--color-Crédits)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Répartition Trésorerie</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tresorerieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${formatMontant(entry.value)}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {tresorerieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatMontant(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Détail des Opérations Comptables</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {ecrituresStats?.parTypeOperation && Object.entries(ecrituresStats.parTypeOperation).map(([type, data]: [string, any]) => (
              <div key={type} className="flex justify-between items-center border-b pb-2">
                <div>
                  <div className="font-medium capitalize">{type.replace('_', ' ')}</div>
                  <div className="text-sm text-muted-foreground">{data.nombre} opérations</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatMontant(data.montant)}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
