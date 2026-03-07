import { Badge } from '@/components/ui/badge';
import type { TresorerieAlertSeverity } from '@/types/tresorerie.types';

const severityLabel: Record<TresorerieAlertSeverity, string> = {
  low: 'Faible',
  medium: 'Moyenne',
  high: 'Élevée',
  critical: 'Critique',
};

const severityClass: Record<TresorerieAlertSeverity, string> = {
  low: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  critical: 'bg-red-100 text-red-800 border-red-200',
};

interface TresorerieRiskBadgeProps {
  severity: TresorerieAlertSeverity;
}

export const TresorerieRiskBadge = ({ severity }: TresorerieRiskBadgeProps) => {
  return (
    <Badge variant="outline" className={severityClass[severity]}>
      {severityLabel[severity]}
    </Badge>
  );
};
