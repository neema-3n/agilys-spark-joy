import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const BonsCommande = () => {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Bons de Commande</h1>
        <p className="text-muted-foreground">
          Création et suivi des validations
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module en construction</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Le module de gestion des bons de commande sera développé prochainement.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BonsCommande;
