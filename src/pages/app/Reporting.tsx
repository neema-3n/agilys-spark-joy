import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Reporting = () => {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Reporting</h1>
        <p className="text-muted-foreground">
          Exécution budgétaire, DSF et états financiers
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module en construction</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Le module de reporting sera développé prochainement.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reporting;
