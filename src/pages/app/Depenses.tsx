import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Depenses = () => {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Gestion des Dépenses</h1>
        <p className="text-muted-foreground">
          Vérification automatique des plafonds
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module en construction</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Le module de gestion des dépenses sera développé prochainement.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Depenses;
