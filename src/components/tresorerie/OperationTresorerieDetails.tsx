import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import type { OperationTresorerie } from '@/types/operation-tresorerie.types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowLeft } from 'lucide-react';

interface OperationTresorerieDetailsProps {
  operation: OperationTresorerie;
  onClose: () => void;
}

export const OperationTresorerieDetails = ({ operation, onClose }: OperationTresorerieDetailsProps) => (
  <div className="space-y-6">
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-2">
        <Badge variant={operation.statut === 'annulee' ? 'destructive' : 'default'}>
          {operation.statut === 'validee' ? 'Validée' : operation.statut === 'rapprochee' ? 'Rapprochée' : 'Annulée'}
        </Badge>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Opération {operation.numero}</h1>
          <p className="text-muted-foreground">{operation.libelle}</p>
        </div>
      </div>
      <Button variant="outline" onClick={onClose}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour aux opérations
      </Button>
    </div>

    <Card>
      <CardHeader><CardTitle>Informations principales</CardTitle></CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div><p className="text-sm text-muted-foreground">Date</p><p className="font-medium">{format(new Date(operation.dateOperation), 'dd MMMM yyyy', { locale: fr })}</p></div>
        <div><p className="text-sm text-muted-foreground">Montant</p><p className="font-medium">{formatCurrency(operation.montant)}</p></div>
        <div><p className="text-sm text-muted-foreground">Type</p><p className="font-medium capitalize">{operation.typeOperation}</p></div>
        <div><p className="text-sm text-muted-foreground">Mode de paiement</p><p className="font-medium">{operation.modePaiement || '-'}</p></div>
        <div><p className="text-sm text-muted-foreground">Compte</p><p className="font-medium">{operation.compte ? `${operation.compte.code} - ${operation.compte.libelle}` : '-'}</p></div>
        <div><p className="text-sm text-muted-foreground">Contrepartie</p><p className="font-medium">{operation.compteContrepartie ? `${operation.compteContrepartie.code} - ${operation.compteContrepartie.libelle}` : '-'}</p></div>
        <div><p className="text-sm text-muted-foreground">Catégorie</p><p className="font-medium">{operation.categorie || '-'}</p></div>
        <div><p className="text-sm text-muted-foreground">Référence bancaire</p><p className="font-medium">{operation.referenceBancaire || '-'}</p></div>
      </CardContent>
    </Card>

    {operation.observations && (
      <Card>
        <CardHeader><CardTitle>Observations</CardTitle></CardHeader>
        <CardContent><p className="text-sm whitespace-pre-wrap">{operation.observations}</p></CardContent>
      </Card>
    )}
  </div>
);
