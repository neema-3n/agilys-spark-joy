import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Structure = () => {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Structure Organisationnelle</h1>
        <p className="text-muted-foreground">
          Gestion des entités, services et centres de coûts
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module en construction</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Le module de structure organisationnelle sera développé prochainement.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Structure;
