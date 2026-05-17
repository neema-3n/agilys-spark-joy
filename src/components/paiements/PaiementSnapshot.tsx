import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SnapshotBase } from '@/components/shared/SnapshotBase';
import type { Paiement } from '@/types/paiement.types';
import { formatMontant, formatDate } from '@/lib/snapshot-utils';
import { Building2, Calendar, CreditCard, FileText, Wallet } from 'lucide-react';

interface PaiementSnapshotProps {
  paiement: Paiement;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  hasPrev: boolean;
  hasNext: boolean;
  currentIndex: number;
  totalCount: number;
  onAnnuler?: () => void;
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
  onNavigateToEntity,
}: PaiementSnapshotProps) => {
  const actions = (
    <div className="flex flex-wrap gap-2">
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
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Informations principales
            </CardTitle>
            <Badge variant={paiement.statut === 'valide' ? 'success' : 'destructive'}>
              {paiement.statut === 'valide' ? 'Validé' : 'Annulé'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Montant payé</p>
              <p className="text-2xl font-bold text-primary">{formatMontant(paiement.montant)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date de paiement</p>
              <p className="font-medium">{formatDate(paiement.datePaiement)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Mode de paiement</p>
              <p className="font-medium">{modeLabels[paiement.modePaiement] || paiement.modePaiement}</p>
            </div>
          </div>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => paiement.depense?.id && onNavigateToEntity?.('depense', paiement.depense.id)}
              className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition ${
                paiement.depense?.id && onNavigateToEntity ? 'cursor-pointer hover:bg-muted' : 'bg-muted/30'
              }`}
            >
              <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Dépense liée</p>
                <p className="font-medium">{paiement.depense?.numero || paiement.objet || 'Paiement direct'}</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                paiement.depense?.fournisseur?.id && onNavigateToEntity?.('fournisseur', paiement.depense.fournisseur.id)
              }
              className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition ${
                paiement.depense?.fournisseur?.id && onNavigateToEntity ? 'cursor-pointer hover:bg-muted' : 'bg-muted/30'
              }`}
            >
              <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Bénéficiaire / Fournisseur</p>
                <p className="font-medium">{paiement.depense?.fournisseur?.nom || paiement.beneficiaire || 'Non renseigné'}</p>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Détails financiers
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Montant HT</p>
            <p className="font-semibold">{formatMontant(paiement.montantHT || paiement.montant)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Montant TTC</p>
            <p className="font-semibold">{formatMontant(paiement.montantTTC || paiement.montant)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Montant net payé</p>
            <p className="font-semibold">{formatMontant(paiement.montantNetPaye || paiement.montant)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Ajouts</p>
            <p className="font-medium">{formatMontant(paiement.totalAjouts || 0)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Retraits</p>
            <p className="font-medium">{formatMontant(paiement.totalRetraits || 0)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Référence</p>
            <p className="font-medium">{paiement.referencePaiement || '—'}</p>
          </div>
        </CardContent>
      </Card>

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
