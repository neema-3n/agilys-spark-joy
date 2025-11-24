import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import type { Condition, TypeOperation, OperateurCondition } from '@/types/regle-comptable.types';
import { OPERATION_FIELDS, OPERATEUR_LABELS } from '@/lib/regles-comptables-fields';

interface ConditionsBuilderProps {
  typeOperation: TypeOperation;
  conditions: Condition[];
  onChange: (conditions: Condition[]) => void;
}

export const ConditionsBuilder = ({ typeOperation, conditions, onChange }: ConditionsBuilderProps) => {
  const fields = OPERATION_FIELDS[typeOperation] || [];

  const getOperatorsForType = (fieldType: string) => {
    if (fieldType === 'number') return ['==', '!=', '>', '<', '>=', '<='];
    if (fieldType === 'select' || fieldType === 'boolean') return ['==', '!='];
    return ['==', '!=', 'contient', 'commence_par'];
  };

  const addCondition = () => {
    onChange([
      ...conditions,
      { champ: fields[0]?.value || '', operateur: '==', valeur: '' }
    ]);
  };

  const removeCondition = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, updates: Partial<Condition>) => {
    onChange(
      conditions.map((cond, i) =>
        i === index ? { ...cond, ...updates } : cond
      )
    );
  };

  const getFieldType = (champ: string) => {
    return fields.find(f => f.value === champ)?.type || 'text';
  };

  const getFieldOptions = (champ: string) => {
    return fields.find(f => f.value === champ)?.options || [];
  };

  return (
    <div className="space-y-3">
      {conditions.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          Aucune condition définie. La règle s'appliquera à toutes les opérations de ce type.
        </p>
      )}

      {conditions.map((condition, index) => {
        const fieldType = getFieldType(condition.champ);
        const fieldOptions = getFieldOptions(condition.champ);
        const allowedOperators = getOperatorsForType(fieldType);
        const currentOperateur = (allowedOperators.includes(condition.operateur)
          ? condition.operateur
          : allowedOperators[0]) as OperateurCondition;
        if (currentOperateur !== condition.operateur) {
          updateCondition(index, { operateur: currentOperateur });
        }

        return (
          <Card key={index} className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Champ */}
                <Select
                  value={condition.champ}
                  onValueChange={(value) => updateCondition(index, { champ: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un champ" />
                  </SelectTrigger>
                  <SelectContent>
                    {fields.map((field) => (
                      <SelectItem key={field.value} value={field.value}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Opérateur */}
                <Select
                  value={currentOperateur}
                  onValueChange={(value: any) => updateCondition(index, { operateur: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedOperators.map((value) => (
                      <SelectItem key={value} value={value}>
                        {OPERATEUR_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Valeur */}
                {fieldType === 'select' ? (
                  <Select
                    value={String(condition.valeur)}
                    onValueChange={(value) => updateCondition(index, { valeur: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Valeur" />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={fieldType === 'number' ? 'number' : 'text'}
                    value={String(condition.valeur)}
                    onChange={(e) => updateCondition(index, { 
                      valeur: fieldType === 'number' ? Number(e.target.value) : e.target.value 
                    })}
                    placeholder="Valeur"
                  />
                )}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeCondition(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addCondition}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Ajouter une condition
      </Button>
    </div>
  );
};
