import { AlertCircle, CircleCheckBig } from 'lucide-react';
import { VentilationEditor } from '@/components/finance/VentilationEditor';
import type { FinancialVentilation } from '@/types/financial.types';

interface FinancialVentilationSectionProps {
  ventilations: FinancialVentilation[];
  onVentilationsChange: (ventilations: FinancialVentilation[]) => void;
  totalAjouts: number;
  totalRetraits: number;
  coherenceError?: string;
  entityLabel: string;
  showSectionHeader?: boolean;
}

export const FinancialVentilationSection = ({
  ventilations,
  onVentilationsChange,
  totalAjouts,
  totalRetraits,
  coherenceError,
  entityLabel,
  showSectionHeader = true,
}: FinancialVentilationSectionProps) => {
  return (
    <section className="space-y-4">
      {showSectionHeader ? (
        <div className="space-y-1">
          <h3 className="text-base font-semibold">Ventilation financière</h3>
          <p className="text-sm text-muted-foreground">
            Répartissez les composantes du montant et vérifiez la cohérence financière de {entityLabel}.
          </p>
        </div>
      ) : null}
      <div className="space-y-4 rounded-md border p-4 md:p-5">
        <VentilationEditor ventilations={ventilations} onChange={onVentilationsChange} />

        <div className="grid gap-3 rounded-md border p-4 text-sm md:grid-cols-[1fr_1fr_1.2fr]">
          <div className="min-w-0">
            <span className="text-muted-foreground">Total ajouts :</span>{' '}
            <span className="font-medium text-foreground">{totalAjouts.toFixed(2)}</span>
          </div>
          <div className="min-w-0">
            <span className="text-muted-foreground">Total retraits :</span>{' '}
            <span className="font-medium text-foreground">{totalRetraits.toFixed(2)}</span>
          </div>
          <div
            className={
              coherenceError
                ? 'flex items-center justify-start gap-2 text-destructive md:justify-end'
                : 'flex items-center justify-start gap-2 text-emerald-600 md:justify-end'
            }
          >
            {coherenceError ? (
              <>
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="font-medium">{coherenceError}</span>
              </>
            ) : (
              <>
                <CircleCheckBig className="h-4 w-4 shrink-0" />
                <span className="font-medium">Montants cohérents.</span>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
