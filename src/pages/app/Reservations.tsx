import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Reservations = () => {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Réservation de Crédits</h1>
        <p className="text-muted-foreground">
          Blocage préalable avec traçabilité complète
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module en construction</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Le module de réservation de crédits sera développé prochainement.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reservations;
