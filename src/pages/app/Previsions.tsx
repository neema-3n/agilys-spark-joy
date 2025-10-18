import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Previsions = () => {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Prévisions Budgétaires</h1>
        <p className="text-muted-foreground">
          Projections pluriannuelles et scénarios budgétaires
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module en construction</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Le module de prévisions budgétaires sera développé prochainement.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Previsions;
