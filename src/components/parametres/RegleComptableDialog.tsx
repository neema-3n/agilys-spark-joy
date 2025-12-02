import { useState, useEffect } from 'react';
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
import { TYPE_OPERATION_LABELS } from '@/lib/regles-comptables-fields';
import type { RegleComptable, TypeOperation, Condition } from '@/types/regle-comptable.types';
import { CompteDoubleSelect } from './CompteDoubleSelect';

interface RegleComptableDialogProps {
  open: boolean;
  onClose: () => void;
  regle?: RegleComptable;
  defaultTypeOperation?: TypeOperation;
  initialValues?: Partial<RegleComptable>;
}

export const RegleComptableDialog = ({ 
  open, 
  onClose, 
  regle,
  defaultTypeOperation = 'reservation',
  initialValues
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
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [compteDebitId, setCompteDebitId] = useState('');
  const [compteCreditId, setCompteCreditId] = useState('');
  const [actif, setActif] = useState(true);
  const [ordre, setOrdre] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (regle) {
      setCode(regle.code);
      setNom(regle.nom);
      setDescription(regle.description || '');
      setPermanente(regle.permanente);
      setDateDebut(regle.dateDebut || '');
      setDateFin(regle.dateFin || '');
      setTypeOperation(regle.typeOperation);
      setConditions(regle.conditions);
      setCompteDebitId(regle.compteDebitId);
      setCompteCreditId(regle.compteCreditId);
      setActif(regle.actif);
      setOrdre(regle.ordre);
    } else if (initialValues) {
      // Duplication : utiliser les valeurs initiales
      setCode(initialValues.code || '');
      setNom(initialValues.nom || '');
      setDescription(initialValues.description || '');
      setPermanente(initialValues.permanente ?? true);
      setDateDebut(initialValues.dateDebut || '');
      setDateFin(initialValues.dateFin || '');
      setTypeOperation(initialValues.typeOperation || defaultTypeOperation);
      setConditions(initialValues.conditions || []);
      setCompteDebitId(initialValues.compteDebitId || '');
      setCompteCreditId(initialValues.compteCreditId || '');
      setActif(initialValues.actif ?? true);
      setOrdre(initialValues.ordre ?? 0);
    } else {
      setCode('');
      setNom('');
      setDescription('');
      setPermanente(true);
      setDateDebut('');
      setDateFin('');
      setTypeOperation(defaultTypeOperation);
      setConditions([]);
      setCompteDebitId('');
      setCompteCreditId('');
      setActif(true);
      setOrdre(0);
    }
  }, [regle, initialValues, defaultTypeOperation, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClient) return;

    setIsSubmitting(true);
    try {
      if (regle) {
        await updateRegle({
          id: regle.id,
          input: {
            nom,
            description,
            permanente,
            dateDebut: permanente ? undefined : dateDebut,
            dateFin: permanente ? undefined : dateFin,
            conditions,
            compteDebitId,
            compteCreditId,
            actif,
            ordre,
          },
        });
      } else {
        await createRegle({
          clientId: currentClient.id,
          code,
          nom,
          description,
          permanente,
          dateDebut: permanente ? undefined : dateDebut,
          dateFin: permanente ? undefined : dateFin,
          typeOperation,
          conditions,
          compteDebitId,
          compteCreditId,
          actif,
          ordre,
        });
      }
      onClose();
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const comptesOptions = comptes
    .filter(c => c.statut === 'actif')
    .sort((a, b) => a.numero.localeCompare(b.numero));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {regle ? 'Modifier une règle' : 'Nouvelle règle comptable'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Identification */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Identification</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  disabled={!!regle}
                  placeholder="Ex: RG-ENG-001"
                />
              </div>
              <div>
                <Label htmlFor="nom">Nom *</Label>
                <Input
                  id="nom"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  required
                  placeholder="Ex: Engagement fonctionnement"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description de la règle..."
                rows={2}
              />
            </div>
          </div>

          <Separator />

          {/* Section 2: Période de validité */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Période de validité</h3>
            <div className="flex items-center space-x-2">
              <Switch
                id="permanente"
                checked={permanente}
                onCheckedChange={setPermanente}
              />
              <Label htmlFor="permanente">Règle permanente</Label>
            </div>
            {!permanente && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dateDebut">Date de début</Label>
                  <Input
                    id="dateDebut"
                    type="date"
                    value={dateDebut}
                    onChange={(e) => setDateDebut(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="dateFin">Date de fin</Label>
                  <Input
                    id="dateFin"
                    type="date"
                    value={dateFin}
                    onChange={(e) => setDateFin(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Section 3: Opération cible */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Opération cible</h3>
            <div>
              <Label htmlFor="typeOperation">Type d'opération *</Label>
              <Select
                value={typeOperation}
                onValueChange={(value: TypeOperation) => setTypeOperation(value)}
                disabled={!!regle}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_OPERATION_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Section 4: Conditions */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Conditions d'application</h3>
            <ConditionsBuilder
              typeOperation={typeOperation}
              conditions={conditions}
              onChange={setConditions}
            />
          </div>

          <Separator />

          {/* Section 5: Comptes comptables */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Comptes comptables</h3>
            <CompteDoubleSelect
              comptes={comptesOptions}
              debitValue={compteDebitId}
              creditValue={compteCreditId}
              onChangeDebit={setCompteDebitId}
              onChangeCredit={setCompteCreditId}
            />
          </div>

          <Separator />

          {/* Section 6: Paramètres */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Paramètres</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ordre">Ordre d'exécution</Label>
                <Input
                  id="ordre"
                  type="number"
                  value={ordre}
                  onChange={(e) => setOrdre(Number(e.target.value))}
                  min={0}
                />
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
