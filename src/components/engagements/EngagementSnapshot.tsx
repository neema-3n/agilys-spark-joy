import { Engagement } from '@/types/engagement.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  XCircle, 
  Pencil, 
  FileText,
  ArrowRight,
  ShoppingCart,
  BarChart3,
  Briefcase,
  Calendar,
  User,
  Clock,
  Building2,
  CreditCard,
  Package
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useEffect } from 'react';

interface EngagementSnapshotProps {
  engagement: Engagement;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  hasPrev: boolean;
  hasNext: boolean;
  currentIndex: number;
  totalCount: number;
  onScrollProgress?: (progress: number) => void;
  // Actions disponibles
  onValider?: () => void;
  onAnnuler?: () => void;
  onEdit?: () => void;
  onCreerBonCommande?: () => void;
  onCreerDepense?: () => void;
}

export const EngagementSnapshot = ({
  engagement,
  onClose,
  onNavigate,
  hasPrev,
  hasNext,
  currentIndex,
  totalCount,
  onScrollProgress,
  onValider,
  onAnnuler,
  onEdit,
  onCreerBonCommande,
  onCreerDepense,
}: EngagementSnapshotProps) => {
  // Scroller en haut de la page à l'ouverture du snapshot
  useEffect(() => {
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const getEntityUrl = (type: string, id: string): string => {
    switch (type) {
      case 'fournisseur':
        return `/app/fournisseurs/${id}`;
      case 'reservation':
        return `/app/reservations/${id}`;
      case 'ligneBudgetaire':
        return `/app/budgets?ligneId=${id}`;
      case 'projet':
        return `/app/projets/${id}`;
      case 'bonCommande':
        return `/app/bons-commande/${id}`;
      default:
        return '#';
    }
  };

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
      valide: { variant: 'secondary' as const, label: 'Validé' },
      engage: { variant: 'default' as const, label: 'Engagé' },
      liquide: { variant: 'default' as const, label: 'Liquidé' },
      annule: { variant: 'destructive' as const, label: 'Annulé' },
    };
    const config = variants[statut] || variants.brouillon;
    return <Badge variant={config.variant} className="text-sm">{config.label}</Badge>;
  };

  const soldeRestant = engagement.solde ?? engagement.montant;
  const progressUtilisation = engagement.montant > 0 ? ((engagement.montant - soldeRestant) / engagement.montant) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header avec navigation et actions */}
      <div className="bg-background border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold">{engagement.numero}</h2>
                <p className="text-sm text-muted-foreground">
                  Engagement {currentIndex + 1} sur {totalCount}
                </p>
              </div>
              {getStatutBadge(engagement.statut)}
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
            {engagement.statut === 'brouillon' && onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Modifier
              </Button>
            )}
            
            {engagement.statut === 'brouillon' && onValider && (
              <Button variant="default" size="sm" onClick={onValider}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Valider
              </Button>
            )}
            
            {engagement.statut === 'valide' && onCreerBonCommande && (
              <Button variant="default" size="sm" onClick={onCreerBonCommande}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Créer un BC
              </Button>
            )}
            
            {(engagement.statut === 'valide' || engagement.statut === 'engage') && onCreerDepense && (
              <Button variant="outline" size="sm" onClick={onCreerDepense}>
                <FileText className="mr-2 h-4 w-4" />
                Créer une dépense
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="px-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* En-tête avec statut */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-2xl">{engagement.objet}</CardTitle>
                  <CardDescription>Engagement n° {engagement.numero}</CardDescription>
                </div>
                {getStatutBadge(engagement.statut)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Informations principales */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Montant de l'engagement</p>
                    <p className="text-3xl font-bold">{formatMontant(engagement.montant)}</p>
                  </div>

                  {engagement.ligneBudgetaire && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Ligne budgétaire
                      </p>
                      <Link
                        to={getEntityUrl('ligneBudgetaire', engagement.ligneBudgetaireId)}
                        className="font-medium text-primary hover:underline flex items-center gap-2 transition-colors"
                      >
                        {engagement.ligneBudgetaire.libelle}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  )}

                  {engagement.beneficiaire && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Bénéficiaire
                      </p>
                      <p className="font-medium">{engagement.beneficiaire}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {engagement.fournisseur && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Fournisseur
                      </p>
                      <Link
                        to={getEntityUrl('fournisseur', engagement.fournisseurId!)}
                        className="font-medium text-primary hover:underline flex items-center gap-2 transition-colors"
                      >
                        {engagement.fournisseur.nom}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  )}

                  {engagement.projet && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        Projet
                      </p>
                      <Link
                        to={getEntityUrl('projet', engagement.projetId!)}
                        className="font-medium text-primary hover:underline flex items-center gap-2 transition-colors"
                      >
                        {engagement.projet.code} - {engagement.projet.nom}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  )}

                  {engagement.reservationCredit && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Réservation de crédit
                      </p>
                      <Link
                        to={getEntityUrl('reservation', engagement.reservationCreditId!)}
                        className="font-medium text-primary hover:underline flex items-center gap-2 transition-colors"
                      >
                        {engagement.reservationCredit.numero}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Progression de l'utilisation */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Utilisation de l'engagement</span>
                  <span className="text-sm text-muted-foreground">
                    {formatMontant(engagement.montant - soldeRestant)} / {formatMontant(engagement.montant)}
                  </span>
                </div>
                <Progress value={progressUtilisation} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Solde restant : {formatMontant(soldeRestant)}</span>
                  <span>{progressUtilisation.toFixed(1)}% utilisé</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dates importantes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Dates importantes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Date de création</p>
                  <p className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {formatDate(engagement.dateCreation)}
                  </p>
                </div>
                {engagement.dateValidation && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Date de validation</p>
                    <p className="font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {formatDate(engagement.dateValidation)}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Observations */}
          {engagement.observations && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
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
                <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                  <XCircle className="h-5 w-5" />
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
              <CardTitle className="text-lg">Métadonnées</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Créé le : </span>
                  <span className="font-medium">{formatDateTime(engagement.createdAt)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Modifié le : </span>
                  <span className="font-medium">{formatDateTime(engagement.updatedAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
