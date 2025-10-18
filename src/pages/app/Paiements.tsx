import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Paiements = () => {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Gestion des Paiements</h1>
        <p className="text-muted-foreground">
          Exécution des paiements et rapprochements bancaires
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module en construction</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Le module de gestion des paiements sera développé prochainement.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Paiements;
