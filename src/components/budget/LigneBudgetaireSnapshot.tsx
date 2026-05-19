import { Action, LigneBudgetaire, Programme, Section } from '@/types/budget.types';
import type { Compte } from '@/types/compte.types';
import type { Enveloppe } from '@/types/enveloppe.types';
import { SnapshotBase } from '@/components/shared/SnapshotBase';
import { SnapshotPrimaryCard } from '@/components/shared/SnapshotPrimaryCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatMontant } from '@/lib/utils';
import { formatDate } from '@/lib/snapshot-utils';
import { BudgetStatusBadge } from '@/components/ui/status-badge';
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
      <SnapshotPrimaryCard
        icon={<LayoutList className="h-5 w-5" />}
        title="Synthèse budgétaire"
        metrics={[
          { label: 'Montant initial', value: formatMontant(ligne.montantInitial) },
          { label: 'Montant modifié', value: formatMontant(ligne.montantModifie), tone: 'primary' },
          { label: 'Réservé', value: formatMontant(ligne.montantReserve || 0), tone: 'warning' },
          { label: 'Engagé', value: formatMontant(ligne.montantEngage), tone: 'danger' },
          { label: 'Liquidé', value: formatMontant(ligne.montantLiquide), tone: 'primary' },
          { label: 'Payé', value: formatMontant(ligne.montantPaye), tone: 'success' },
          { label: 'Disponible', value: formatMontant(ligne.disponible), tone: 'success' },
        ]}
        details={[
          { label: "Taux d'exécution", value: <Badge variant="outline">{tauxExecution}%</Badge> },
          { label: 'Statut', value: <BudgetStatusBadge status={ligne.statut} /> },
          { label: 'Créée le', value: formatDate(ligne.dateCreation) },
        ]}
        footer={
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Taux d'exécution</span>
              <span className="font-medium">{tauxExecution}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-2 bg-primary" style={{ width: `${Math.min(tauxExecution, 100)}%` }} />
            </div>
          </div>
        }
      />

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
