import { useId } from 'react';
import { AlertTriangle, Lock, ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { CashRiskBlockedInfo } from '@/lib/cash-risk-ui';

interface CashRiskBlockedPanelProps {
  info: CashRiskBlockedInfo;
  onDismiss?: () => void;
  onRequestException?: () => void;
  className?: string;
}

export const CashRiskBlockedPanel = ({ info, onDismiss, onRequestException, className }: CashRiskBlockedPanelProps) => {
  const titleId = useId();

  return (
    <Alert
      variant="destructive"
      className={className}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      aria-labelledby={titleId}
    >
      <ShieldAlert className="h-4 w-4" aria-hidden="true" />
      <AlertTitle id={titleId} className="flex flex-wrap items-center gap-2">
        <span>{info.title}</span>
        <Badge variant="destructive">{`Risque ${info.riskLevelLabel}`}</Badge>
        <Badge variant="outline" className="bg-background">
          {`Score ${info.riskScoreLabel}`}
        </Badge>
      </AlertTitle>
      <AlertDescription className="space-y-4">
        <p className="font-medium">{`${info.transitionLabel}: ${info.summary}`}</p>

        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide">Contexte de trésorerie</p>
          <ul className="text-sm space-y-1 list-disc pl-5">
            <li>{`Cash disponible: ${info.snapshot.availableCash}`}</li>
            <li>{`Exposition projetée: ${info.snapshot.projectedExposure}`}</li>
            <li>{`Gap projeté: ${info.snapshot.projectedGap}`}</li>
            <li>{`Engagements restants: ${info.snapshot.remainingEngagements}`}</li>
            <li>{`Dépenses ouvertes: ${info.snapshot.outstandingDepenses}`}</li>
            <li>{`Opérations non rapprochées: ${info.snapshot.nonReconciledOperations}`}</li>
          </ul>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide">Causes</p>
          <ul className="text-sm space-y-1 list-disc pl-5">
            {info.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide">Remédiations proposées</p>
          <ol className="text-sm space-y-1 list-decimal pl-5">
            {info.remediations.map((remediation) => (
              <li key={remediation}>{remediation}</li>
            ))}
          </ol>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-destructive/30"
            onClick={onRequestException}
            disabled={!onRequestException}
            aria-label="Demander une exception gouvernée"
          >
            <Lock className="h-4 w-4 mr-2" />
            Demander une exception
          </Button>
          {onDismiss ? (
            <Button type="button" variant="ghost" onClick={onDismiss} aria-label="Fermer le message de blocage">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Fermer ce message
            </Button>
          ) : null}
        </div>
      </AlertDescription>
    </Alert>
  );
};
