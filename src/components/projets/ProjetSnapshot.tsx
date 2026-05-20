import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Briefcase,
  Calendar,
  Edit2,
  FileCheck,
  FileText,
  FolderKanban,
  Layers3,
  Receipt,
  ShoppingCart,
  Trash2,
  User,
  Wallet,
} from 'lucide-react';
import type { Projet } from '@/types/projet.types';
import { SnapshotBase } from '@/components/shared/SnapshotBase';
import { SnapshotLinkedEntitiesCard } from '@/components/shared/SnapshotLinkedEntitiesCard';
import { SnapshotPrimaryCard } from '@/components/shared/SnapshotPrimaryCard';
import { formatDate, formatMontant, getEntityUrl } from '@/lib/snapshot-utils';
import { ProjetStatusBadge } from '@/components/ui/status-badge';
import {
  ProjetPrioriteBadge,
  getProjetBudgetConsumptionRate,
  getProjetBudgetDisponible,
  getProjetBudgetEngagementRate,
} from '@/components/projets/projet-ui';
import { useEnveloppes } from '@/hooks/useEnveloppes';
import { useNavigate } from 'react-router-dom';
import { useProjetOverview } from '@/hooks/useProjetOverview';

interface ProjetSnapshotProps {
  projet: Projet;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  hasPrev: boolean;
  hasNext: boolean;
  currentIndex: number;
  totalCount: number;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const ProjetSnapshot = ({
  projet,
  onClose,
  onNavigate,
  hasPrev,
  hasNext,
  currentIndex,
  totalCount,
  onEdit,
  onDelete,
}: ProjetSnapshotProps) => {
  const navigate = useNavigate();
  const { enveloppes } = useEnveloppes();
  const overview = useProjetOverview(projet.id);
  const enveloppe = projet.enveloppeId
    ? enveloppes.find((item) => item.id === projet.enveloppeId)
    : undefined;
  const budgetDisponible = getProjetBudgetDisponible(projet);
  const tauxConsommation = getProjetBudgetConsumptionRate(projet);
  const tauxEngagement = getProjetBudgetEngagementRate(projet);
  const pipelineStages = [
    {
      key: 'engagements',
      label: 'Engagements',
      icon: <FileCheck className="h-4 w-4" />,
      count: overview.active.engagements.count,
      amount: overview.active.engagements.amount,
    },
    {
      key: 'bons-commande',
      label: 'Bons de commande',
      icon: <ShoppingCart className="h-4 w-4" />,
      count: overview.active.bonsCommande.count,
      amount: overview.active.bonsCommande.amount,
    },
    {
      key: 'factures',
      label: 'Factures',
      icon: <Receipt className="h-4 w-4" />,
      count: overview.active.factures.count,
      amount: overview.active.factures.amount,
    },
    {
      key: 'depenses',
      label: 'Dépenses',
      icon: <Wallet className="h-4 w-4" />,
      count: overview.active.depenses.count,
      amount: overview.active.depenses.amount,
    },
    {
      key: 'paiements',
      label: 'Paiements',
      icon: <FileText className="h-4 w-4" />,
      count: overview.active.paiements.count,
      amount: overview.active.paiements.amount,
    },
  ];

  const recentEntitySections = [
    {
      title: 'Derniers engagements',
      icon: <FileCheck className="h-4 w-4" />,
      items: overview.recent.engagements.map((item) => ({
        key: item.id,
        title: item.numero,
        subtitle: item.objet,
        amount: item.montant,
        date: item.dateCreation,
        to: getEntityUrl('engagement', item.id),
        badge: item.statut,
      })),
    },
    {
      title: 'Derniers BC',
      icon: <ShoppingCart className="h-4 w-4" />,
      items: overview.recent.bonsCommande.map((item) => ({
        key: item.id,
        title: item.numero,
        subtitle: item.objet,
        amount: item.montant,
        date: item.dateCommande,
        to: getEntityUrl('bon-commande', item.id),
        badge: item.statut,
      })),
    },
    {
      title: 'Dernières factures',
      icon: <Receipt className="h-4 w-4" />,
      items: overview.recent.factures.map((item) => ({
        key: item.id,
        title: item.numero,
        subtitle: item.objet,
        amount: item.montantTTC,
        date: item.dateFacture,
        to: getEntityUrl('facture', item.id),
        badge: item.statut,
      })),
    },
    {
      title: 'Dernières dépenses',
      icon: <Wallet className="h-4 w-4" />,
      items: overview.recent.depenses.map((item) => ({
        key: item.id,
        title: item.numero,
        subtitle: item.objet,
        amount: item.montant,
        date: item.dateDepense,
        to: getEntityUrl('depense', item.id),
        badge: item.statut,
      })),
    },
    {
      title: 'Derniers paiements',
      icon: <FileText className="h-4 w-4" />,
      items: overview.recent.paiements.map((item) => ({
        key: item.id,
        title: item.numero,
        subtitle: item.objet || item.depense?.numero || 'Paiement',
        amount: item.montant,
        date: item.datePaiement,
        to: getEntityUrl('paiement', item.id),
        badge: item.statut,
      })),
    },
  ];
  const stageRoutes: Record<string, string> = {
    engagements: '/app/engagements',
    'bons-commande': '/app/bons-commande',
    factures: '/app/factures',
    depenses: '/app/depenses',
    paiements: '/app/paiements',
  };

  const actions = (
    <>
      {onEdit ? (
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Edit2 className="mr-2 h-4 w-4" />
          Modifier
        </Button>
      ) : null}
      {onDelete ? (
        <Button variant="destructive" size="sm" onClick={onDelete}>
          <Trash2 className="mr-2 h-4 w-4" />
          Supprimer
        </Button>
      ) : null}
    </>
  );

  return (
    <SnapshotBase
      title={projet.nom}
      subtitle={`Projet ${projet.code}`}
      statusBadge={<ProjetStatusBadge status={projet.statut} />}
      currentIndex={currentIndex}
      totalCount={totalCount}
      hasPrev={hasPrev}
      hasNext={hasNext}
      onClose={onClose}
      onNavigate={onNavigate}
      actions={actions}
    >
      <SnapshotPrimaryCard
        icon={<FolderKanban className="h-5 w-5" />}
        statusBadge={<ProjetPrioriteBadge priorite={projet.priorite} />}
        metrics={[
          {
            label: 'Budget alloué',
            value: formatMontant(projet.budgetAlloue),
            tone: 'primary',
          },
          {
            label: 'Budget engagé',
            value: formatMontant(projet.budgetEngage),
            hint: `${tauxEngagement.toFixed(0)}% du budget`,
          },
          {
            label: 'Budget consommé',
            value: formatMontant(projet.budgetConsomme),
            hint: `${tauxConsommation.toFixed(0)}% consommé`,
            tone: tauxConsommation > 90 ? 'warning' : 'default',
          },
          {
            label: 'Disponible',
            value: formatMontant(budgetDisponible),
            tone: budgetDisponible < 0 ? 'danger' : 'success',
          },
        ]}
        details={[
          {
            label: 'Code projet',
            value: projet.code,
          },
          {
            label: 'Responsable',
            value: projet.responsable || '—',
          },
          {
            label: 'Période',
            value: `${formatDate(projet.dateDebut)} - ${formatDate(projet.dateFin)}`,
          },
          {
            label: 'Type de projet',
            value: projet.typeProjet || '—',
          },
        ]}
        footer={
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Avancement du projet</span>
                <span className="font-medium">{projet.tauxAvancement}%</span>
              </div>
              <Progress value={projet.tauxAvancement} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Consommation budgétaire</span>
                <span className="font-medium">{tauxConsommation.toFixed(0)}%</span>
              </div>
              <Progress value={Math.min(100, tauxConsommation)} className="h-2" />
            </div>
          </div>
        }
      />

      <SnapshotLinkedEntitiesCard
        items={[
          enveloppe
            ? {
                key: 'enveloppe',
                label: 'Enveloppe budgétaire',
                value: `${enveloppe.code} - ${enveloppe.nom}`,
                description: enveloppe.sourceFinancement,
                icon: <Layers3 className="h-4 w-4" />,
                onClick: () => navigate(`/app/parametres/enveloppes/${enveloppe.id}/edit`),
              }
            : null,
          {
            key: 'budget',
            label: 'Plan budgétaire',
            value: 'Ouvrir les lignes budgétaires',
            description: 'Accéder au budget pour arbitrage et traçabilité.',
            icon: <Briefcase className="h-4 w-4" />,
            onClick: () => navigate('/app/budgets?tab=lignes'),
          },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Lecture transverse du projet
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Reste à engager</p>
            <p className="text-2xl font-semibold">{formatMontant(overview.totals.resteAEngager)}</p>
            <p className="text-sm text-muted-foreground">
              ENG non encore matérialisés en BC.
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Reste à liquider</p>
            <p className="text-2xl font-semibold">{formatMontant(overview.totals.resteAFacturer)}</p>
            <p className="text-sm text-muted-foreground">
              Factures non encore reflétées en dépenses.
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Reste à payer</p>
            <p className="text-2xl font-semibold">{formatMontant(overview.totals.resteAPayer)}</p>
            <p className="text-sm text-muted-foreground">
              Dépenses encore non réglées.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers3 className="h-5 w-5" />
            Pipeline du projet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pipelineStages.map((stage) => (
            <button
              key={stage.key}
              type="button"
              onClick={() => navigate(stageRoutes[stage.key] || '/app')}
              className="flex w-full items-center justify-between rounded-lg border p-3 text-left transition hover:bg-muted/30"
            >
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">{stage.icon}</span>
                <div>
                  <p className="font-medium">{stage.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {stage.count} élément(s)
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium">{formatMontant(stage.amount)}</p>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Pilotage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground">Responsable</p>
              <p className="font-medium">{projet.responsable || 'Non renseigné'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Priorité</p>
              <div>{projet.priorite ? <ProjetPrioriteBadge priorite={projet.priorite} /> : '—'}</div>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Type</p>
              <p className="font-medium">{projet.typeProjet || 'Non renseigné'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Description et cadence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground">Fenêtre projet</p>
              <p className="font-medium">
                {formatDate(projet.dateDebut)} - {formatDate(projet.dateFin)}
              </p>
            </div>
            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground">Description</p>
              <p className="whitespace-pre-wrap text-muted-foreground">
                {projet.description || 'Aucune description fournie.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {recentEntitySections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {section.icon}
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {overview.isLoading ? (
                <p className="text-sm text-muted-foreground">Chargement...</p>
              ) : section.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun élément lié.</p>
              ) : (
                <div className="space-y-3">
                  {section.items.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => navigate(item.to)}
                      className="flex w-full items-start justify-between gap-4 rounded-lg border p-3 text-left transition hover:bg-muted/30"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{item.title}</p>
                          <Badge variant="outline" className="text-[11px]">
                            {item.badge}
                          </Badge>
                        </div>
                        <p className="truncate text-sm text-muted-foreground">{item.subtitle}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{formatDate(item.date)}</p>
                      </div>
                      <div className="text-right font-medium">{formatMontant(item.amount)}</div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </SnapshotBase>
  );
};
