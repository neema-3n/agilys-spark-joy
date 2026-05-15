import type { NatureCompte } from '@/types/nature-compte.types';
import type { Compte } from '@/types/compte.types';
import type { ChargePrincipaleMode } from '@/types/financial.types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface ChargePrincipaleFieldProps {
  mode: ChargePrincipaleMode;
  onModeChange: (mode: ChargePrincipaleMode) => void;
  natureCompteId?: string;
  onNatureCompteIdChange: (value?: string) => void;
  compteChargeId?: string;
  onCompteChargeIdChange: (value?: string) => void;
  naturesCompte: NatureCompte[];
  comptesCharge: Compte[];
}

export const ChargePrincipaleField = ({
  mode,
  onModeChange,
  natureCompteId,
  onNatureCompteIdChange,
  compteChargeId,
  onCompteChargeIdChange,
  naturesCompte,
  comptesCharge,
}: ChargePrincipaleFieldProps) => (
  <div className="space-y-3 rounded-md border p-4">
    <div className="flex items-center justify-between gap-2">
      <div className="space-y-1">
        <Label>Charge principale</Label>
        <p className="text-xs text-muted-foreground">
          Qualifie comptablement le montant HT.
        </p>
      </div>
      {mode === 'compte_expert' ? <Badge variant="secondary">Selection experte</Badge> : null}
    </div>

    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        variant={mode === 'nature' ? 'default' : 'outline'}
        onClick={() => onModeChange('nature')}
      >
        Mode standard
      </Button>
      <Button
        type="button"
        size="sm"
        variant={mode === 'compte_expert' ? 'default' : 'outline'}
        onClick={() => onModeChange('compte_expert')}
      >
        Voir tous les comptes
      </Button>
    </div>

    {mode === 'nature' ? (
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Nature de compte</Label>
        {naturesCompte.length > 0 && naturesCompte.every((nature) => nature.isFallback) ? (
          <p className="text-xs text-amber-700">
            Aucune nature de compte n'est encore paramétrée. Les comptes de charge actifs sont proposés en repli.
          </p>
        ) : null}
        <Select value={natureCompteId || ''} onValueChange={(value) => onNatureCompteIdChange(value || undefined)}>
          <SelectTrigger>
            <SelectValue placeholder="Selectionner une nature de compte" />
          </SelectTrigger>
          <SelectContent>
            {naturesCompte.map((nature) => (
              <SelectItem key={nature.id} value={nature.id}>
                {nature.libelle}
                {nature.compteDefaut ? ` - ${nature.compteDefaut.numero}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    ) : (
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Compte de charge</Label>
        <Select value={compteChargeId || ''} onValueChange={(value) => onCompteChargeIdChange(value || undefined)}>
          <SelectTrigger>
            <SelectValue placeholder="Selectionner un compte de charge" />
          </SelectTrigger>
          <SelectContent>
            {comptesCharge.map((compte) => (
              <SelectItem key={compte.id} value={compte.id}>
                {compte.libelle} - {compte.numero}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )}
  </div>
);
