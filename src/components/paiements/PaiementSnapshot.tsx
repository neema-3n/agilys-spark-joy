import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SnapshotBase } from '@/components/shared/SnapshotBase';
import { SnapshotLinkedEntitiesCard } from '@/components/shared/SnapshotLinkedEntitiesCard';
import { SnapshotPrimaryCard } from '@/components/shared/SnapshotPrimaryCard';
import type { Paiement } from '@/types/paiement.types';
import { formatMontant, formatDate } from '@/lib/snapshot-utils';
import { Building2, Calendar, FileText, Pencil, Wallet } from 'lucide-react';

interface PaiementSnapshotProps {
  paiement: Paiement;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  hasPrev: boolean;
  hasNext: boolean;
  currentIndex: number;
  totalCount: number;
  onAnnuler?: () => void;
  onEdit?: () => void;
  onValidate?: () => void;
  onNavigateToEntity?: (type: string, id: string) => void;
}

const modeLabels: Record<string, string> = {
  virement: 'Virement',
  cheque: 'Chèque',
  especes: 'Espèces',
  carte: 'Carte',
  autre: 'Autre',
};

export const PaiementSnapshot = ({
  paiement,
  onClose,
  onNavigate,
  hasPrev,
  hasNext,
  currentIndex,
  totalCount,
  onAnnuler,
  onEdit,
  onValidate,
  onNavigateToEntity,
}: PaiementSnapshotProps) => {
  const actions = (
    <div className="flex flex-wrap gap-2">
      {onEdit && paiement.statut === 'brouillon' && (
        <Button size="sm" variant="outline" onClick={onEdit}>
          <Pencil className="mr-2 h-4 w-4" />
          Modifier
        </Button>
      )}
      {onValidate && paiement.statut === 'brouillon' && (
        <Button size="sm" onClick={onValidate}>
          Valider
        </Button>
      )}
      {onAnnuler && paiement.statut === 'valide' && (
        <Button size="sm" variant="outline" onClick={onAnnuler}>
          Annuler
        </Button>
      )}
    </div>
  );

  return (
    <SnapshotBase
      title={`Paiement ${paiement.numero}`}
      subtitle={paiement.depense?.numero || paiement.objet || 'Paiement direct'}
      currentIndex={currentIndex}
      totalCount={totalCount}
      hasPrev={hasPrev}
      hasNext={hasNext}
      onClose={onClose}
      onNavigate={onNavigate}
      actions={actions}
    >
      <SnapshotPrimaryCard
        icon={<Wallet className="h-5 w-5" />}
        statusBadge={
          <Badge
            variant={
              paiement.statut === 'valide'
                ? 'success'
                : paiement.statut === 'brouillon'
                  ? 'secondary'
                  : 'destructive'
            }
          >
            {paiement.statut === 'valide'
              ? 'Validé'
              : paiement.statut === 'brouillon'
                ? 'Brouillon'
                : 'Annulé'}
          </Badge>
        }
        metrics={[
          {
            label: 'Montant payé',
            value: formatMontant(paiement.montant),
            tone: 'primary',
          },
          {
            label: 'Mode de paiement',
            value: modeLabels[paiement.modePaiement] || paiement.modePaiement,
          },
        ]}
        details={[
          {
            label: 'Date de paiement',
            value: formatDate(paiement.datePaiement),
          },
          {
            label: 'Référence de paiement',
            value: paiement.referencePaiement || '—',
          },
          {
            label: 'Compte de trésorerie',
            value: paiement.compteTresorerie
              ? `${paiement.compteTresorerie.code} - ${paiement.compteTresorerie.libelle}`
              : '—',
          },
          {
            label: 'Bénéficiaire',
            value: paiement.depense?.fournisseur?.nom || paiement.beneficiaire || 'Non renseigné',
          },
        ]}
      />

      <SnapshotLinkedEntitiesCard
        items={[
          {
            key: 'depense',
            label: 'Dépense liée',
            value: paiement.depense?.numero || paiement.objet || 'Paiement direct',
            description: paiement.depense?.objet || 'Paiement non rattaché à une dépense',
            icon: <FileText className="h-4 w-4" />,
            onClick:
              paiement.depense?.id && onNavigateToEntity
                ? () => onNavigateToEntity('depense', paiement.depense!.id)
                : undefined,
          },
          {
            key: 'fournisseur',
            label: 'Fournisseur',
            value: paiement.depense?.fournisseur?.nom || paiement.beneficiaire || 'Non renseigné',
            description: paiement.depense?.fournisseur?.code,
            icon: <Building2 className="h-4 w-4" />,
            onClick:
              paiement.depense?.fournisseur?.id && onNavigateToEntity
                ? () => onNavigateToEntity('fournisseur', paiement.depense!.fournisseur!.id)
                : undefined,
          },
        ]}
        emptyMessage="Aucune entité liée."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Observations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{paiement.observations || 'Aucune observation.'}</p>
        </CardContent>
      </Card>
    </SnapshotBase>
  );
};
