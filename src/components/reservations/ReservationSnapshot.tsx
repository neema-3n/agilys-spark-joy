import { Building2, Calendar, FileText, FolderOpen, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SnapshotBase } from '@/components/shared/SnapshotBase';
import { SnapshotLinkedEntitiesCard } from '@/components/shared/SnapshotLinkedEntitiesCard';
import { SnapshotPrimaryCard } from '@/components/shared/SnapshotPrimaryCard';
import type { ReservationCredit } from '@/types/reservation.types';
import { formatDate, formatDateTime, formatMontant, getEntityUrl } from '@/lib/snapshot-utils';
import { useNavigate } from 'react-router-dom';

interface ReservationSnapshotProps {
  reservation: ReservationCredit;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  hasPrev: boolean;
  hasNext: boolean;
  currentIndex: number;
  totalCount: number;
  onCreerEngagement?: () => void;
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
  onAnnuler,
  onNavigateToEntity,
}: ReservationSnapshotProps) => {
  const navigate = useNavigate();

  const getStatutBadge = (statut: ReservationCredit['statut']) => {
    const variants: Record<ReservationCredit['statut'], 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' | 'success'> = {
      brouillon: 'outline',
      active: 'success',
      convertie: 'secondary',
      annulee: 'destructive',
      expiree: 'outline',
    };

    const labels: Record<ReservationCredit['statut'], string> = {
      brouillon: 'Brouillon',
      active: 'Active',
      convertie: 'Convertie',
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
      navigate(getEntityUrl(type, id));
    }
  };

  const actions = (
    <>
      {reservation.statut === 'active' && onCreerEngagement && (
        <Button variant="outline" size="sm" onClick={onCreerEngagement}>
          Créer un engagement
        </Button>
      )}
      {(reservation.statut === 'active' || reservation.statut === 'convertie') && onAnnuler && (
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
      <SnapshotPrimaryCard
        icon={<FileText className="h-5 w-5" />}
        statusBadge={getStatutBadge(reservation.statut)}
        metrics={[
          {
            label: 'Montant réservé',
            value: formatMontant(reservation.montant),
            tone: 'primary',
          },
          {
            label: 'Montant engagé',
            value: formatMontant(montantEngage),
          },
          {
            label: 'Solde disponible',
            value: formatMontant(solde),
            tone: solde > 0 ? 'success' : 'warning',
          },
        ]}
        details={[
          {
            label: 'Objet',
            value: reservation.objet,
          },
          {
            label: 'Bénéficiaire / Projet',
            value: reservation.projet?.nom || reservation.beneficiaire || 'Non renseigné',
          },
          {
            label: 'Date de réservation',
            value: formatDate(reservation.dateReservation),
          },
          {
            label: "Date d'expiration",
            value: reservation.dateExpiration ? formatDate(reservation.dateExpiration) : '—',
          },
        ]}
      />

      <SnapshotLinkedEntitiesCard
        title="Entités liées"
        items={[
          reservation.ligneBudgetaire
            ? {
                key: 'ligne-budgetaire',
                label: 'Ligne budgétaire',
                value: reservation.ligneBudgetaire.libelle,
                description: `Disponible: ${formatMontant(reservation.ligneBudgetaire.disponible)}`,
                icon: <FileText className="h-4 w-4" />,
                onClick: () => handleEntityClick('ligne-budgetaire', reservation.ligneBudgetaireId),
              }
            : null,
          reservation.projet
            ? {
                key: 'projet',
                label: 'Projet',
                value: `${reservation.projet.code} - ${reservation.projet.nom}`,
                icon: <FolderOpen className="h-4 w-4" />,
                onClick: () => handleEntityClick('projet', reservation.projetId),
              }
            : null,
        ].filter(Boolean)}
        emptyMessage="Aucune entité liée."
      />

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
    </SnapshotBase>
  );
};
