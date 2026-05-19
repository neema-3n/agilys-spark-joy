import { FileText, Building2, ShoppingCart, FileCheck, FolderOpen, Calendar, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { Facture } from '@/types/facture.types';
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

interface FactureSnapshotProps {
  facture: Facture;
  /** Ferme le snapshot (via le bouton X ou Escape) */
  onClose: () => void;
  /** Navigation entre snapshots */
  onNavigate: (direction: 'prev' | 'next') => void;
  hasPrev: boolean;
  hasNext: boolean;
  currentIndex: number;
  totalCount: number;
  
  /**
   * Éditer la facture (statut brouillon uniquement).
   * NE DOIT PAS fermer le snapshot - le dialogue d'édition s'ouvrira par-dessus.
   */
  onEdit?: () => void;
  
  /** Valider la facture (change le statut en "validée") */
  onValider?: () => void;
  
  /** Marquer la facture comme soldée */
  onMarquerSoldee?: () => void;
  
  /** Annuler la facture */
  onAnnuler?: () => void;
  
  /**
   * Créer une dépense depuis cette facture.
   * NE DOIT PAS fermer le snapshot - le dialogue s'ouvrira par-dessus.
   */
  onCreerDepense?: () => void;
  
  /** Navigation vers une entité liée */
  onNavigateToEntity?: (type: string, id: string) => void;
}

export const FactureSnapshot = ({
  facture,
  onClose,
  onNavigate,
  hasPrev,
  hasNext,
  currentIndex,
  totalCount,
  onEdit,
  onValider,
  onMarquerSoldee,
  onAnnuler,
  onCreerDepense,
  onNavigateToEntity,
}: FactureSnapshotProps) => {
  const navigate = useNavigate();
  const { currentClient } = useClient();
  const { currentExercice } = useExercice();
  const { ecritures, isLoading: ecrituresLoading } = useEcrituresBySource('facture', facture.id);
  const generateMutation = useGenerateEcritures();

  const handleGenerateEcritures = () => {
    if (!currentClient?.id || !currentExercice?.id) return;
    
    generateMutation.mutate({
      typeOperation: 'facture',
      sourceId: facture.id,
      clientId: currentClient.id,
      exerciceId: currentExercice.id
    });
  };

  const canGenerateEcritures = facture.statut !== 'brouillon';

  const getStatutBadge = (statut: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' | 'success'> = {
      brouillon: 'outline',
      validee: 'success',
      soldee: 'success',
      annulee: 'destructive',
    };

    const labels: Record<string, string> = {
      brouillon: 'Brouillon',
      validee: 'Validée',
      soldee: 'Soldée',
      annulee: 'Annulée',
    };

    return (
      <Badge variant={variants[statut] || 'default'}>
        {labels[statut] || statut}
      </Badge>
    );
  };

  const solde = facture.montantTTC - facture.montantLiquide;
  const progressionPaiement = facture.montantTTC > 0 
    ? (facture.montantLiquide / facture.montantTTC) * 100 
    : 0;

  const handleEntityClick = (type: string, id: string) => {
    if (onNavigateToEntity) {
      onNavigateToEntity(type, id);
    } else {
      navigate(getEntityUrl(type, id));
    }
  };

  // Actions spécifiques aux factures
  const actions = (
    <>
      {facture.statut === 'brouillon' && onEdit && (
        <Button variant="outline" size="sm" onClick={onEdit}>
          Modifier
        </Button>
      )}
      {facture.statut === 'brouillon' && onValider && (
        <Button size="sm" onClick={onValider}>
          Valider
        </Button>
      )}
      {facture.statut === 'validee' && onMarquerSoldee && (
        <Button size="sm" onClick={onMarquerSoldee}>
          Marquer comme soldée
        </Button>
      )}
      {(facture.statut === 'validee' || facture.statut === 'soldee') && onCreerDepense && (
        <Button variant="outline" size="sm" onClick={onCreerDepense}>
          Créer une dépense
        </Button>
      )}
      {(facture.statut === 'brouillon' || facture.statut === 'validee') && onAnnuler && (
        <Button variant="destructive" size="sm" onClick={onAnnuler}>
          Annuler
        </Button>
      )}
    </>
  );

  return (
    <SnapshotBase
      title={`Facture ${facture.numero}`}
      subtitle={facture.objet}
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
        statusBadge={getStatutBadge(facture.statut)}
        metrics={[
          {
            label: 'Montant TTC',
            value: formatMontant(facture.montantTTC),
            tone: 'primary',
          },
          {
            label: 'Montant HT',
            value: formatMontant(facture.montantHT),
          },
          {
            label: 'TVA',
            value: formatMontant(facture.montantTVA),
          },
          {
            label: 'Solde restant',
            value: formatMontant(solde),
            tone: solde > 0 ? 'warning' : 'success',
          },
        ]}
        details={[
          {
            label: 'Date facture',
            value: formatDate(facture.dateFacture),
          },
          {
            label: 'Objet',
            value: facture.objet,
          },
          {
            label: 'Numéro fournisseur',
            value: facture.numeroFactureFournisseur || '—',
          },
          {
            label: 'Échéance',
            value: facture.dateEcheance ? formatDate(facture.dateEcheance) : '—',
          },
          {
            label: 'Validation',
            value: facture.dateValidation ? formatDate(facture.dateValidation) : '—',
          },
        ]}
        footer={
          facture.statut !== 'brouillon' ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Montant liquidé</span>
                <span className="font-medium">{formatMontant(facture.montantLiquide)}</span>
              </div>
              <Progress value={progressionPaiement} className="h-2" />
            </div>
          ) : null
        }
      />

      <SnapshotLinkedEntitiesCard
        items={[
          facture.fournisseur
            ? {
                key: 'fournisseur',
                label: 'Fournisseur',
                value: `${facture.fournisseur.nom} (${facture.fournisseur.code})`,
                icon: <Building2 className="h-4 w-4" />,
                onClick: () => handleEntityClick('fournisseur', facture.fournisseurId),
              }
            : null,
          facture.bonCommande
            ? {
                key: 'bon-commande',
                label: 'Bon de commande',
                value: facture.bonCommande.numero,
                icon: <ShoppingCart className="h-4 w-4" />,
                onClick: () => facture.bonCommandeId && handleEntityClick('bon-commande', facture.bonCommandeId),
              }
            : null,
          facture.engagement
            ? {
                key: 'engagement',
                label: 'Engagement',
                value: facture.engagement.numero,
                icon: <FileCheck className="h-4 w-4" />,
                onClick: () => facture.engagementId && handleEntityClick('engagement', facture.engagementId),
              }
            : null,
          facture.ligneBudgetaire
            ? {
                key: 'ligne-budgetaire',
                label: 'Ligne budgétaire',
                value: facture.ligneBudgetaire.libelle,
                icon: <FileText className="h-4 w-4" />,
                onClick: () => facture.ligneBudgetaireId && handleEntityClick('ligne-budgetaire', facture.ligneBudgetaireId),
              }
            : null,
          facture.projet
            ? {
                key: 'projet',
                label: 'Projet',
                value: facture.projet.nom,
                icon: <FolderOpen className="h-4 w-4" />,
                onClick: () => facture.projetId && handleEntityClick('projet', facture.projetId),
              }
            : null,
        ].filter(Boolean)}
        emptyMessage="Aucune entité liée."
      />

      {/* Observations */}
      {facture.observations && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Observations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{facture.observations}</p>
          </CardContent>
        </Card>
      )}

      {/* Section métadonnées */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Métadonnées
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Créée le :</span>
              <span className="ml-2 font-medium">{formatDateTime(facture.createdAt)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Modifiée le :</span>
              <span className="ml-2 font-medium">{formatDateTime(facture.updatedAt)}</span>
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
        disabledReason={!canGenerateEcritures ? "Les écritures ne peuvent être générées que pour les factures validées" : undefined}
      />
    </SnapshotBase>
  );
};
