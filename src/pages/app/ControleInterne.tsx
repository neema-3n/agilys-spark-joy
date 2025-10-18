import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ControleInterne = () => {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Contrôle Interne</h1>
        <p className="text-muted-foreground">
          Audits, workflows d'approbation et traçabilité
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module en construction</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Le module de contrôle interne sera développé prochainement.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ControleInterne;
