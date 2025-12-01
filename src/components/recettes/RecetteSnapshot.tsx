import { SnapshotBase } from '@/components/shared/SnapshotBase';
import type { Recette } from '@/types/recette.types';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle } from 'lucide-react';

interface RecetteSnapshotProps {
  recette: Recette | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAnnuler?: (recette: Recette) => void;
}

export const RecetteSnapshot = ({
  recette,
  open,
  onOpenChange,
  onAnnuler,
}: RecetteSnapshotProps) => {
  if (!recette || !open) return null;

  const actions =
    recette.statut === 'validee' && onAnnuler ? (
      <Button
        variant="destructive"
        size="sm"
        onClick={() => onAnnuler(recette)}
      >
        <XCircle className="mr-2 h-4 w-4" />
        Annuler la recette
      </Button>
    ) : undefined;

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <SnapshotBase
        title={`Recette ${recette.numero}`}
        subtitle={recette.libelle}
        currentIndex={0}
        totalCount={1}
        hasPrev={false}
        hasNext={false}
        onClose={() => onOpenChange(false)}
        onNavigate={() => {}}
        actions={actions}
      >
        <Card>
          <CardHeader>
            <CardTitle>Informations principales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Numéro</p>
                <p className="font-medium">{recette.numero}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Date de recette</p>
                <p className="font-medium">
                  {format(new Date(recette.dateRecette), 'dd MMMM yyyy', { locale: fr })}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Montant</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(recette.montant)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Statut</p>
                <Badge variant={recette.statut === 'validee' ? 'default' : 'destructive'}>
                  {recette.statut === 'validee' ? 'Validée' : 'Annulée'}
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Source</p>
                <p className="font-medium">{recette.sourceRecette}</p>
              </div>
              {recette.categorie && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Catégorie</p>
                  <p className="font-medium">{recette.categorie}</p>
                </div>
              )}
              {recette.compteDestination && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Compte de destination</p>
                  <p className="font-medium">
                    {recette.compteDestination.code} - {recette.compteDestination.libelle}
                  </p>
                </div>
              )}
              {recette.beneficiaire && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Bénéficiaire</p>
                  <p className="font-medium">{recette.beneficiaire}</p>
                </div>
              )}
              {recette.reference && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Référence</p>
                  <p className="font-medium">{recette.reference}</p>
                </div>
              )}
            </div>

            {recette.observations && (
              <div className="space-y-1 pt-4 border-t">
                <p className="text-sm text-muted-foreground">Observations</p>
                <p className="text-sm">{recette.observations}</p>
              </div>
            )}

            {recette.statut === 'annulee' && recette.motifAnnulation && (
              <div className="space-y-1 pt-4 border-t border-destructive">
                <p className="text-sm text-destructive font-medium">Motif d'annulation</p>
                <p className="text-sm text-destructive">{recette.motifAnnulation}</p>
                {recette.dateAnnulation && (
                  <p className="text-xs text-muted-foreground">
                    Annulée le {format(new Date(recette.dateAnnulation), 'dd MMMM yyyy', { locale: fr })}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </SnapshotBase>
    </div>
  );
};
