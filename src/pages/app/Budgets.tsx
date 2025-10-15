import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Budgets = () => {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Gestion des Budgets</h1>
        <p className="text-muted-foreground">
          Plan budgétaire, modifications et suivi
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module en construction</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Le module de gestion des budgets sera développé prochainement.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Budgets;
