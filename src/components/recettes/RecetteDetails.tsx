import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import type { Recette } from '@/types/recette.types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { XCircle, Pencil } from 'lucide-react';

interface RecetteDetailsProps {
  recette: Recette;
  onClose: () => void;
  onEdit?: () => void;
  onAnnuler?: () => void;
}

export const RecetteDetails = ({ recette, onClose, onEdit, onAnnuler }: RecetteDetailsProps) => (
  <div className="space-y-6">
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant={recette.statut === 'validee' ? 'default' : 'destructive'}>
            {recette.statut === 'validee' ? 'Validée' : 'Annulée'}
          </Badge>
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Recette {recette.numero}</h1>
          <p className="text-muted-foreground">{recette.libelle}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onClose}>Retour aux recettes</Button>
        {onEdit && recette.statut === 'validee' && <Button variant="outline" onClick={onEdit}><Pencil className="mr-2 h-4 w-4" />Modifier</Button>}
        {onAnnuler && recette.statut === 'validee' && <Button variant="destructive" onClick={onAnnuler}><XCircle className="mr-2 h-4 w-4" />Annuler la recette</Button>}
      </div>
    </div>

    <Card>
      <CardHeader><CardTitle>Informations principales</CardTitle></CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div><p className="text-sm text-muted-foreground">Date de recette</p><p className="font-medium">{format(new Date(recette.dateRecette), 'dd MMMM yyyy', { locale: fr })}</p></div>
        <div><p className="text-sm text-muted-foreground">Montant</p><p className="text-xl font-bold text-green-600">{formatCurrency(recette.montant)}</p></div>
        <div><p className="text-sm text-muted-foreground">Source</p><p className="font-medium">{recette.sourceRecette}</p></div>
        <div><p className="text-sm text-muted-foreground">Compte de destination</p><p className="font-medium">{recette.compteDestination ? `${recette.compteDestination.code} - ${recette.compteDestination.libelle}` : '-'}</p></div>
        <div><p className="text-sm text-muted-foreground">Catégorie</p><p className="font-medium">{recette.categorie || '-'}</p></div>
        <div><p className="text-sm text-muted-foreground">Bénéficiaire</p><p className="font-medium">{recette.beneficiaire || '-'}</p></div>
        <div><p className="text-sm text-muted-foreground">Référence</p><p className="font-medium">{recette.reference || '-'}</p></div>
      </CardContent>
    </Card>

    {recette.observations && (
      <Card>
        <CardHeader><CardTitle>Observations</CardTitle></CardHeader>
        <CardContent><p className="text-sm whitespace-pre-wrap">{recette.observations}</p></CardContent>
      </Card>
    )}

    {recette.statut === 'annulee' && recette.motifAnnulation && (
      <Card>
        <CardHeader><CardTitle>Annulation</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-destructive">{recette.motifAnnulation}</p>
          {recette.dateAnnulation && <p className="text-xs text-muted-foreground">Annulée le {format(new Date(recette.dateAnnulation), 'dd MMMM yyyy', { locale: fr })}</p>}
        </CardContent>
      </Card>
    )}
  </div>
);
