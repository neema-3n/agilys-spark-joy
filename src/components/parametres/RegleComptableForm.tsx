import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
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

const ACCOUNTING_OPERATION_TYPES: TypeOperation[] = ['facture', 'depense', 'paiement'];

const SENS_LABELS: Record<SensVentilation, string> = {
  ajout: 'Ajout',
  retrait: 'Retrait',
};

interface RegleComptableFormProps {
  regle?: RegleComptable;
  defaultTypeOperation?: TypeOperation;
  initialValues?: Partial<RegleComptable>;
  onCancel: () => void;
  onSuccess: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export function RegleComptableForm({
  regle,
  defaultTypeOperation = 'facture',
  initialValues,
  onCancel,
  onSuccess,
  onDirtyChange,
}: RegleComptableFormProps) {
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
  const [sourceMontant, setSourceMontant] = useState<SourceMontantComptable>(
    defaultTypeOperation === 'paiement' ? 'montant' : defaultTypeOperation === 'depense' ? 'montant' : 'montant_ht'
  );
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
    [comptes],
  );

  const getDefaultSourceMontant = useCallback((operation: TypeOperation, role: RoleLigneComptable): SourceMontantComptable => {
    if (role === 'ventilation') return 'ventilation_montant';
    if (role === 'reglement_tresorerie') return 'montant';
    if (operation === 'depense') return 'montant';
    return 'montant_ht';
  }, []);

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
      setSourceMontant(source.sourceMontant || getDefaultSourceMontant(source.typeOperation || defaultTypeOperation, source.roleLigne || 'charge_principale'));
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
    setSourceMontant(getDefaultSourceMontant(defaultTypeOperation, defaultTypeOperation === 'paiement' ? 'reglement_tresorerie' : 'charge_principale'));
    setDebitSource(defaultTypeOperation === 'paiement' ? 'compte_fixe' : 'charge_principale');
    setCreditSource('compte_fixe');
    setSensVentilation(undefined);
    setNatureVentilation(undefined);
    setConditions([]);
    setCompteDebitId('');
    setCompteCreditId('');
    setActif(true);
    setOrdre(0);
  }, [regle, initialValues, defaultTypeOperation]);

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
      setSourceMontant(getDefaultSourceMontant(typeOperation, roleLigne));
      setDebitSource('charge_principale');
    }

    if (roleLigne === 'reglement_tresorerie') {
      setPointComptable('reglement');
      setSourceMontant(getDefaultSourceMontant(typeOperation, roleLigne));
    }
  }, [getDefaultSourceMontant, natureVentilation, roleLigne, sensVentilation, typeOperation]);

  const initialSnapshot = useMemo(
    () => JSON.stringify({
      code: regle?.code || initialValues?.code || '',
      nom: regle?.nom || initialValues?.nom || '',
      description: regle?.description || initialValues?.description || '',
      permanente: regle?.permanente ?? initialValues?.permanente ?? true,
      dateDebut: regle?.dateDebut || initialValues?.dateDebut || '',
      dateFin: regle?.dateFin || initialValues?.dateFin || '',
      typeOperation: regle?.typeOperation || initialValues?.typeOperation || defaultTypeOperation,
      pointComptable: regle?.pointComptable || initialValues?.pointComptable || 'constatation',
      roleLigne: regle?.roleLigne || initialValues?.roleLigne || 'charge_principale',
      sourceMontant: regle?.sourceMontant || initialValues?.sourceMontant || getDefaultSourceMontant(regle?.typeOperation || initialValues?.typeOperation || defaultTypeOperation, regle?.roleLigne || initialValues?.roleLigne || 'charge_principale'),
      debitSource: regle?.debitSource || initialValues?.debitSource || 'compte_fixe',
      creditSource: regle?.creditSource || initialValues?.creditSource || 'compte_fixe',
      sensVentilation: regle?.sensVentilation || initialValues?.sensVentilation,
      natureVentilation: regle?.natureVentilation || initialValues?.natureVentilation,
      conditions: regle?.conditions || initialValues?.conditions || [],
      compteDebitId: regle?.compteDebitId || initialValues?.compteDebitId || '',
      compteCreditId: regle?.compteCreditId || initialValues?.compteCreditId || '',
      actif: regle?.actif ?? initialValues?.actif ?? true,
      ordre: regle?.ordre ?? initialValues?.ordre ?? 0,
    }),
    [regle, initialValues, defaultTypeOperation],
  );

  const currentSnapshot = JSON.stringify({
    code,
    nom,
    description,
    permanente,
    dateDebut,
    dateFin,
    typeOperation,
    pointComptable,
    roleLigne,
    sourceMontant,
    debitSource,
    creditSource,
    sensVentilation,
    natureVentilation,
    conditions,
    compteDebitId,
    compteCreditId,
    actif,
    ordre,
  });

  useEffect(() => {
    onDirtyChange?.(initialSnapshot !== currentSnapshot);
  }, [initialSnapshot, currentSnapshot, onDirtyChange]);

  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

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
        await updateRegle({ id: regle.id, input });
      } else {
        await createRegle({ clientId: currentClient.id, code, ...input });
      }

      onSuccess();
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
        <h3 className="text-sm font-semibold">Perimetre</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Type d'operation *</Label>
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
            <Label>Role de ligne *</Label>
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
              <Label>Source du compte debit *</Label>
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
                <Label>Compte debit fixe *</Label>
                <Select value={compteDebitId} onValueChange={setCompteDebitId}>
                  <SelectTrigger><SelectValue placeholder="Selectionner un compte" /></SelectTrigger>
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
              <p className="text-xs text-muted-foreground">Le debit sera resolu depuis la charge principale saisie sur l'operation.</p>
            )}
          </div>

          <div className="space-y-3 rounded-md border p-4">
            <div>
              <Label>Source du compte credit *</Label>
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
                <Label>Compte credit fixe *</Label>
                <Select value={compteCreditId} onValueChange={setCompteCreditId}>
                  <SelectTrigger><SelectValue placeholder="Selectionner un compte" /></SelectTrigger>
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
              <p className="text-xs text-muted-foreground">Le credit sera resolu depuis la charge principale saisie sur l'operation.</p>
            )}
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Periode et conditions</h3>
        <div className="flex items-center space-x-2">
          <Switch id="permanente" checked={permanente} onCheckedChange={setPermanente} />
          <Label htmlFor="permanente">Regle permanente</Label>
        </div>
        {!permanente ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date de debut</Label>
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
        <h3 className="text-sm font-semibold">Parametres</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="ordre">Ordre d'execution</Label>
            <Input id="ordre" type="number" value={ordre} onChange={(e) => setOrdre(Number(e.target.value))} min={0} />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <Switch id="actif" checked={actif} onCheckedChange={setActif} />
            <Label htmlFor="actif">Regle active</Label>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Enregistrement...' : regle ? 'Mettre a jour' : 'Creer'}
        </Button>
      </div>
    </form>
  );
}
