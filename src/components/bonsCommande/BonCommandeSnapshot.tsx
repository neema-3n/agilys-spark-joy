import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { SnapshotBase } from '@/components/shared/SnapshotBase';
import { SnapshotLinkedEntitiesCard } from '@/components/shared/SnapshotLinkedEntitiesCard';
import { SnapshotPrimaryCard } from '@/components/shared/SnapshotPrimaryCard';
import type { BonCommande } from '@/types/bonCommande.types';
import { formatMontant, formatDate } from '@/lib/snapshot-utils';
import { ShoppingCart, Building2, FileText, FolderOpen, Calendar, Truck, ClipboardCheck, Receipt } from 'lucide-react';
import { ReactNode } from 'react';
import { useEcrituresBySource } from '@/hooks/useEcrituresComptables';
import { useGenerateEcritures } from '@/hooks/useGenerateEcritures';
import { useClient } from '@/contexts/ClientContext';
import { useExercice } from '@/contexts/ExerciceContext';
import { EcrituresSection } from '@/components/ecritures/EcrituresSection';

interface BonCommandeSnapshotProps {
  bonCommande: BonCommande;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  hasPrev: boolean;
  hasNext: boolean;
  currentIndex: number;
  totalCount: number;
  onEdit?: () => void;
  onValider?: () => void;
  onMettreEnCours?: () => void;
  onReceptionner?: () => void;
  onAnnuler?: () => void;
  onCreateFacture?: () => void;
  onNavigateToEntity?: (type: string, id: string) => void;
}

const variants: Record<BonCommande['statut'], 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' | 'success'> = {
  brouillon: 'outline',
  valide: 'success',
  en_cours: 'secondary',
  receptionne: 'success',
  facture: 'secondary',
  annule: 'destructive',
};

const labels: Record<BonCommande['statut'], string> = {
  brouillon: 'Brouillon',
  valide: 'Validé',
  en_cours: 'En cours',
  receptionne: 'Réceptionné',
  facture: 'Facturé',
  annule: 'Annulé',
};

const descriptions: Record<BonCommande['statut'], string> = {
  brouillon: 'En cours de préparation',
  valide: 'Prêt à être exécuté',
  en_cours: 'Commande en exécution',
  receptionne: 'Livraison confirmée',
  facture: 'Factures associées',
  annule: 'Commande annulée',
};

const entityButton = (
  label: string,
  value: string,
  icon: ReactNode,
  onClick?: () => void,
) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-start gap-3 p-3 rounded-lg border transition ${
      onClick ? 'hover:bg-muted cursor-pointer text-left' : 'bg-muted/30 text-left'
    }`}
  >
    <span className="text-muted-foreground mt-1">{icon}</span>
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  </button>
);

export const BonCommandeSnapshot = ({
  bonCommande,
  onClose,
  onNavigate,
  hasPrev,
  hasNext,
  currentIndex,
  totalCount,
  onEdit,
  onValider,
  onMettreEnCours,
  onReceptionner,
  onAnnuler,
  onCreateFacture,
  onNavigateToEntity,
}: BonCommandeSnapshotProps) => {
  const { currentClient } = useClient();
  const { currentExercice } = useExercice();
  const { ecritures, isLoading: ecrituresLoading } = useEcrituresBySource('bon_commande', bonCommande.id);
  const generateMutation = useGenerateEcritures();

  const handleGenerateEcritures = () => {
    if (!currentClient?.id || !currentExercice?.id) return;
    
    generateMutation.mutate({
      typeOperation: 'bon_commande',
      sourceId: bonCommande.id,
      clientId: currentClient.id,
      exerciceId: currentExercice.id
    });
  };

  const canGenerateEcritures = bonCommande.statut !== 'brouillon';

  const statut = { variant: variants[bonCommande.statut] || 'outline', label: labels[bonCommande.statut] || bonCommande.statut, description: descriptions[bonCommande.statut] || '' };
  const montantFacture = bonCommande.montantFacture || 0;
  const progression = bonCommande.montant > 0 ? (montantFacture / bonCommande.montant) * 100 : 0;

  const actions = (
    <div className="flex flex-wrap gap-2">
      {onEdit && bonCommande.statut === 'brouillon' && (
        <Button variant="outline" size="sm" onClick={onEdit}>
          Modifier
        </Button>
      )}
      {onValider && bonCommande.statut === 'brouillon' && (
        <Button size="sm" onClick={onValider}>
          Valider
        </Button>
      )}
      {onMettreEnCours && bonCommande.statut === 'valide' && (
        <Button size="sm" variant="secondary" onClick={onMettreEnCours}>
          Mettre en cours
        </Button>
      )}
      {onReceptionner && bonCommande.statut === 'en_cours' && (
        <Button size="sm" variant="secondary" onClick={onReceptionner}>
          Réceptionner
        </Button>
      )}
      {onCreateFacture && bonCommande.engagementId && bonCommande.statut === 'receptionne' && (
        <Button size="sm" variant="secondary" onClick={onCreateFacture}>
          Créer une facture
        </Button>
      )}
      {onAnnuler && bonCommande.statut !== 'facture' && bonCommande.statut !== 'annule' && (
        <Button size="sm" variant="destructive" onClick={onAnnuler}>
          Annuler
        </Button>
      )}
    </div>
  );

  const handleEntityClick = (type: string, id?: string) => {
    if (id && onNavigateToEntity) {
      onNavigateToEntity(type, id);
    }
  };

  return (
    <SnapshotBase
      title={`Bon de commande ${bonCommande.numero}`}
      subtitle={bonCommande.objet}
      currentIndex={currentIndex}
      totalCount={totalCount}
      hasPrev={hasPrev}
      hasNext={hasNext}
      onClose={onClose}
      onNavigate={onNavigate}
      actions={actions}
    >
      <SnapshotPrimaryCard
        icon={<ShoppingCart className="h-5 w-5" />}
        statusBadge={<Badge variant={statut.variant}>{statut.label}</Badge>}
        metrics={[
          {
            label: 'Montant',
            value: formatMontant(bonCommande.montant),
            tone: 'primary',
          },
          {
            label: 'Montant facturé',
            value: formatMontant(montantFacture),
          },
          {
            label: 'Reste à facturer',
            value: formatMontant(Math.max(bonCommande.montant - montantFacture, 0)),
            tone: montantFacture >= bonCommande.montant ? 'success' : 'warning',
          },
        ]}
        details={[
          {
            label: 'Objet',
            value: bonCommande.objet,
          },
          {
            label: 'Date commande',
            value: formatDate(bonCommande.dateCommande),
          },
          {
            label: 'Statut opérationnel',
            value: statut.description,
          },
        ]}
        footer={
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progression de facturation</span>
              <span className="font-medium">{progression.toFixed(0)}%</span>
            </div>
            <Progress value={progression} className="h-2" />
          </div>
        }
      />

      <SnapshotLinkedEntitiesCard
        items={[
          {
            key: 'fournisseur',
            label: 'Fournisseur',
            value: bonCommande.fournisseur?.nom || 'Non renseigné',
            description: bonCommande.fournisseur?.code,
            icon: <Building2 className="h-4 w-4" />,
            onClick: bonCommande.fournisseur?.id ? () => handleEntityClick('fournisseur', bonCommande.fournisseur?.id) : undefined,
          },
          {
            key: 'engagement',
            label: 'Engagement lié',
            value: bonCommande.engagement?.numero || 'Aucun',
            description: bonCommande.engagement?.objet,
            icon: <FileText className="h-4 w-4" />,
            onClick: bonCommande.engagement?.id ? () => handleEntityClick('engagement', bonCommande.engagement?.id) : undefined,
          },
          {
            key: 'projet',
            label: 'Projet',
            value: bonCommande.projet?.nom || 'Non renseigné',
            description: bonCommande.projet?.code,
            icon: <FolderOpen className="h-4 w-4" />,
            onClick: bonCommande.projet?.id ? () => handleEntityClick('projet', bonCommande.projet?.id) : undefined,
          },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Livraison & suivi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {entityButton('Date commande', formatDate(bonCommande.dateCommande), <Calendar className="h-4 w-4" />)}
            {entityButton('Validation', bonCommande.dateValidation ? formatDate(bonCommande.dateValidation) : '—', <ClipboardCheck className="h-4 w-4" />)}
            {entityButton('Livraison prévue', bonCommande.dateLivraisonPrevue ? formatDate(bonCommande.dateLivraisonPrevue) : '—', <Truck className="h-4 w-4" />)}
            {entityButton('Livraison réelle', bonCommande.dateLivraisonReelle ? formatDate(bonCommande.dateLivraisonReelle) : '—', <Truck className="h-4 w-4" />)}
            {entityButton('Conditions', bonCommande.conditionsLivraison || 'Non précisées', <Receipt className="h-4 w-4" />)}
            {entityButton('Observations', bonCommande.observations || '—', <FileText className="h-4 w-4" />)}
          </div>
        </CardContent>
      </Card>

      {/* Écritures comptables */}
      <EcrituresSection
        ecritures={ecritures}
        isLoading={ecrituresLoading}
        onGenerate={canGenerateEcritures ? handleGenerateEcritures : undefined}
        isGenerating={generateMutation.isPending}
        disabledReason={!canGenerateEcritures ? "Les écritures ne peuvent être générées que pour les bons de commande validés" : undefined}
      />
    </SnapshotBase>
  );
};
