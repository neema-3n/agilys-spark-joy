import { Facture } from '@/types/facture.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  DollarSign, 
  XCircle, 
  Pencil, 
  FileText,
  Building2,
  ArrowRight,
  ShoppingCart,
  FileCheck,
  BarChart3,
  Briefcase,
  Calendar,
  User,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useEffect } from 'react';

interface FactureSnapshotProps {
  facture: Facture;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  hasPrev: boolean;
  hasNext: boolean;
  currentIndex: number;
  totalCount: number;
  onNavigateToEntity: (type: 'bonCommande' | 'engagement' | 'ligneBudgetaire' | 'projet' | 'fournisseur', id: string) => void;
  onScrollProgress?: (progress: number) => void;
  // Actions disponibles
  onValider?: () => void;
  onMarquerPayee?: () => void;
  onAnnuler?: () => void;
  onEdit?: () => void;
  onCreerDepense?: () => void;
}

export const FactureSnapshot = ({
  facture,
  onClose,
  onNavigate,
  hasPrev,
  hasNext,
  currentIndex,
  totalCount,
  onNavigateToEntity,
  onScrollProgress,
  onValider,
  onMarquerPayee,
  onAnnuler,
  onEdit,
  onCreerDepense,
}: FactureSnapshotProps) => {
  // Scroller en haut de la page à l'ouverture du snapshot
  useEffect(() => {
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(montant);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: fr });
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd/MM/yyyy à HH:mm', { locale: fr });
  };

  const getStatutBadge = (statut: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      brouillon: { variant: 'outline' as const, label: 'Brouillon' },
      validee: { variant: 'secondary' as const, label: 'Validée' },
      payee: { variant: 'default' as const, label: 'Payée' },
      annulee: { variant: 'destructive' as const, label: 'Annulée' },
    };
    const config = variants[statut] || variants.brouillon;
    return <Badge variant={config.variant} className="text-sm">{config.label}</Badge>;
  };

  const soldeRestant = facture.montantTTC - facture.montantPaye;
  const progressPaiement = facture.montantTTC > 0 ? (facture.montantPaye / facture.montantTTC) * 100 : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header fixe */}
      <div className="sticky top-0 z-30 bg-background border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold">{facture.numero}</h2>
                <p className="text-sm text-muted-foreground">
                  Facture {currentIndex + 1} sur {totalCount}
                </p>
              </div>
              {getStatutBadge(facture.statut)}
            </div>
            
            <div className="flex items-center gap-2">
              {/* Navigation prev/next */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => onNavigate('prev')}
                disabled={!hasPrev}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onNavigate('next')}
                disabled={!hasNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <Separator orientation="vertical" className="h-8 mx-2" />
              
              {/* Bouton fermer */}
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Barre d'actions */}
        <div className="px-6 pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            {facture.statut === 'brouillon' && onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Modifier
              </Button>
            )}
            
            {facture.statut === 'brouillon' && onValider && (
              <Button variant="default" size="sm" onClick={onValider}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Valider
              </Button>
            )}
            
            {facture.statut === 'validee' && onMarquerPayee && (
              <Button variant="default" size="sm" onClick={onMarquerPayee}>
                <DollarSign className="mr-2 h-4 w-4" />
                Marquer comme payée
              </Button>
            )}
            
            {(facture.statut === 'validee' || facture.statut === 'payee') && onCreerDepense && (
              <Button variant="outline" size="sm" onClick={onCreerDepense}>
                <FileText className="mr-2 h-4 w-4" />
                Créer une dépense
              </Button>
            )}
            
            {facture.statut !== 'annulee' && facture.statut !== 'payee' && onAnnuler && (
              <Button variant="destructive" size="sm" onClick={onAnnuler}>
                <XCircle className="mr-2 h-4 w-4" />
                Annuler
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Corps scrollable */}
      <div className="flex-1 px-6 py-6 space-y-6 overflow-y-auto">
        {/* Section 1: Informations principales */}
        <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informations principales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Date de facture</p>
                  <p className="font-medium">{formatDate(facture.dateFacture)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Date d'échéance</p>
                  <p className="font-medium">{formatDate(facture.dateEcheance)}</p>
                </div>
              </div>
              
              {facture.numeroFactureFournisseur && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">N° Facture fournisseur</p>
                  <p className="font-medium">{facture.numeroFactureFournisseur}</p>
                </div>
              )}
              
              <div>
                <p className="text-sm text-muted-foreground mb-1">Objet</p>
                <p className="text-lg font-semibold">{facture.objet}</p>
              </div>

              {/* Bon de commande lié */}
              {facture.bonCommande && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Bon de commande</p>
                  <button
                    onClick={() => onNavigateToEntity('bonCommande', facture.bonCommande!.id)}
                    className="font-medium text-primary hover:underline flex items-center gap-2 transition-colors"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    {facture.bonCommande.numero}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Engagement lié */}
              {facture.engagement && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Engagement</p>
                  <button
                    onClick={() => onNavigateToEntity('engagement', facture.engagement!.id)}
                    className="font-medium text-primary hover:underline flex items-center gap-2 transition-colors"
                  >
                    <FileCheck className="h-4 w-4" />
                    {facture.engagement.numero}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Ligne budgétaire liée */}
              {facture.ligneBudgetaire && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Ligne budgétaire</p>
                  <button
                    onClick={() => onNavigateToEntity('ligneBudgetaire', facture.ligneBudgetaire!.id)}
                    className="font-medium text-primary hover:underline flex items-center gap-2 transition-colors"
                  >
                    <BarChart3 className="h-4 w-4" />
                    {facture.ligneBudgetaire.libelle}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Projet lié */}
              {facture.projet && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Projet</p>
                  <button
                    onClick={() => onNavigateToEntity('projet', facture.projet!.id)}
                    className="font-medium text-primary hover:underline flex items-center gap-2 transition-colors"
                  >
                    <Briefcase className="h-4 w-4" />
                    {facture.projet.nom}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}
              
              {facture.observations && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Observations</p>
                  <p className="text-sm whitespace-pre-wrap">{facture.observations}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 2: Fournisseur */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Fournisseur
              </CardTitle>
            </CardHeader>
            <CardContent>
              {facture.fournisseur ? (
                <div className="space-y-2">
                  <div>
                    <button
                      onClick={() => onNavigateToEntity('fournisseur', facture.fournisseurId)}
                      className="text-lg font-semibold text-primary hover:underline flex items-center gap-2 transition-colors"
                    >
                      {facture.fournisseur.nom}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <p className="text-sm text-muted-foreground">Code: {facture.fournisseur.code}</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Aucun fournisseur associé</p>
              )}
            </CardContent>
          </Card>

          {/* Section 3: Montants */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Montants
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Montant HT</p>
                  <p className="text-lg font-medium">{formatMontant(facture.montantHT)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">TVA</p>
                  <p className="text-lg font-medium">{formatMontant(facture.montantTVA)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Montant TTC</p>
                  <p className="text-2xl font-bold text-primary">{formatMontant(facture.montantTTC)}</p>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm text-muted-foreground">Paiement</p>
                  <p className="text-sm font-medium">{progressPaiement.toFixed(0)}%</p>
                </div>
                <Progress value={progressPaiement} className="h-2 mb-2" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payé: {formatMontant(facture.montantPaye)}</span>
                  <span className={soldeRestant > 0 ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                    Solde: {formatMontant(soldeRestant)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>


          {/* Section 5: Historique & Traçabilité */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Historique & Traçabilité
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Créée le
                  </p>
                  <p className="text-sm font-medium">{formatDateTime(facture.createdAt)}</p>
                </div>
                
                {facture.dateValidation && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Validée le
                    </p>
                    <p className="text-sm font-medium">{formatDateTime(facture.dateValidation)}</p>
                  </div>
                )}
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Dernière modification
                </p>
                <p className="text-sm font-medium">{formatDateTime(facture.updatedAt)}</p>
              </div>
              
              {facture.statut === 'annulee' && facture.observations && (
                <div className="pt-3 border-t">
                  <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    Motif d'annulation
                  </p>
                  <p className="text-sm text-destructive">{facture.observations}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
  );
};
