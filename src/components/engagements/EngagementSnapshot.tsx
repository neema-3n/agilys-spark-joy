import { FileText, Building2, FolderOpen, Calendar, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { Engagement } from '@/types/engagement.types';
import { SnapshotBase } from '@/components/shared/SnapshotBase';
import { formatMontant, formatDate, formatDateTime, getEntityUrl } from '@/lib/snapshot-utils';
import { useEcrituresBySource } from '@/hooks/useEcrituresComptables';
import { useGenerateEcritures } from '@/hooks/useGenerateEcritures';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import { EcrituresSection } from '@/components/ecritures/EcrituresSection';

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
  onCreerDepense,
  onNavigateToEntity,
}: EngagementSnapshotProps) => {
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
      brouillon: 'warning',
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
      window.location.href = getEntityUrl(type, id);
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
      {(engagement.statut === 'valide' || engagement.statut === 'engage') && onCreerBonCommande && (
        <Button variant="outline" size="sm" onClick={onCreerBonCommande}>
          Créer un bon de commande
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
      {/* Informations principales */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Informations principales
            </CardTitle>
            {getStatutBadge(engagement.statut)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Objet</p>
              <p className="text-xl font-semibold">{engagement.objet}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Montant initial</p>
                <p className="text-2xl font-bold text-primary">{formatMontant(engagement.montant)}</p>
              </div>
              
              {engagement.statut !== 'brouillon' && (
                <>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Montant utilisé</p>
                    <p className="text-lg font-semibold">{formatMontant(montantUtilise)}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Solde disponible</p>
                    <p className="text-lg font-semibold">{formatMontant(solde)}</p>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-4">
              {engagement.ligneBudgetaire && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                     onClick={() => handleEntityClick('ligne-budgetaire', engagement.ligneBudgetaireId)}>
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Ligne budgétaire</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {engagement.ligneBudgetaire.libelle}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Disponible: {formatMontant(engagement.ligneBudgetaire.disponible)}
                    </p>
                  </div>
                </div>
              )}

              {engagement.beneficiaire && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Bénéficiaire</p>
                  <p className="font-medium">{engagement.beneficiaire}</p>
                </div>
              )}
            </div>
          </div>

          {engagement.statut !== 'brouillon' && (
            <div className="pt-4 border-t">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progression d'utilisation</span>
                  <span className="font-medium">{progressionUtilisation.toFixed(1)}%</span>
                </div>
                <Progress value={progressionUtilisation} className="h-2" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Entités liées */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Entités liées
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {engagement.fournisseur && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                 onClick={() => engagement.fournisseurId && handleEntityClick('fournisseur', engagement.fournisseurId)}>
              <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Fournisseur</p>
                <p className="text-sm text-muted-foreground truncate">
                  {engagement.fournisseur.nom} ({engagement.fournisseur.code})
                </p>
              </div>
            </div>
          )}

          {engagement.projet && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                 onClick={() => engagement.projetId && handleEntityClick('projet', engagement.projetId)}>
              <FolderOpen className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Projet</p>
                <p className="text-sm text-muted-foreground truncate">
                  {engagement.projet.code} - {engagement.projet.nom}
                </p>
              </div>
            </div>
          )}

          {engagement.reservationCredit && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                 onClick={() => engagement.reservationCreditId && handleEntityClick('reservation', engagement.reservationCreditId)}>
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Réservation de crédit</p>
                <p className="text-sm text-muted-foreground truncate">
                  {engagement.reservationCredit.numero}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
