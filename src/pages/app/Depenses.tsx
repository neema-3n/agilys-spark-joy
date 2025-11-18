import { PageHeader } from '@/components/PageHeader';
import { DepensesStats } from '@/components/depenses/DepensesStats';
import { DepensesTable } from '@/components/depenses/DepensesTable';
import { useLignesBudgetaires } from '@/hooks/useLignesBudgetaires';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const Depenses = () => {
  const { lignes, isLoading } = useLignesBudgetaires();

  // Calculer les alertes
  const lignesEnDepassement = lignes.filter(ligne => ligne.disponible < 0);
  const lignesEnAlerte = lignes.filter(ligne => {
    const budget = ligne.montantModifie || ligne.montantInitial;
    return budget > 0 && ligne.disponible >= 0 && (ligne.disponible / budget) < 0.1;
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Gestion des Dépenses</h1>
          <p className="text-muted-foreground">
            Vérification automatique des plafonds
          </p>
        </div>
        <div className="text-center py-12 text-muted-foreground">
          Chargement des données...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des Dépenses"
        description="Suivi en temps réel et vérification automatique des plafonds budgétaires"
      />

      {/* Alertes en haut de page */}
      {lignesEnDepassement.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Dépassements budgétaires détectés</AlertTitle>
          <AlertDescription>
            {lignesEnDepassement.length} ligne{lignesEnDepassement.length > 1 ? 's' : ''} budgétaire{lignesEnDepassement.length > 1 ? 's' : ''} en dépassement. 
            Consultez le tableau ci-dessous pour plus de détails.
          </AlertDescription>
        </Alert>
      )}

      {lignesEnAlerte.length > 0 && lignesEnDepassement.length === 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Lignes budgétaires à surveiller</AlertTitle>
          <AlertDescription>
            {lignesEnAlerte.length} ligne{lignesEnAlerte.length > 1 ? 's' : ''} budgétaire{lignesEnAlerte.length > 1 ? 's' : ''} avec moins de 10% de disponible.
          </AlertDescription>
        </Alert>
      )}

      {/* Statistiques */}
      <DepensesStats lignesBudgetaires={lignes} />

      {/* Tableau des lignes budgétaires */}
      <DepensesTable lignesBudgetaires={lignes} />

      {/* Informations complémentaires */}
      <Card>
        <CardHeader>
          <CardTitle>Légende et Règles de Contrôle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Statuts des lignes budgétaires :</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                <span><strong className="text-destructive">Dépassement :</strong> Le disponible est négatif. Aucune nouvelle dépense ne peut être engagée.</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5" />
                <span><strong className="text-orange-600">Alerte :</strong> Moins de 10% du budget disponible. Attention aux nouveaux engagements.</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-4 w-4 rounded-full bg-secondary mt-0.5" />
                <span><strong>Normal :</strong> Plus de 10% du budget disponible.</span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Calcul du disponible :</h4>
            <p className="text-sm text-muted-foreground">
              Disponible = Budget - (Engagé + Réservé)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Depenses;
