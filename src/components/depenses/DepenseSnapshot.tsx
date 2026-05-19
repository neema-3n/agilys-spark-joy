import { Building2, Calendar, FileText, FolderOpen, Info, Receipt, Wallet, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { SnapshotBase } from '@/components/shared/SnapshotBase';
import { SnapshotLinkedEntitiesCard } from '@/components/shared/SnapshotLinkedEntitiesCard';
import { SnapshotPrimaryCard } from '@/components/shared/SnapshotPrimaryCard';
import type { Depense } from '@/types/depense.types';
import type { Paiement } from '@/types/paiement.types';
import { formatMontant, formatDate, formatDateTime, getEntityUrl } from '@/lib/snapshot-utils';
import { useEcrituresBySource } from '@/hooks/useEcrituresComptables';
import { useGenerateEcritures } from '@/hooks/useGenerateEcritures';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import { EcrituresSection } from '@/components/ecritures/EcrituresSection';
import { shouldShowAccountingForDepense } from '@/lib/accounting-policy';
import { useNavigate } from 'react-router-dom';

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
  onEdit?: (id: string) => void;
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
  onEdit,
  onEnregistrerPaiement,
  onAnnuler,
  onDelete,
  disableActions,
}: DepenseSnapshotProps) => {
  const navigate = useNavigate();
  const { currentClient } = useClient();
  const { currentExercice } = useExercice();
  const showAccountingSection = shouldShowAccountingForDepense(depense.factureId);
  const { ecritures, isLoading: ecrituresLoading } = useEcrituresBySource(
    showAccountingSection ? 'depense' : undefined,
    showAccountingSection ? depense.id : undefined,
  );
  const generateMutation = useGenerateEcritures();

  const handleGenerateEcritures = () => {
    if (!showAccountingSection) return;
    if (!currentClient?.id || !currentExercice?.id) return;
    
    generateMutation.mutate({
      typeOperation: 'depense',
      sourceId: depense.id,
      clientId: currentClient.id,
      exerciceId: currentExercice.id
    });
  };

  const canGenerateEcritures = showAccountingSection && depense.statut !== 'brouillon';

  const montantRestant = depense.montant - depense.montantPaye;
  const pourcentagePaye = depense.montant > 0 ? (depense.montantPaye / depense.montant) * 100 : 0;
  const getStatutBadge = (statut: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' | 'success'> = {
      brouillon: 'outline',
      validee: 'success',
      payee: 'success',
      annulee: 'destructive',
    };

    const labels: Record<string, string> = {
      brouillon: 'Brouillon',
      validee: 'Validée',
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
      navigate(getEntityUrl(type, id));
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

    if (onEdit && depense.statut === 'brouillon') {
      buttons.push(
        <Button
          key="modifier"
          variant="outline"
          size="sm"
          onClick={() => onEdit(depense.id)}
          disabled={disableActions}
        >
          Modifier
        </Button>
      );
    }

    if (onEnregistrerPaiement && depense.statut === 'validee' && montantRestant > 0) {
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
      <SnapshotPrimaryCard
        icon={<Wallet className="h-5 w-5" />}
        statusBadge={getStatutBadge(depense.statut)}
        metrics={[
          {
            label: 'Montant total',
            value: formatMontant(depense.montant),
            tone: 'primary',
          },
          {
            label: 'Montant payé',
            value: formatMontant(depense.montantPaye),
          },
          {
            label: 'Solde à payer',
            value: formatMontant(montantRestant),
            tone: montantRestant > 0 ? 'primary' : 'success',
          },
        ]}
        details={[
          {
            label: 'Bénéficiaire / Fournisseur',
            value: depense.fournisseur?.nom || depense.beneficiaire || 'Non renseigné',
          },
          {
            label: 'Date de dépense',
            value: formatDate(depense.dateDepense),
          },
          {
            label: 'Objet',
            value: depense.objet,
          },
        ]}
        footer={
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progression de paiement</span>
              <span className="font-medium">{pourcentagePaye.toFixed(0)}%</span>
            </div>
            <Progress value={pourcentagePaye} className="h-2" />
          </div>
        }
      />

      <SnapshotLinkedEntitiesCard
        title="Entités liées"
        items={[
          depense.facture
            ? {
                key: 'facture',
                label: 'Facture',
                value: depense.facture.numero,
                description: formatMontant(depense.facture.montantTTC),
                icon: <Receipt className="h-4 w-4" />,
                onClick: () => handleEntityClick('facture', depense.factureId),
              }
            : null,
          depense.engagement
            ? {
                key: 'engagement',
                label: 'Engagement',
                value: depense.engagement.numero,
                description: depense.engagement.objet,
                icon: <FileText className="h-4 w-4" />,
                onClick: () => handleEntityClick('engagement', depense.engagementId),
              }
            : null,
          depense.reservationCredit
            ? {
                key: 'reservation',
                label: 'Réservation de crédit',
                value: depense.reservationCredit.numero,
                description: depense.reservationCredit.statut,
                icon: <FileText className="h-4 w-4" />,
                onClick: () => handleEntityClick('reservation', depense.reservationCreditId),
              }
            : null,
          depense.ligneBudgetaire
            ? {
                key: 'ligne-budgetaire',
                label: 'Ligne budgétaire',
                value: depense.ligneBudgetaire.libelle,
                description: `Disponible: ${formatMontant(depense.ligneBudgetaire.disponible)}`,
                icon: <FileText className="h-4 w-4" />,
                onClick: () => handleEntityClick('ligne-budgetaire', depense.ligneBudgetaireId),
              }
            : null,
          depense.projet
            ? {
                key: 'projet',
                label: 'Projet',
                value: `${depense.projet.code} - ${depense.projet.nom}`,
                icon: <FolderOpen className="h-4 w-4" />,
                onClick: () => handleEntityClick('projet', depense.projetId),
              }
            : null,
          depense.fournisseur
            ? {
                key: 'fournisseur',
                label: 'Fournisseur',
                value: `${depense.fournisseur.nom} (${depense.fournisseur.code})`,
                icon: <Building2 className="h-4 w-4" />,
                onClick: () => handleEntityClick('fournisseur', depense.fournisseurId),
              }
            : null,
        ].filter(Boolean)}
        emptyMessage="Aucune entité liée."
      />

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

      {showAccountingSection ? (
        <EcrituresSection
          ecritures={ecritures}
          isLoading={ecrituresLoading}
          onGenerate={canGenerateEcritures ? handleGenerateEcritures : undefined}
          isGenerating={generateMutation.isPending}
          disabledReason={!canGenerateEcritures ? "Les écritures ne peuvent être générées que pour les dépenses validées" : undefined}
        />
      ) : null}
    </SnapshotBase>
  );
};
