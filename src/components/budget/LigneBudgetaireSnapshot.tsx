import { Action, LigneBudgetaire, Programme, Section } from '@/types/budget.types';
import type { Compte } from '@/types/compte.types';
import type { Enveloppe } from '@/types/enveloppe.types';
import { SnapshotBase } from '@/components/shared/SnapshotBase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatMontant, formatDate } from '@/lib/snapshot-utils';
import { Activity, Building2, FolderOpen, GitBranch, LayoutList, Layers, Wallet } from 'lucide-react';

interface LigneBudgetaireSnapshotProps {
  ligne: LigneBudgetaire;
  section?: Section;
  programme?: Programme;
  action?: Action;
  compte?: Compte;
  enveloppe?: Enveloppe | null;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  hasPrev: boolean;
  hasNext: boolean;
  currentIndex: number;
  totalCount: number;
  onEdit?: () => void;
  onReserver?: () => void;
  onCreateModification?: () => void;
  onDelete?: () => void;
}

export const LigneBudgetaireSnapshot = ({
  ligne,
  section,
  programme,
  action,
  compte,
  enveloppe,
  onClose,
  onNavigate,
  hasPrev,
  hasNext,
  currentIndex,
  totalCount,
  onEdit,
  onReserver,
  onCreateModification,
  onDelete,
}: LigneBudgetaireSnapshotProps) => {
  const tauxExecution = ligne.montantModifie === 0 ? 0 : Math.round((ligne.montantEngage / ligne.montantModifie) * 100);

  const actions = (
    <>
      {onEdit && (
        <Button size="sm" variant="outline" onClick={onEdit}>
          Modifier
        </Button>
      )}
      {onCreateModification && (
        <Button size="sm" variant="outline" onClick={onCreateModification}>
          Créer modification
        </Button>
      )}
      {onReserver && ligne.disponible > 0 && (
        <Button size="sm" variant="outline" onClick={onReserver}>
          Réserver crédit
        </Button>
      )}
      {onDelete && (
        <Button size="sm" variant="destructive" onClick={onDelete}>
          Supprimer
        </Button>
      )}
    </>
  );

  return (
    <SnapshotBase
      title={ligne.libelle}
      subtitle={compte ? `${compte.numero} - ${compte.libelle}` : undefined}
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
          <CardTitle className="flex items-center gap-2">
            <LayoutList className="h-5 w-5" />
            Synthèse budgétaire
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Montant initial</p>
            <p className="text-xl font-semibold">{formatMontant(ligne.montantInitial)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Montant modifié</p>
            <p className="text-xl font-semibold text-primary">{formatMontant(ligne.montantModifie)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Réservé</p>
            <p className="text-lg font-medium text-orange-600">{formatMontant(ligne.montantReserve || 0)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Engagé</p>
            <p className="text-lg font-medium text-red-600">{formatMontant(ligne.montantEngage)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Payé</p>
            <p className="text-lg font-medium text-green-600">{formatMontant(ligne.montantPaye)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Disponible</p>
            <p className="text-xl font-semibold text-primary">{formatMontant(ligne.disponible)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Taux d'exécution</p>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{tauxExecution}%</Badge>
              <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                <div className="h-2 bg-primary" style={{ width: `${Math.min(tauxExecution, 100)}%` }} />
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Statut</p>
            <Badge variant={ligne.statut === 'actif' ? 'default' : 'secondary'}>
              {ligne.statut}
            </Badge>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Créée le</p>
            <p className="text-sm font-medium">{formatDate(ligne.dateCreation)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Hiérarchie budgétaire
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {section && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Layers className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Section {section.code}</p>
                <p className="text-sm text-muted-foreground">{section.libelle}</p>
              </div>
            </div>
          )}
          {programme && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <GitBranch className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Programme {programme.code}</p>
                <p className="text-sm text-muted-foreground">{programme.libelle}</p>
              </div>
            </div>
          )}
          {action && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Activity className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Action {action.code}</p>
                <p className="text-sm text-muted-foreground">{action.libelle}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Comptes & Enveloppe
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {compte && (
            <div className="p-3 rounded-lg bg-muted/40">
              <p className="text-sm text-muted-foreground">Compte</p>
              <p className="font-medium">{compte.numero}</p>
              <p className="text-sm text-muted-foreground">{compte.libelle}</p>
            </div>
          )}
          {enveloppe && (
            <div className="p-3 rounded-lg bg-muted/40">
              <p className="text-sm text-muted-foreground">Enveloppe</p>
              <p className="font-medium">{enveloppe.code}</p>
              <p className="text-sm text-muted-foreground">{enveloppe.nom}</p>
            </div>
          )}
          {!compte && !enveloppe && (
            <p className="text-sm text-muted-foreground">Pas d'informations complémentaires.</p>
          )}
        </CardContent>
      </Card>
    </SnapshotBase>
  );
};
