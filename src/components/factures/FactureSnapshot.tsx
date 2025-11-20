import { FileText, Building2, ShoppingCart, FileCheck, FolderOpen, Calendar, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { Facture } from '@/types/facture.types';
import { SnapshotBase } from '@/components/shared/SnapshotBase';
import { formatMontant, formatDate, formatDateTime, getEntityUrl } from '@/lib/snapshot-utils';

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
  
  /** Marquer la facture comme payée */
  onMarquerPayee?: () => void;
  
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
  onMarquerPayee,
  onAnnuler,
  onCreerDepense,
  onNavigateToEntity,
}: FactureSnapshotProps) => {
  const getStatutBadge = (statut: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      brouillon: 'outline',
      validee: 'secondary',
      payee: 'default',
      annulee: 'destructive',
    };

    const labels: Record<string, string> = {
      brouillon: 'Brouillon',
      validee: 'Validée',
      payee: 'Payée',
      annulee: 'Annulée',
    };

    return (
      <Badge variant={variants[statut] || 'default'}>
        {labels[statut] || statut}
      </Badge>
    );
  };

  const solde = facture.montantTTC - facture.montantPaye;
  const progressionPaiement = facture.montantTTC > 0 
    ? (facture.montantPaye / facture.montantTTC) * 100 
    : 0;

  const handleEntityClick = (type: string, id: string) => {
    if (onNavigateToEntity) {
      onNavigateToEntity(type, id);
    } else {
      window.location.href = getEntityUrl(type, id);
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
      {facture.statut === 'validee' && onMarquerPayee && (
        <Button size="sm" onClick={onMarquerPayee}>
          Marquer comme payée
        </Button>
      )}
      {facture.statut === 'validee' && onCreerDepense && (
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
      {/* Section 1: Informations principales */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Informations principales
            </CardTitle>
            {getStatutBadge(facture.statut)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Numéro facture</p>
              <p className="font-medium">{facture.numero}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Date facture</p>
              <p className="font-medium">{formatDate(facture.dateFacture)}</p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Objet</p>
            <p className="font-medium">{facture.objet}</p>
          </div>

          {facture.numeroFactureFournisseur && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Numéro facture fournisseur</p>
              <p className="font-medium">{facture.numeroFactureFournisseur}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {facture.dateEcheance && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Date d'échéance</p>
                <p className="font-medium">{formatDate(facture.dateEcheance)}</p>
              </div>
            )}
            {facture.dateValidation && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Date de validation</p>
                <p className="font-medium">{formatDate(facture.dateValidation)}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Montants */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Montants
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Montant HT</p>
              <p className="text-lg font-semibold">{formatMontant(facture.montantHT)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">TVA</p>
              <p className="text-lg font-semibold">{formatMontant(facture.montantTVA)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Montant TTC</p>
              <p className="text-lg font-semibold text-primary">{formatMontant(facture.montantTTC)}</p>
            </div>
          </div>

          {facture.statut !== 'brouillon' && (
            <>
              <div className="pt-4 border-t">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Montant payé</span>
                    <span className="font-medium">{formatMontant(facture.montantPaye)}</span>
                  </div>
                  <Progress value={progressionPaiement} className="h-2" />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Solde restant</span>
                    <span className="font-semibold">{formatMontant(solde)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Entités liées */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Entités liées
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {facture.fournisseur && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                 onClick={() => handleEntityClick('fournisseur', facture.fournisseurId)}>
              <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Fournisseur</p>
                <p className="text-sm text-muted-foreground truncate">
                  {facture.fournisseur.nom} ({facture.fournisseur.code})
                </p>
              </div>
            </div>
          )}

          {facture.bonCommande && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                 onClick={() => facture.bonCommandeId && handleEntityClick('bon-commande', facture.bonCommandeId)}>
              <ShoppingCart className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Bon de commande</p>
                <p className="text-sm text-muted-foreground truncate">
                  {facture.bonCommande.numero}
                </p>
              </div>
            </div>
          )}

          {facture.engagement && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                 onClick={() => facture.engagementId && handleEntityClick('engagement', facture.engagementId)}>
              <FileCheck className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Engagement</p>
                <p className="text-sm text-muted-foreground truncate">
                  {facture.engagement.numero}
                </p>
              </div>
            </div>
          )}

          {facture.ligneBudgetaire && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                 onClick={() => facture.ligneBudgetaireId && handleEntityClick('ligne-budgetaire', facture.ligneBudgetaireId)}>
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Ligne budgétaire</p>
                <p className="text-sm text-muted-foreground truncate">
                  {facture.ligneBudgetaire.libelle}
                </p>
              </div>
            </div>
          )}

          {facture.projet && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                 onClick={() => facture.projetId && handleEntityClick('projet', facture.projetId)}>
              <FolderOpen className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Projet</p>
                <p className="text-sm text-muted-foreground truncate">
                  {facture.projet.nom}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
    </SnapshotBase>
  );
};
