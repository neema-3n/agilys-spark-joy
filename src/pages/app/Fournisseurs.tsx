import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Fournisseurs = () => {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Gestion des Fournisseurs</h1>
        <p className="text-muted-foreground">
          Référentiel fournisseurs et suivi des contrats
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module en construction</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Le module de gestion des fournisseurs sera développé prochainement.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Fournisseurs;
