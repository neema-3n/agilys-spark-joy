import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Parametres = () => {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Paramètres</h1>
        <p className="text-muted-foreground">
          Configuration de l'application
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module en construction</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Le module de paramètres sera développé prochainement.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Parametres;
