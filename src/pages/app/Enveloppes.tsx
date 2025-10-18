import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Enveloppes = () => {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Enveloppes & Financement</h1>
        <p className="text-muted-foreground">
          Sources de financement par bailleur, projet et ligne
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module en construction</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Le module de gestion des enveloppes et financement sera développé prochainement.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Enveloppes;
