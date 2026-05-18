import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FinancialVentilationSection } from '@/components/finance/FinancialVentilationSection';
import type { FinancialVentilation } from '@/types/financial.types';

interface FinancialQualificationSectionProps {
  mode: 'editable' | 'inherited';
  title: string;
  editableDescription: string;
  inheritedDescription: string;
  chargeField?: ReactNode;
  amountFields?: ReactNode;
  inheritedAmountField: ReactNode;
  ventilations: FinancialVentilation[];
  onVentilationsChange: (ventilations: FinancialVentilation[]) => void;
  totalAjouts: number;
  totalRetraits: number;
  coherenceError?: string;
  ventilationEntityLabel: string;
}

export const FinancialQualificationSection = ({
  mode,
  title,
  editableDescription,
  inheritedDescription,
  chargeField,
  amountFields,
  inheritedAmountField,
  ventilations,
  onVentilationsChange,
  totalAjouts,
  totalRetraits,
  coherenceError,
  ventilationEntityLabel,
}: FinancialQualificationSectionProps) => {
  if (mode === 'inherited') {
    return (
      <section className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
          <p className="text-sm text-muted-foreground">{inheritedDescription}</p>
        </div>
        <Card>
          <CardContent className="space-y-6 pt-6">{inheritedAmountField}</CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground">{editableDescription}</p>
      </div>
      <Card>
        <CardContent className="space-y-6 pt-6">
          {chargeField}
          {amountFields}
        </CardContent>
      </Card>

      <FinancialVentilationSection
        ventilations={ventilations}
        onVentilationsChange={onVentilationsChange}
        totalAjouts={totalAjouts}
        totalRetraits={totalRetraits}
        coherenceError={coherenceError}
        entityLabel={ventilationEntityLabel}
        showSectionHeader={false}
      />
    </section>
  );
};
