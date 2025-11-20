import { FileText, ShoppingCart, Package, Calendar, Info, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { ReservationCredit } from '@/types/reservation.types';
import { SnapshotBase } from '@/components/shared/SnapshotBase';
import { formatMontant, formatDate, formatDateTime, getEntityUrl } from '@/lib/snapshot-utils';

interface ReservationSnapshotProps {
  reservation: ReservationCredit;
  /** Ferme le snapshot (via le bouton X ou Escape) */
  onClose: () => void;
  /** Navigation entre snapshots */
  onNavigate: (direction: 'prev' | 'next') => void;
  hasPrev: boolean;
  hasNext: boolean;
  currentIndex: number;
  totalCount: number;
  
  /**
   * Éditer la réservation (statut active uniquement).
   * NE DOIT PAS fermer le snapshot - le dialogue d'édition s'ouvrira par-dessus.
   */
  onEdit?: () => void;
  
  /**
   * Créer un engagement depuis cette réservation.
   * NE DOIT PAS fermer le snapshot - le dialogue s'ouvrira par-dessus.
   */
  onCreerEngagement?: () => void;
  
  /**
   * Créer une dépense d'urgence depuis cette réservation.
   * NE DOIT PAS fermer le snapshot - le dialogue s'ouvrira par-dessus.
   */
  onCreerDepenseUrgence?: () => void;
  
  /** Annuler la réservation */
  onAnnuler?: () => void;
  
  /** Navigation vers une entité liée */
  onNavigateToEntity?: (type: string, id: string) => void;
}

export const ReservationSnapshot = ({
  reservation,
  onClose,
  onNavigate,
  hasPrev,
  hasNext,
  currentIndex,
  totalCount,
  onEdit,
  onCreerEngagement,
  onCreerDepenseUrgence,
  onAnnuler,
  onNavigateToEntity,
}: ReservationSnapshotProps) => {
  const getStatutBadge = (statut: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      utilisee: 'secondary',
      annulee: 'destructive',
      expiree: 'outline',
    };

    const labels: Record<string, string> = {
      active: 'Active',
      utilisee: 'Utilisée',
      annulee: 'Annulée',
      expiree: 'Expirée',
    };

    return (
      <Badge variant={variants[statut] || 'default'}>
        {labels[statut] || statut}
      </Badge>
    );
  };

  const calculerSolde = (): number => {
    if (!reservation.engagements || reservation.engagements.length === 0) {
      return reservation.montant;
    }
    
    const montantEngage = reservation.engagements
      .filter(e => e.statut !== 'annule')
      .reduce((sum, e) => sum + e.montant, 0);
    
    return reservation.montant - montantEngage;
  };

  const solde = calculerSolde();
  const montantUtilise = reservation.montant - solde;
  const progressionUtilisation = reservation.montant > 0 
    ? (montantUtilise / reservation.montant) * 100 
    : 0;

  const handleEntityClick = (type: string, id: string) => {
    if (onNavigateToEntity) {
      onNavigateToEntity(type, id);
    } else {
      window.location.href = getEntityUrl(type, id);
    }
  };

  // Actions spécifiques aux réservations
  const actions = (
    <>
      {reservation.statut === 'active' && onEdit && (
        <Button variant="outline" size="sm" onClick={onEdit}>
          Modifier
        </Button>
      )}
      {reservation.statut === 'active' && onCreerEngagement && (
        <Button size="sm" onClick={onCreerEngagement}>
          Créer un engagement
        </Button>
      )}
      {reservation.statut === 'active' && onCreerDepenseUrgence && (
        <Button variant="outline" size="sm" onClick={onCreerDepenseUrgence}>
          Dépense d'urgence
        </Button>
      )}
      {reservation.statut === 'active' && onAnnuler && (
        <Button variant="destructive" size="sm" onClick={onAnnuler}>
          Annuler
        </Button>
      )}
    </>
  );

  return (
    <SnapshotBase
      title={`Réservation ${reservation.numero}`}
      subtitle={reservation.objet}
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
            {getStatutBadge(reservation.statut)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Date de réservation</div>
              <div className="font-medium">{formatDate(reservation.dateReservation)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Montant</div>
              <div className="font-medium text-lg">{formatMontant(reservation.montant)}</div>
            </div>
            {reservation.dateExpiration && (
              <div>
                <div className="text-sm text-muted-foreground">Date d'expiration</div>
                <div className="font-medium">{formatDate(reservation.dateExpiration)}</div>
              </div>
            )}
            {reservation.beneficiaire && (
              <div>
                <div className="text-sm text-muted-foreground">Bénéficiaire</div>
                <div className="font-medium">{reservation.beneficiaire}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Utilisation de la réservation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Utilisation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Montant utilisé</span>
              <span className="font-medium">
                {formatMontant(montantUtilise)} / {formatMontant(reservation.montant)}
              </span>
            </div>
            <Progress value={progressionUtilisation} className="h-2" />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Solde disponible</span>
              <span className="font-medium">{formatMontant(solde)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ligne budgétaire */}
      {reservation.ligneBudgetaire && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Ligne budgétaire
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-medium">{reservation.ligneBudgetaire.libelle}</div>
            <div className="text-sm text-muted-foreground mt-1">
              Disponible: {formatMontant(reservation.ligneBudgetaire.disponible)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Projet */}
      {reservation.projet && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-4 w-4" />
              Projet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <button
              onClick={() => handleEntityClick('projet', reservation.projet!.id)}
              className="text-primary hover:underline font-medium"
            >
              {reservation.projet.nom}
            </button>
            <div className="text-sm text-muted-foreground mt-1">
              Code: {reservation.projet.code} • Statut: {reservation.projet.statut}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Engagements liés */}
      {reservation.engagements && reservation.engagements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Engagements liés ({reservation.engagements.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {reservation.engagements.map((engagement) => (
                <div
                  key={engagement.id}
                  className="flex justify-between items-center p-2 border rounded hover:bg-muted/50"
                >
                  <button
                    onClick={() => handleEntityClick('engagement', engagement.id)}
                    className="text-primary hover:underline font-medium"
                  >
                    {engagement.numero}
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{formatMontant(engagement.montant)}</span>
                    <Badge variant={engagement.statut === 'annule' ? 'destructive' : 'default'}>
                      {engagement.statut}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Motif d'annulation */}
      {reservation.motifAnnulation && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              Motif d'annulation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{reservation.motifAnnulation}</p>
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
            <span>{formatDateTime(reservation.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Modifiée le</span>
            <span>{formatDateTime(reservation.updatedAt)}</span>
          </div>
        </CardContent>
      </Card>
    </SnapshotBase>
  );
};
