import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Tresorerie = () => {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Gestion de Trésorerie</h1>
        <p className="text-muted-foreground">
          Tableau de flux et prévisions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module en construction</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Le module de gestion de trésorerie sera développé prochainement.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Tresorerie;
