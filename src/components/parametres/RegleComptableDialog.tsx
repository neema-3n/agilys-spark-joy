import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useReglesComptables } from '@/hooks/useReglesComptables';
import { useComptes } from '@/hooks/useComptes';
import { useClient } from '@/contexts/ClientContext';
import { ConditionsBuilder } from './ConditionsBuilder';
import {
  NATURE_VENTILATION_LABELS,
  POINT_COMPTABLE_LABELS,
  ROLE_LIGNE_LABELS,
  SOURCE_COMPTE_LABELS,
  SOURCE_MONTANT_LABELS,
  TYPE_OPERATION_LABELS,
} from '@/lib/regles-comptables-fields';
import type {
  Condition,
  NatureVentilation,
  PointComptable,
  RegleComptable,
  RoleLigneComptable,
  SensVentilation,
  SourceCompteComptable,
  SourceMontantComptable,
  TypeOperation,
} from '@/types/regle-comptable.types';

interface RegleComptableDialogProps {
  open: boolean;
  onClose: () => void;
  regle?: RegleComptable;
  defaultTypeOperation?: TypeOperation;
  initialValues?: Partial<RegleComptable>;
}

const ACCOUNTING_OPERATION_TYPES: TypeOperation[] = ['facture', 'depense', 'paiement'];

const SENS_LABELS: Record<SensVentilation, string> = {
  ajout: 'Ajout',
  retrait: 'Retrait',
};

export const RegleComptableDialog = ({
  open,
  onClose,
  regle,
  defaultTypeOperation = 'facture',
  initialValues,
}: RegleComptableDialogProps) => {
  const { currentClient } = useClient();
  const { createRegle, updateRegle } = useReglesComptables();
  const { comptes } = useComptes();

  const [code, setCode] = useState('');
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [permanente, setPermanente] = useState(true);
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [typeOperation, setTypeOperation] = useState<TypeOperation>(defaultTypeOperation);
  const [pointComptable, setPointComptable] = useState<PointComptable>('constatation');
  const [roleLigne, setRoleLigne] = useState<RoleLigneComptable>('charge_principale');
  const [sourceMontant, setSourceMontant] = useState<SourceMontantComptable>('montant_ht');
  const [debitSource, setDebitSource] = useState<SourceCompteComptable>('charge_principale');
  const [creditSource, setCreditSource] = useState<SourceCompteComptable>('compte_fixe');
  const [sensVentilation, setSensVentilation] = useState<SensVentilation | undefined>();
  const [natureVentilation, setNatureVentilation] = useState<NatureVentilation | undefined>();
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [compteDebitId, setCompteDebitId] = useState('');
  const [compteCreditId, setCompteCreditId] = useState('');
  const [actif, setActif] = useState(true);
  const [ordre, setOrdre] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const comptesOptions = useMemo(
    () => comptes.filter((compte) => compte.statut === 'actif').sort((a, b) => a.numero.localeCompare(b.numero)),
    [comptes]
  );

  useEffect(() => {
    const source = regle || initialValues;

    if (source) {
      setCode(source.code || '');
      setNom(source.nom || '');
      setDescription(source.description || '');
      setPermanente(source.permanente ?? true);
      setDateDebut(source.dateDebut || '');
      setDateFin(source.dateFin || '');
      setTypeOperation(source.typeOperation || defaultTypeOperation);
      setPointComptable(source.pointComptable || 'constatation');
      setRoleLigne(source.roleLigne || 'charge_principale');
      setSourceMontant(source.sourceMontant || 'montant_ht');
      setDebitSource(source.debitSource || 'compte_fixe');
      setCreditSource(source.creditSource || 'compte_fixe');
      setSensVentilation(source.sensVentilation);
      setNatureVentilation(source.natureVentilation);
      setConditions(source.conditions || []);
      setCompteDebitId(source.compteDebitId || '');
      setCompteCreditId(source.compteCreditId || '');
      setActif(source.actif ?? true);
      setOrdre(source.ordre ?? 0);
      return;
    }

    setCode('');
    setNom('');
    setDescription('');
    setPermanente(true);
    setDateDebut('');
    setDateFin('');
    setTypeOperation(defaultTypeOperation);
    setPointComptable('constatation');
    setRoleLigne(defaultTypeOperation === 'paiement' ? 'reglement_tresorerie' : 'charge_principale');
    setSourceMontant(defaultTypeOperation === 'paiement' ? 'montant_net_paye' : 'montant_ht');
    setDebitSource(defaultTypeOperation === 'paiement' ? 'compte_fixe' : 'charge_principale');
    setCreditSource('compte_fixe');
    setSensVentilation(undefined);
    setNatureVentilation(undefined);
    setConditions([]);
    setCompteDebitId('');
    setCompteCreditId('');
    setActif(true);
    setOrdre(0);
  }, [regle, initialValues, defaultTypeOperation, open]);

  useEffect(() => {
    if (roleLigne === 'ventilation') {
      setSourceMontant('ventilation_montant');
      if (!sensVentilation) setSensVentilation('ajout');
      if (!natureVentilation) setNatureVentilation('taxe');
      return;
    }

    setSensVentilation(undefined);
    setNatureVentilation(undefined);

    if (roleLigne === 'charge_principale') {
      setSourceMontant('montant_ht');
      setDebitSource('charge_principale');
    }

    if (roleLigne === 'reglement_tresorerie') {
      setPointComptable('reglement');
      setSourceMontant('montant_net_paye');
    }
  }, [roleLigne, sensVentilation, natureVentilation]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentClient) return;

    if (debitSource === 'compte_fixe' && !compteDebitId) return;
    if (creditSource === 'compte_fixe' && !compteCreditId) return;

    setIsSubmitting(true);
    try {
      const input = {
        nom,
        description: description || undefined,
        permanente,
        dateDebut: permanente ? undefined : dateDebut || undefined,
        dateFin: permanente ? undefined : dateFin || undefined,
        typeOperation,
        pointComptable,
        roleLigne,
        sourceMontant,
        debitSource,
        creditSource,
        sensVentilation,
        natureVentilation,
        conditions,
        compteDebitId: debitSource === 'compte_fixe' ? compteDebitId : undefined,
        compteCreditId: creditSource === 'compte_fixe' ? compteCreditId : undefined,
        actif,
        ordre,
      };

      if (regle) {
        await updateRegle({
          id: regle.id,
          input,
        });
      } else {
        await createRegle({
          clientId: currentClient.id,
          code,
          ...input,
        });
      }

      onClose();
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {regle ? 'Modifier une règle' : 'Nouvelle règle comptable'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Identification</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Code *</Label>
                <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} required disabled={!!regle} />
              </div>
              <div>
                <Label htmlFor="nom">Nom *</Label>
                <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} required />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Périmètre</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Type d'opération *</Label>
                <Select value={typeOperation} onValueChange={(value: TypeOperation) => setTypeOperation(value)} disabled={!!regle}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACCOUNTING_OPERATION_TYPES.map((value) => (
                      <SelectItem key={value} value={value}>{TYPE_OPERATION_LABELS[value]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Moment comptable *</Label>
                <Select value={pointComptable} onValueChange={(value: PointComptable) => setPointComptable(value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(POINT_COMPTABLE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Composition comptable</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>Rôle de ligne *</Label>
                <Select value={roleLigne} onValueChange={(value: RoleLigneComptable) => setRoleLigne(value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LIGNE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Source du montant *</Label>
                <Select value={sourceMontant} onValueChange={(value: SourceMontantComptable) => setSourceMontant(value)} disabled={roleLigne === 'ventilation'}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SOURCE_MONTANT_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {roleLigne === 'ventilation' ? (
                <div>
                  <Label>Sens de ventilation</Label>
                  <Select value={sensVentilation} onValueChange={(value: SensVentilation) => setSensVentilation(value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(SENS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>

            {roleLigne === 'ventilation' ? (
              <div className="max-w-sm">
                <Label>Nature de ventilation</Label>
                <Select value={natureVentilation} onValueChange={(value: NatureVentilation) => setNatureVentilation(value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(NATURE_VENTILATION_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3 rounded-md border p-4">
                <div>
                  <Label>Source du compte débit *</Label>
                  <Select value={debitSource} onValueChange={(value: SourceCompteComptable) => setDebitSource(value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(SOURCE_COMPTE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {debitSource === 'compte_fixe' ? (
                  <div>
                    <Label>Compte débit fixe *</Label>
                    <Select value={compteDebitId} onValueChange={setCompteDebitId}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner un compte" /></SelectTrigger>
                      <SelectContent>
                        {comptesOptions.map((compte) => (
                          <SelectItem key={compte.id} value={compte.id}>
                            {compte.numero} - {compte.libelle}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Le débit sera résolu depuis la charge principale saisie sur l'opération.
                  </p>
                )}
              </div>

              <div className="space-y-3 rounded-md border p-4">
                <div>
                  <Label>Source du compte crédit *</Label>
                  <Select value={creditSource} onValueChange={(value: SourceCompteComptable) => setCreditSource(value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(SOURCE_COMPTE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {creditSource === 'compte_fixe' ? (
                  <div>
                    <Label>Compte crédit fixe *</Label>
                    <Select value={compteCreditId} onValueChange={setCompteCreditId}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner un compte" /></SelectTrigger>
                      <SelectContent>
                        {comptesOptions.map((compte) => (
                          <SelectItem key={compte.id} value={compte.id}>
                            {compte.numero} - {compte.libelle}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Le crédit sera résolu depuis la charge principale saisie sur l'opération.
                  </p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Période et conditions</h3>
            <div className="flex items-center space-x-2">
              <Switch id="permanente" checked={permanente} onCheckedChange={setPermanente} />
              <Label htmlFor="permanente">Règle permanente</Label>
            </div>
            {!permanente ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date de début</Label>
                  <Input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
                </div>
                <div>
                  <Label>Date de fin</Label>
                  <Input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
                </div>
              </div>
            ) : null}
            <ConditionsBuilder typeOperation={typeOperation} conditions={conditions} onChange={setConditions} />
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Paramètres</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="ordre">Ordre d'exécution</Label>
                <Input id="ordre" type="number" value={ordre} onChange={(e) => setOrdre(Number(e.target.value))} min={0} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch id="actif" checked={actif} onCheckedChange={setActif} />
                <Label htmlFor="actif">Règle active</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Enregistrement...' : regle ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
