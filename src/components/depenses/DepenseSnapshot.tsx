import { FileText, Building2, ShoppingCart, Package, Calendar, Info, AlertCircle, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { Depense } from '@/types/depense.types';
import { SnapshotBase } from '@/components/shared/SnapshotBase';
import { formatMontant, formatDate, formatDateTime, getEntityUrl } from '@/lib/snapshot-utils';

interface DepenseSnapshotProps {
  depense: Depense;
  /** Ferme le snapshot (via le bouton X ou Escape) */
  onClose: () => void;
  /** Navigation entre snapshots */
  onNavigate: (direction: 'prev' | 'next') => void;
  hasPrev: boolean;
  hasNext: boolean;
  currentIndex: number;
  totalCount: number;
  
  /**
   * Éditer la dépense (statut brouillon uniquement).
   * NE DOIT PAS fermer le snapshot - le dialogue d'édition s'ouvrira par-dessus.
   */
  onEdit?: () => void;
  
  /** Valider la dépense */
  onValider?: () => void;
  
  /** Ordonnancer la dépense */
  onOrdonnancer?: () => void;
  
  /** Marquer la dépense comme payée */
  onMarquerPayee?: () => void;
  
  /** Annuler la dépense */
  onAnnuler?: () => void;
  
  /** Navigation vers une entité liée */
  onNavigateToEntity?: (type: string, id: string) => void;
}

export const DepenseSnapshot = ({
  depense,
  onClose,
  onNavigate,
  hasPrev,
  hasNext,
  currentIndex,
  totalCount,
  onEdit,
  onValider,
  onOrdonnancer,
  onMarquerPayee,
  onAnnuler,
  onNavigateToEntity,
}: DepenseSnapshotProps) => {
  const getStatutBadge = (statut: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      brouillon: 'outline',
      validee: 'secondary',
      ordonnancee: 'default',
      payee: 'default',
      annulee: 'destructive',
    };

    const labels: Record<string, string> = {
      brouillon: 'Brouillon',
      validee: 'Validée',
      ordonnancee: 'Ordonnancée',
      payee: 'Payée',
      annulee: 'Annulée',
    };

    return (
      <Badge variant={variants[statut] || 'default'}>
        {labels[statut] || statut}
      </Badge>
    );
  };

  const solde = depense.montant - depense.montantPaye;
  const progressionPaiement = depense.montant > 0 
    ? (depense.montantPaye / depense.montant) * 100 
    : 0;

  const handleEntityClick = (type: string, id: string) => {
    if (onNavigateToEntity) {
      onNavigateToEntity(type, id);
    } else {
      window.location.href = getEntityUrl(type, id);
    }
  };

  // Actions spécifiques aux dépenses
  const actions = (
    <>
      {depense.statut === 'brouillon' && onEdit && (
        <Button variant="outline" size="sm" onClick={onEdit}>
          Modifier
        </Button>
      )}
      {depense.statut === 'brouillon' && onValider && (
        <Button size="sm" onClick={onValider}>
          Valider
        </Button>
      )}
      {depense.statut === 'validee' && onOrdonnancer && (
        <Button size="sm" onClick={onOrdonnancer}>
          Ordonnancer
        </Button>
      )}
      {depense.statut === 'ordonnancee' && onMarquerPayee && (
        <Button size="sm" onClick={onMarquerPayee}>
          Marquer comme payée
        </Button>
      )}
      {(depense.statut === 'brouillon' || depense.statut === 'validee') && onAnnuler && (
        <Button variant="destructive" size="sm" onClick={onAnnuler}>
          Annuler
        </Button>
      )}
    </>
  );

  return (
    <SnapshotBase
      title={`Dépense ${depense.numero}`}
      subtitle={depense.objet}
      currentIndex={currentIndex}
      totalCount={totalCount}
      hasPrev={hasPrev}
      hasNext={hasNext}
      onClose={onClose}
      onNavigate={onNavigate}
      actions={actions}
    >
      {/* Informations principales */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">Informations générales</CardTitle>
            {getStatutBadge(depense.statut)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Date de dépense</div>
              <div className="font-medium">{formatDate(depense.dateDepense)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Montant</div>
              <div className="font-medium text-lg">{formatMontant(depense.montant)}</div>
            </div>
            {depense.dateValidation && (
              <div>
                <div className="text-sm text-muted-foreground">Date de validation</div>
                <div className="font-medium">{formatDate(depense.dateValidation)}</div>
              </div>
            )}
            {depense.dateOrdonnancement && (
              <div>
                <div className="text-sm text-muted-foreground">Date d'ordonnancement</div>
                <div className="font-medium">{formatDate(depense.dateOrdonnancement)}</div>
              </div>
            )}
            {depense.datePaiement && (
              <div>
                <div className="text-sm text-muted-foreground">Date de paiement</div>
                <div className="font-medium">{formatDate(depense.datePaiement)}</div>
              </div>
            )}
            {depense.beneficiaire && (
              <div>
                <div className="text-sm text-muted-foreground">Bénéficiaire</div>
                <div className="font-medium">{depense.beneficiaire}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Progression du paiement */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Banknote className="h-4 w-4" />
            Paiement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Montant payé</span>
              <span className="font-medium">
                {formatMontant(depense.montantPaye)} / {formatMontant(depense.montant)}
              </span>
            </div>
            <Progress value={progressionPaiement} className="h-2" />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Solde</span>
              <span className="font-medium">{formatMontant(solde)}</span>
            </div>
          </div>
          {depense.modePaiement && (
            <div className="pt-2 border-t">
              <div className="text-sm text-muted-foreground">Mode de paiement</div>
              <div className="font-medium capitalize">{depense.modePaiement}</div>
            </div>
          )}
          {depense.referencePaiement && (
            <div>
              <div className="text-sm text-muted-foreground">Référence</div>
              <div className="font-medium">{depense.referencePaiement}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Engagement lié */}
      {depense.engagement && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Engagement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <button
              onClick={() => handleEntityClick('engagement', depense.engagement!.id)}
              className="text-primary hover:underline font-medium"
            >
              {depense.engagement.numero}
            </button>
            <div className="text-sm text-muted-foreground mt-1">
              Montant: {formatMontant(depense.engagement.montant)}
              {depense.engagement.solde !== undefined && ` • Solde: ${formatMontant(depense.engagement.solde)}`}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Réservation liée */}
      {depense.reservationCredit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Réservation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <button
              onClick={() => handleEntityClick('reservation', depense.reservationCredit!.id)}
              className="text-primary hover:underline font-medium"
            >
              {depense.reservationCredit.numero}
            </button>
            <div className="text-sm text-muted-foreground mt-1">
              Montant: {formatMontant(depense.reservationCredit.montant)} • {depense.reservationCredit.statut}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Facture liée */}
      {depense.facture && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Facture
            </CardTitle>
          </CardHeader>
          <CardContent>
            <button
              onClick={() => handleEntityClick('facture', depense.facture!.id)}
              className="text-primary hover:underline font-medium"
            >
              {depense.facture.numero}
            </button>
            <div className="text-sm text-muted-foreground mt-1">
              Montant TTC: {formatMontant(depense.facture.montantTTC)} • {depense.facture.statut}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fournisseur */}
      {depense.fournisseur && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Fournisseur
            </CardTitle>
          </CardHeader>
          <CardContent>
            <button
              onClick={() => handleEntityClick('fournisseur', depense.fournisseur!.id)}
              className="text-primary hover:underline font-medium"
            >
              {depense.fournisseur.nom}
            </button>
            <div className="text-sm text-muted-foreground mt-1">
              Code: {depense.fournisseur.code}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ligne budgétaire */}
      {depense.ligneBudgetaire && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Ligne budgétaire
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-medium">{depense.ligneBudgetaire.libelle}</div>
            <div className="text-sm text-muted-foreground mt-1">
              Disponible: {formatMontant(depense.ligneBudgetaire.disponible)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Projet */}
      {depense.projet && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-4 w-4" />
              Projet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <button
              onClick={() => handleEntityClick('projet', depense.projet!.id)}
              className="text-primary hover:underline font-medium"
            >
              {depense.projet.nom}
            </button>
            <div className="text-sm text-muted-foreground mt-1">
              Code: {depense.projet.code}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Observations */}
      {depense.observations && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="h-4 w-4" />
              Observations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{depense.observations}</p>
          </CardContent>
        </Card>
      )}

      {/* Motif d'annulation */}
      {depense.motifAnnulation && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              Motif d'annulation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{depense.motifAnnulation}</p>
          </CardContent>
        </Card>
      )}

      {/* Métadonnées */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Informations système
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Créée le</span>
            <span>{formatDateTime(depense.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Modifiée le</span>
            <span>{formatDateTime(depense.updatedAt)}</span>
          </div>
        </CardContent>
      </Card>
    </SnapshotBase>
  );
};
