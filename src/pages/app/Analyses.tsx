import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Analyses = () => {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Analyses Financières</h1>
        <p className="text-muted-foreground">
          Analyses avancées et indicateurs de performance
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module en construction</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Le module d'analyses financières sera développé prochainement.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analyses;
