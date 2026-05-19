import { FileText, Building2, FolderOpen, Calendar, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { Engagement } from '@/types/engagement.types';
import { SnapshotBase } from '@/components/shared/SnapshotBase';
import { SnapshotLinkedEntitiesCard } from '@/components/shared/SnapshotLinkedEntitiesCard';
import { SnapshotPrimaryCard } from '@/components/shared/SnapshotPrimaryCard';
import { formatMontant, formatDate, formatDateTime, getEntityUrl } from '@/lib/snapshot-utils';
import { useEcrituresBySource } from '@/hooks/useEcrituresComptables';
import { useGenerateEcritures } from '@/hooks/useGenerateEcritures';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import { EcrituresSection } from '@/components/ecritures/EcrituresSection';
import { useNavigate } from 'react-router-dom';

interface EngagementSnapshotProps {
  engagement: Engagement;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  hasPrev: boolean;
  hasNext: boolean;
  currentIndex: number;
  totalCount: number;
  onEdit?: () => void;
  onValider?: () => void;
  onAnnuler?: () => void;
  onCreerBonCommande?: () => void;
  onCreerFacture?: () => void;
  onCreerDepense?: () => void;
  onNavigateToEntity?: (type: string, id: string) => void;
}

export const EngagementSnapshot = ({
  engagement,
  onClose,
  onNavigate,
  hasPrev,
  hasNext,
  currentIndex,
  totalCount,
  onEdit,
  onValider,
  onAnnuler,
  onCreerBonCommande,
  onCreerFacture,
  onCreerDepense,
  onNavigateToEntity,
}: EngagementSnapshotProps) => {
  const navigate = useNavigate();
  const { currentClient } = useClient();
  const { currentExercice } = useExercice();
  const { ecritures, isLoading: ecrituresLoading } = useEcrituresBySource('engagement', engagement.id);
  const generateMutation = useGenerateEcritures();

  const handleGenerateEcritures = () => {
    if (!currentClient?.id || !currentExercice?.id) return;
    
    generateMutation.mutate({
      typeOperation: 'engagement',
      sourceId: engagement.id,
      clientId: currentClient.id,
      exerciceId: currentExercice.id
    });
  };

  const canGenerateEcritures = engagement.statut !== 'brouillon';

  const getStatutBadge = (statut: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' | 'success'> = {
      brouillon: 'outline',
      valide: 'success',
      engage: 'success',
      liquide: 'success',
      annule: 'destructive',
    };

    const labels: Record<string, string> = {
      brouillon: 'Brouillon',
      valide: 'Validé',
      engage: 'Engagé',
      liquide: 'Liquidé',
      annule: 'Annulé',
    };

    return (
      <Badge variant={variants[statut] || 'default'}>
        {labels[statut] || statut}
      </Badge>
    );
  };

  const solde = engagement.solde ?? engagement.montant;
  const montantUtilise = engagement.montant - solde;
  const progressionUtilisation = engagement.montant > 0 
    ? (montantUtilise / engagement.montant) * 100 
    : 0;

  const handleEntityClick = (type: string, id: string) => {
    if (onNavigateToEntity) {
      onNavigateToEntity(type, id);
    } else {
      navigate(getEntityUrl(type, id));
    }
  };

  // Actions spécifiques aux engagements
  const actions = (
    <>
      {engagement.statut === 'brouillon' && onEdit && (
        <Button variant="outline" size="sm" onClick={onEdit}>
          Modifier
        </Button>
      )}
      {engagement.statut === 'brouillon' && onValider && (
        <Button size="sm" onClick={onValider}>
          Valider
        </Button>
      )}
      {(engagement.statut === 'valide' || engagement.statut === 'engage') &&
      engagement.fournisseurId &&
      onCreerBonCommande && (
        <Button variant="outline" size="sm" onClick={onCreerBonCommande}>
          Créer un bon de commande
        </Button>
      )}
      {(engagement.statut === 'valide' || engagement.statut === 'engage') && onCreerFacture && (
        <Button variant="outline" size="sm" onClick={onCreerFacture}>
          Créer une facture
        </Button>
      )}
      {(engagement.statut === 'valide' || engagement.statut === 'engage') && onCreerDepense && (
        <Button variant="outline" size="sm" onClick={onCreerDepense}>
          Créer une dépense
        </Button>
      )}
      {(engagement.statut === 'brouillon' || engagement.statut === 'valide') && onAnnuler && (
        <Button variant="destructive" size="sm" onClick={onAnnuler}>
          Annuler
        </Button>
      )}
    </>
  );

  return (
    <SnapshotBase
      title={`Engagement ${engagement.numero}`}
      subtitle={engagement.objet}
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
        statusBadge={getStatutBadge(engagement.statut)}
        metrics={[
          {
            label: 'Montant initial',
            value: formatMontant(engagement.montant),
            tone: 'primary',
          },
          {
            label: 'Montant utilisé',
            value: formatMontant(montantUtilise),
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
            value: engagement.objet,
          },
          {
            label: 'Date de création',
            value: formatDate(engagement.dateCreation),
          },
          {
            label: 'Bénéficiaire',
            value: engagement.beneficiaire || 'Non renseigné',
          },
        ]}
        footer={
          engagement.statut !== 'brouillon' ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progression d'utilisation</span>
                <span className="font-medium">{progressionUtilisation.toFixed(1)}%</span>
              </div>
              <Progress value={progressionUtilisation} className="h-2" />
            </div>
          ) : null
        }
      />

      <SnapshotLinkedEntitiesCard
        items={[
          engagement.ligneBudgetaire
            ? {
                key: 'ligne-budgetaire',
                label: 'Ligne budgétaire',
                value: engagement.ligneBudgetaire.libelle,
                description: `Disponible: ${formatMontant(engagement.ligneBudgetaire.disponible)}`,
                icon: <FileText className="h-4 w-4" />,
                onClick: () => handleEntityClick('ligne-budgetaire', engagement.ligneBudgetaireId),
              }
            : null,
          engagement.fournisseur
            ? {
                key: 'fournisseur',
                label: 'Fournisseur',
                value: `${engagement.fournisseur.nom} (${engagement.fournisseur.code})`,
                icon: <Building2 className="h-4 w-4" />,
                onClick: () => engagement.fournisseurId && handleEntityClick('fournisseur', engagement.fournisseurId),
              }
            : null,
          engagement.projet
            ? {
                key: 'projet',
                label: 'Projet',
                value: `${engagement.projet.code} - ${engagement.projet.nom}`,
                icon: <FolderOpen className="h-4 w-4" />,
                onClick: () => engagement.projetId && handleEntityClick('projet', engagement.projetId),
              }
            : null,
          engagement.reservationCredit
            ? {
                key: 'reservation',
                label: 'Réservation de crédit',
                value: engagement.reservationCredit.numero,
                icon: <FileText className="h-4 w-4" />,
                onClick: () => engagement.reservationCreditId && handleEntityClick('reservation', engagement.reservationCreditId),
              }
            : null,
        ].filter(Boolean)}
        emptyMessage="Aucune entité liée."
      />

      {/* Dates importantes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Dates importantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Date de création</p>
              <p className="font-medium">{formatDate(engagement.dateCreation)}</p>
            </div>
            {engagement.dateValidation && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Date de validation</p>
                <p className="font-medium">{formatDate(engagement.dateValidation)}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Observations */}
      {engagement.observations && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Observations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{engagement.observations}</p>
          </CardContent>
        </Card>
      )}

      {/* Motif d'annulation */}
      {engagement.statut === 'annule' && engagement.motifAnnulation && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Motif d'annulation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{engagement.motifAnnulation}</p>
          </CardContent>
        </Card>
      )}

      {/* Métadonnées */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Métadonnées
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Créé le :</span>
              <span className="ml-2 font-medium">{formatDateTime(engagement.createdAt)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Modifié le :</span>
              <span className="ml-2 font-medium">{formatDateTime(engagement.updatedAt)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Écritures comptables */}
      <EcrituresSection
        ecritures={ecritures}
        isLoading={ecrituresLoading}
        onGenerate={canGenerateEcritures ? handleGenerateEcritures : undefined}
        isGenerating={generateMutation.isPending}
        disabledReason={!canGenerateEcritures ? "Les écritures ne peuvent être générées que pour les opérations validées" : undefined}
      />
    </SnapshotBase>
  );
};
