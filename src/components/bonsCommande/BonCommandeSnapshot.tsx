import { FileText, Building2, ShoppingCart, Package, Calendar, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { BonCommande } from '@/types/bonCommande.types';
import { SnapshotBase } from '@/components/shared/SnapshotBase';
import { formatMontant, formatDate, formatDateTime, getEntityUrl } from '@/lib/snapshot-utils';

interface BonCommandeSnapshotProps {
  bonCommande: BonCommande;
  /** Ferme le snapshot (via le bouton X ou Escape) */
  onClose: () => void;
  /** Navigation entre snapshots */
  onNavigate: (direction: 'prev' | 'next') => void;
  hasPrev: boolean;
  hasNext: boolean;
  currentIndex: number;
  totalCount: number;
  
  /**
   * Éditer le bon de commande (statut brouillon uniquement).
   * NE DOIT PAS fermer le snapshot - le dialogue d'édition s'ouvrira par-dessus.
   */
  onEdit?: () => void;
  
  /** Valider le bon de commande */
  onValider?: () => void;
  
  /** Mettre en cours le bon de commande */
  onMettreEnCours?: () => void;
  
  /** Réceptionner le bon de commande */
  onReceptionner?: () => void;
  
  /** Annuler le bon de commande */
  onAnnuler?: () => void;
  
  /**
   * Créer une facture depuis ce bon de commande.
   * NE DOIT PAS fermer le snapshot - le dialogue s'ouvrira par-dessus.
   */
  onCreerFacture?: () => void;
  
  /** Navigation vers une entité liée */
  onNavigateToEntity?: (type: string, id: string) => void;
}

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
  onCreerFacture,
  onNavigateToEntity,
}: BonCommandeSnapshotProps) => {
  const getStatutBadge = (statut: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      brouillon: 'outline',
      valide: 'secondary',
      en_cours: 'default',
      receptionne: 'default',
      facture: 'default',
      annule: 'destructive',
    };

    const labels: Record<string, string> = {
      brouillon: 'Brouillon',
      valide: 'Validé',
      en_cours: 'En cours',
      receptionne: 'Réceptionné',
      facture: 'Facturé',
      annule: 'Annulé',
    };

    return (
      <Badge variant={variants[statut] || 'default'}>
        {labels[statut] || statut}
      </Badge>
    );
  };

  const montantFacture = bonCommande.montantFacture || 0;
  const progressionFacturation = bonCommande.montant > 0 
    ? (montantFacture / bonCommande.montant) * 100 
    : 0;

  const handleEntityClick = (type: string, id: string) => {
    if (onNavigateToEntity) {
      onNavigateToEntity(type, id);
    } else {
      window.location.href = getEntityUrl(type, id);
    }
  };

  // Actions spécifiques aux bons de commande
  const actions = (
    <>
      {bonCommande.statut === 'brouillon' && onEdit && (
        <Button variant="outline" size="sm" onClick={onEdit}>
          Modifier
        </Button>
      )}
      {bonCommande.statut === 'brouillon' && onValider && (
        <Button size="sm" onClick={onValider}>
          Valider
        </Button>
      )}
      {bonCommande.statut === 'valide' && onMettreEnCours && (
        <Button size="sm" onClick={onMettreEnCours}>
          Mettre en cours
        </Button>
      )}
      {bonCommande.statut === 'en_cours' && onReceptionner && (
        <Button size="sm" onClick={onReceptionner}>
          Réceptionner
        </Button>
      )}
      {bonCommande.statut === 'receptionne' && onCreerFacture && (
        <Button variant="outline" size="sm" onClick={onCreerFacture}>
          Créer une facture
        </Button>
      )}
      {(bonCommande.statut === 'brouillon' || bonCommande.statut === 'valide' || bonCommande.statut === 'en_cours') && onAnnuler && (
        <Button variant="destructive" size="sm" onClick={onAnnuler}>
          Annuler
        </Button>
      )}
    </>
  );

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
      {/* Informations principales */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">Informations générales</CardTitle>
            {getStatutBadge(bonCommande.statut)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Date de commande</div>
              <div className="font-medium">{formatDate(bonCommande.dateCommande)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Montant</div>
              <div className="font-medium text-lg">{formatMontant(bonCommande.montant)}</div>
            </div>
            {bonCommande.dateValidation && (
              <div>
                <div className="text-sm text-muted-foreground">Date de validation</div>
                <div className="font-medium">{formatDate(bonCommande.dateValidation)}</div>
              </div>
            )}
            {bonCommande.dateLivraisonPrevue && (
              <div>
                <div className="text-sm text-muted-foreground">Livraison prévue</div>
                <div className="font-medium">{formatDate(bonCommande.dateLivraisonPrevue)}</div>
              </div>
            )}
            {bonCommande.dateLivraisonReelle && (
              <div>
                <div className="text-sm text-muted-foreground">Livraison réelle</div>
                <div className="font-medium">{formatDate(bonCommande.dateLivraisonReelle)}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Progression de la facturation */}
      {bonCommande.statut === 'receptionne' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Facturation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Montant facturé</span>
                <span className="font-medium">
                  {formatMontant(montantFacture)} / {formatMontant(bonCommande.montant)}
                </span>
              </div>
              <Progress value={progressionFacturation} className="h-2" />
              <div className="text-xs text-muted-foreground text-right">
                {progressionFacturation.toFixed(0)}%
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fournisseur */}
      {bonCommande.fournisseur && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Fournisseur
            </CardTitle>
          </CardHeader>
          <CardContent>
            <button
              onClick={() => handleEntityClick('fournisseur', bonCommande.fournisseur!.id)}
              className="text-primary hover:underline font-medium"
            >
              {bonCommande.fournisseur.nom}
            </button>
            <div className="text-sm text-muted-foreground mt-1">
              Code: {bonCommande.fournisseur.code}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Engagement lié */}
      {bonCommande.engagement && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Engagement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <button
              onClick={() => handleEntityClick('engagement', bonCommande.engagement!.id)}
              className="text-primary hover:underline font-medium"
            >
              {bonCommande.engagement.numero}
            </button>
          </CardContent>
        </Card>
      )}

      {/* Ligne budgétaire */}
      {bonCommande.ligneBudgetaire && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Ligne budgétaire
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-medium">{bonCommande.ligneBudgetaire.libelle}</div>
          </CardContent>
        </Card>
      )}

      {/* Projet */}
      {bonCommande.projet && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-4 w-4" />
              Projet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <button
              onClick={() => handleEntityClick('projet', bonCommande.projet!.id)}
              className="text-primary hover:underline font-medium"
            >
              {bonCommande.projet.nom}
            </button>
          </CardContent>
        </Card>
      )}

      {/* Conditions de livraison */}
      {bonCommande.conditionsLivraison && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="h-4 w-4" />
              Conditions de livraison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{bonCommande.conditionsLivraison}</p>
          </CardContent>
        </Card>
      )}

      {/* Observations */}
      {bonCommande.observations && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="h-4 w-4" />
              Observations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{bonCommande.observations}</p>
          </CardContent>
        </Card>
      )}

      {/* Métadonnées */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Informations système
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Créé le</span>
            <span>{formatDateTime(bonCommande.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Modifié le</span>
            <span>{formatDateTime(bonCommande.updatedAt)}</span>
          </div>
        </CardContent>
      </Card>
    </SnapshotBase>
  );
};
