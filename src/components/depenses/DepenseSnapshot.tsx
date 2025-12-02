import { Building2, Calendar, FileText, FolderOpen, Info, Receipt, Wallet, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { SnapshotBase } from '@/components/shared/SnapshotBase';
import type { Depense } from '@/types/depense.types';
import type { Paiement } from '@/types/paiement.types';
import { formatMontant, formatDate, formatDateTime, getEntityUrl } from '@/lib/snapshot-utils';
import { useEcrituresBySource } from '@/hooks/useEcrituresComptables';
import { useGenerateEcritures } from '@/hooks/useGenerateEcritures';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import { EcrituresSection } from '@/components/ecritures/EcrituresSection';

interface DepenseSnapshotProps {
  depense: Depense;
  paiements?: Paiement[];
  isLoadingPaiements?: boolean;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  hasPrev: boolean;
  hasNext: boolean;
  currentIndex: number;
  totalCount: number;
  onNavigateToEntity?: (type: string, id: string) => void;
  onValider?: (id: string) => void;
  onOrdonnancer?: (id: string) => void;
  onEnregistrerPaiement?: (id: string) => void;
  onAnnuler?: (id: string) => void;
  onDelete?: (id: string) => void;
  disableActions?: boolean;
}

export const DepenseSnapshot = ({
  depense,
  paiements = [],
  isLoadingPaiements,
  onClose,
  onNavigate,
  hasPrev,
  hasNext,
  currentIndex,
  totalCount,
  onNavigateToEntity,
  onValider,
  onOrdonnancer,
  onEnregistrerPaiement,
  onAnnuler,
  onDelete,
  disableActions,
}: DepenseSnapshotProps) => {
  const { currentClient } = useClient();
  const { currentExercice } = useExercice();
  const { ecritures, isLoading: ecrituresLoading } = useEcrituresBySource('depense', depense.id);
  const generateMutation = useGenerateEcritures();

  const handleGenerateEcritures = () => {
    if (!currentClient?.id || !currentExercice?.id) return;
    
    generateMutation.mutate({
      typeOperation: 'depense',
      sourceId: depense.id,
      clientId: currentClient.id,
      exerciceId: currentExercice.id
    });
  };

  const canGenerateEcritures = depense.statut !== 'brouillon';

  const montantRestant = depense.montant - depense.montantPaye;
  const pourcentagePaye = depense.montant > 0 ? (depense.montantPaye / depense.montant) * 100 : 0;
  const getStatutBadge = (statut: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' | 'success'> = {
      brouillon: 'outline',
      validee: 'success',
      ordonnancee: 'secondary',
      payee: 'success',
      annulee: 'destructive',
    };

    const labels: Record<string, string> = {
      brouillon: 'Brouillon',
      validee: 'Validée',
      ordonnancee: 'Ordonnancée',
      payee: 'Payée',
      annulee: 'Annulée',
    };

    return <Badge variant={variants[statut] || 'default'}>{labels[statut] || statut}</Badge>;
  };

  const handleEntityClick = (type: string, id?: string) => {
    if (!id) return;
    if (onNavigateToEntity) {
      onNavigateToEntity(type, id);
    } else {
      window.location.href = getEntityUrl(type, id);
    }
  };

  const actionButtons = () => {
    const buttons = [];

    if (onValider && depense.statut === 'brouillon') {
      buttons.push(
        <Button
          key="valider"
          size="sm"
          onClick={() => onValider(depense.id)}
          disabled={disableActions}
        >
          Valider
        </Button>
      );
    }

    if (onOrdonnancer && depense.statut === 'validee') {
      buttons.push(
        <Button
          key="ordonnancer"
          size="sm"
          onClick={() => onOrdonnancer(depense.id)}
          disabled={disableActions}
        >
          Ordonnancer
        </Button>
      );
    }

    if (onEnregistrerPaiement && depense.statut === 'ordonnancee' && montantRestant > 0) {
      buttons.push(
        <Button
          key="paiement"
          size="sm"
          onClick={() => onEnregistrerPaiement(depense.id)}
          disabled={disableActions}
        >
          Enregistrer un paiement
        </Button>
      );
    }

    if (onAnnuler && depense.statut !== 'annulee' && depense.statut !== 'payee') {
      buttons.push(
        <Button
          key="annuler"
          variant="outline"
          size="sm"
          onClick={() => onAnnuler(depense.id)}
          disabled={disableActions}
        >
          Annuler
        </Button>
      );
    }

    if (onDelete && depense.statut === 'brouillon') {
      buttons.push(
        <Button
          key="supprimer"
          variant="ghost"
          size="sm"
          className="text-destructive"
          onClick={() => onDelete(depense.id)}
          disabled={disableActions}
        >
          Supprimer
        </Button>
      );
    }

    return buttons;
  };

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
      actions={actionButtons()}
    >
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Informations principales
            </CardTitle>
            {getStatutBadge(depense.statut)}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Montant total</p>
                <p className="text-2xl font-bold text-primary">{formatMontant(depense.montant)}</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Montant payé</span>
                  <span className="font-medium">{formatMontant(depense.montantPaye)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Solde à payer</span>
                  <span className="font-medium text-primary">{formatMontant(montantRestant)}</span>
                </div>
                <Progress value={pourcentagePaye} className="h-2" />
                <p className="text-xs text-muted-foreground text-right">
                  {pourcentagePaye.toFixed(0)}% payé
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Bénéficiaire / Fournisseur</p>
              <p className="font-medium">
                {depense.fournisseur?.nom || depense.beneficiaire || 'Non renseigné'}
              </p>
            </div>
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
          {depense.engagement && (
            <div
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
              onClick={() => handleEntityClick('engagement', depense.engagementId)}
            >
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Engagement</p>
                <p className="text-sm text-muted-foreground truncate">{depense.engagement.numero}</p>
              </div>
            </div>
          )}

          {depense.reservationCredit && (
            <div
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
              onClick={() => handleEntityClick('reservation', depense.reservationCreditId)}
            >
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Réservation de crédit</p>
                <p className="text-sm text-muted-foreground truncate">
                  {depense.reservationCredit.numero} ({depense.reservationCredit.statut})
                </p>
              </div>
            </div>
          )}

          {depense.ligneBudgetaire && (
            <div
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
              onClick={() => handleEntityClick('ligne-budgetaire', depense.ligneBudgetaireId)}
            >
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Ligne budgétaire</p>
                <p className="text-sm text-muted-foreground truncate">
                  {depense.ligneBudgetaire.libelle}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Disponible: {formatMontant(depense.ligneBudgetaire.disponible)}
                </p>
              </div>
            </div>
          )}

          {depense.facture && (
            <div
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
              onClick={() => handleEntityClick('facture', depense.factureId)}
            >
              <Receipt className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Facture</p>
                <p className="text-sm text-muted-foreground truncate">
                  {depense.facture.numero} ({formatMontant(depense.facture.montantTTC)})
                </p>
              </div>
            </div>
          )}

          {depense.projet && (
            <div
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
              onClick={() => handleEntityClick('projet', depense.projetId)}
            >
              <FolderOpen className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Projet</p>
                <p className="text-sm text-muted-foreground truncate">
                  {depense.projet.code} - {depense.projet.nom}
                </p>
              </div>
            </div>
          )}

          {depense.fournisseur && (
            <div
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
              onClick={() => handleEntityClick('fournisseur', depense.fournisseurId)}
            >
              <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Fournisseur</p>
                <p className="text-sm text-muted-foreground truncate">
                  {depense.fournisseur.nom} ({depense.fournisseur.code})
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Dates clés
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-muted-foreground">Date de dépense</p>
            <p className="font-medium">{formatDate(depense.dateDepense)}</p>
          </div>
          {depense.dateValidation && (
            <div className="space-y-1">
              <p className="text-muted-foreground">Date de validation</p>
              <p className="font-medium">{formatDate(depense.dateValidation)}</p>
            </div>
          )}
          {depense.dateOrdonnancement && (
            <div className="space-y-1">
              <p className="text-muted-foreground">Date d'ordonnancement</p>
              <p className="font-medium">{formatDate(depense.dateOrdonnancement)}</p>
            </div>
          )}
          {depense.datePaiement && (
            <div className="space-y-1">
              <p className="text-muted-foreground">Date de paiement</p>
              <p className="font-medium">{formatDate(depense.datePaiement)}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {depense.observations && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Observations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{depense.observations}</p>
          </CardContent>
        </Card>
      )}

{paiements && paiements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Historique des paiements ({paiements.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingPaiements ? (
              <p className="text-sm text-muted-foreground">Chargement...</p>
            ) : (
              paiements
                .filter((p) => p.statut === 'valide')
                .map((paiement) => (
                  <div
                    key={paiement.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{paiement.numero}</p>
                        <Badge variant="outline" className="text-xs">
                          {paiement.modePaiement}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(paiement.datePaiement)}
                        {paiement.referencePaiement && ` • Réf: ${paiement.referencePaiement}`}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">{formatMontant(paiement.montant)}</p>
                  </div>
                ))
            )}
          </CardContent>
        </Card>
      )}

      {depense.motifAnnulation && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Info className="h-5 w-5" />
              Motif d'annulation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{depense.motifAnnulation}</p>
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
            <span className="ml-2 font-medium">{formatDateTime(depense.createdAt)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Modifié le :</span>
            <span className="ml-2 font-medium">{formatDateTime(depense.updatedAt)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Écritures comptables */}
      <EcrituresSection
        ecritures={ecritures}
        isLoading={ecrituresLoading}
        onGenerate={canGenerateEcritures ? handleGenerateEcritures : undefined}
        isGenerating={generateMutation.isPending}
        disabledReason={!canGenerateEcritures ? "Les écritures ne peuvent être générées que pour les dépenses validées" : undefined}
      />
    </SnapshotBase>
  );
};
