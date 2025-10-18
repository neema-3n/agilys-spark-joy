import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Mandats = () => {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Gestion des Mandats</h1>
        <p className="text-muted-foreground">
          Ordonnancement et validation des mandats de paiement
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module en construction</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Le module de gestion des mandats sera développé prochainement.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Mandats;
