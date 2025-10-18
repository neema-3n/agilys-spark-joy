import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const PlanComptable = () => {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Plan Comptable</h1>
        <p className="text-muted-foreground">
          Import et structuration hiérarchique du plan comptable
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module en construction</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Le module de plan comptable sera développé prochainement.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlanComptable;
