import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Factures = () => {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Gestion des Factures</h1>
        <p className="text-muted-foreground">
          Saisie, validation et paiement des factures
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module en construction</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Le module de gestion des factures sera développé prochainement.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Factures;
