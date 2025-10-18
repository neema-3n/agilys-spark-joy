import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Projets = () => {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Projets & Analytique</h1>
        <p className="text-muted-foreground">
          Suivi financier multi-projet avec axe analytique
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module en construction</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Le module de gestion des projets et analytique sera développé prochainement.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Projets;
