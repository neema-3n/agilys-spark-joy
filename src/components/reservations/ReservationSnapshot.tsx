import { Building2, Calendar, FileText, FolderOpen, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SnapshotBase } from '@/components/shared/SnapshotBase';
import type { ReservationCredit } from '@/types/reservation.types';
import { formatDate, formatDateTime, formatMontant, getEntityUrl } from '@/lib/snapshot-utils';
import { useEcrituresBySource } from '@/hooks/useEcrituresComptables';
import { useGenerateEcritures } from '@/hooks/useGenerateEcritures';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import { EcrituresSection } from '@/components/ecritures/EcrituresSection';

interface ReservationSnapshotProps {
  reservation: ReservationCredit;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  hasPrev: boolean;
  hasNext: boolean;
  currentIndex: number;
  totalCount: number;
  onCreerEngagement?: () => void;
  onCreerDepenseUrgence?: () => void;
  onAnnuler?: () => void;
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
  onCreerEngagement,
  onCreerDepenseUrgence,
  onAnnuler,
  onNavigateToEntity,
}: ReservationSnapshotProps) => {
  const { currentClient } = useClient();
  const { currentExercice } = useExercice();
  const { ecritures, isLoading: ecrituresLoading } = useEcrituresBySource('reservation', reservation.id);
  const generateMutation = useGenerateEcritures();

  const handleGenerateEcritures = () => {
    if (!currentClient?.id || !currentExercice?.id) return;
    
    generateMutation.mutate({
      typeOperation: 'reservation',
      sourceId: reservation.id,
      clientId: currentClient.id,
      exerciceId: currentExercice.id
    });
  };

  const canGenerateEcritures = reservation.statut === 'active' || reservation.statut === 'utilisee';

  const getStatutBadge = (statut: ReservationCredit['statut']) => {
    const variants: Record<ReservationCredit['statut'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'secondary',
      utilisee: 'outline',
      annulee: 'destructive',
      expiree: 'outline',
    };

    const labels: Record<ReservationCredit['statut'], string> = {
      active: 'Active',
      utilisee: 'Utilisée',
      annulee: 'Annulée',
      expiree: 'Expirée',
    };

    return <Badge variant={variants[statut] || 'default'}>{labels[statut] || statut}</Badge>;
  };

  const calculerSolde = (res: ReservationCredit): number => {
    if (!res.engagements || res.engagements.length === 0) {
      return res.montant;
    }
    const montantEngage = res.engagements
      .filter((e) => e.statut !== 'annule')
      .reduce((sum, e) => sum + Number(e.montant), 0);
    return Number(res.montant) - montantEngage;
  };

  const handleEntityClick = (type: string, id?: string) => {
    if (!id) return;
    if (onNavigateToEntity) {
      onNavigateToEntity(type, id);
    } else {
      window.location.href = getEntityUrl(type, id);
    }
  };

  const actions = (
    <>
      {reservation.statut === 'active' && onCreerEngagement && (
        <Button variant="outline" size="sm" onClick={onCreerEngagement}>
          Créer un engagement
        </Button>
      )}
      {reservation.statut === 'active' && onCreerDepenseUrgence && (
        <Button variant="outline" size="sm" onClick={onCreerDepenseUrgence}>
          Dépense urgente
        </Button>
      )}
      {(reservation.statut === 'active' || reservation.statut === 'utilisee') && onAnnuler && (
        <Button variant="destructive" size="sm" onClick={onAnnuler}>
          Annuler
        </Button>
      )}
    </>
  );

  const solde = calculerSolde(reservation);
  const montantEngage = reservation.montant - solde;

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
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Informations principales
            </CardTitle>
            {getStatutBadge(reservation.statut)}
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Montant réservé</p>
            <p className="text-2xl font-bold text-primary">{formatMontant(reservation.montant)}</p>
            <p className="text-sm text-muted-foreground">
              Engagé: <span className="font-medium">{formatMontant(montantEngage)}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Solde: <span className="font-medium">{formatMontant(solde)}</span>
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Bénéficiaire / Projet</p>
            <p className="font-medium">
              {reservation.projet?.nom || reservation.beneficiaire || 'Non renseigné'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Références liées
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {reservation.ligneBudgetaire && (
            <div
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
              onClick={() => handleEntityClick('ligne-budgetaire', reservation.ligneBudgetaireId)}
            >
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Ligne budgétaire</p>
                <p className="text-sm text-muted-foreground truncate">
                  {reservation.ligneBudgetaire.libelle}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Disponible: {formatMontant(reservation.ligneBudgetaire.disponible)}
                </p>
              </div>
            </div>
          )}

          {reservation.projet && (
            <div
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
              onClick={() => handleEntityClick('projet', reservation.projetId)}
            >
              <FolderOpen className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Projet</p>
                <p className="text-sm text-muted-foreground truncate">
                  {reservation.projet.code} - {reservation.projet.nom}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {reservation.engagements && reservation.engagements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Engagements créés
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {reservation.engagements.map((eng) => (
              <div
                key={eng.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted cursor-pointer transition-colors"
                onClick={() => handleEntityClick('engagement', eng.id)}
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">ENG {eng.numero}</p>
                  <p className="text-xs text-muted-foreground">Statut: {eng.statut}</p>
                </div>
                <p className="font-medium">{formatMontant(eng.montant)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Dates clés
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-muted-foreground">Date de réservation</p>
            <p className="font-medium">{formatDate(reservation.dateReservation)}</p>
          </div>
          {reservation.dateExpiration && (
            <div className="space-y-1">
              <p className="text-muted-foreground">Date d'expiration</p>
              <p className="font-medium">{formatDate(reservation.dateExpiration)}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {reservation.motifAnnulation && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Info className="h-5 w-5" />
              Motif d'annulation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{reservation.motifAnnulation}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Métadonnées
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Créé le :</span>
            <span className="ml-2 font-medium">{formatDateTime(reservation.createdAt)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Modifié le :</span>
            <span className="ml-2 font-medium">{formatDateTime(reservation.updatedAt)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Écritures comptables */}
      <EcrituresSection
        ecritures={ecritures}
        isLoading={ecrituresLoading}
        onGenerate={canGenerateEcritures ? handleGenerateEcritures : undefined}
        isGenerating={generateMutation.isPending}
        disabledReason={!canGenerateEcritures ? "Les écritures ne peuvent être générées que pour les réservations actives ou utilisées" : undefined}
      />
    </SnapshotBase>
  );
};
