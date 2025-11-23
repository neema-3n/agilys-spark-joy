import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { SnapshotBase } from '@/components/shared/SnapshotBase';
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

const statutConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; description: string }> = {
  brouillon: { label: 'Brouillon', variant: 'outline', description: 'En cours de préparation' },
  valide: { label: 'Validé', variant: 'secondary', description: 'Prêt à être exécuté' },
  en_cours: { label: 'En cours', variant: 'default', description: 'Commande en exécution' },
  receptionne: { label: 'Réceptionné', variant: 'default', description: 'Livraison confirmée' },
  facture: { label: 'Facturé', variant: 'default', description: 'Factures associées' },
  annule: { label: 'Annulé', variant: 'destructive', description: 'Commande annulée' },
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

  const statut = statutConfig[bonCommande.statut] || statutConfig.brouillon;
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
      {onCreateFacture && bonCommande.statut === 'receptionne' && (
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Informations principales
            </CardTitle>
            <Badge variant={statut.variant}>{statut.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{statut.description}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Montant</p>
                <p className="text-2xl font-bold text-primary">{formatMontant(bonCommande.montant)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Montant facturé</p>
                <p className="text-lg font-semibold">{formatMontant(montantFacture)}</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progression de facturation</span>
                  <span className="font-medium">{progression.toFixed(0)}%</span>
                </div>
                <Progress value={progression} className="h-2" />
              </div>
            </div>
            <div className="space-y-3">
              {entityButton(
                'Fournisseur',
                bonCommande.fournisseur?.nom || 'Non renseigné',
                <Building2 className="h-4 w-4" />,
                bonCommande.fournisseur?.id ? () => handleEntityClick('fournisseur', bonCommande.fournisseur?.id) : undefined,
              )}
              {entityButton(
                'Engagement lié',
                bonCommande.engagement?.numero || 'Aucun',
                <FileText className="h-4 w-4" />,
                bonCommande.engagement?.id ? () => handleEntityClick('engagement', bonCommande.engagement?.id) : undefined,
              )}
              {entityButton(
                'Projet',
                bonCommande.projet?.nom || 'Non renseigné',
                <FolderOpen className="h-4 w-4" />,
                bonCommande.projet?.id ? () => handleEntityClick('projet', bonCommande.projet?.id) : undefined,
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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
        onGenerate={handleGenerateEcritures}
        isGenerating={generateMutation.isPending}
      />
    </SnapshotBase>
  );
};
