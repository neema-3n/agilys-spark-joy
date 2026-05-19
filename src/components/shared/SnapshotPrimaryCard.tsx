import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type MetricTone = 'default' | 'primary' | 'success' | 'warning' | 'danger';

export interface SnapshotPrimaryMetric {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: MetricTone;
}

export interface SnapshotPrimaryDetail {
  label: string;
  value: ReactNode;
}

interface SnapshotPrimaryCardProps {
  icon: ReactNode;
  title?: string;
  statusBadge?: ReactNode;
  metrics: SnapshotPrimaryMetric[];
  details?: SnapshotPrimaryDetail[];
  footer?: ReactNode;
}

const metricToneClassName: Record<MetricTone, string> = {
  default: 'text-foreground',
  primary: 'text-primary',
  success: 'text-emerald-600',
  warning: 'text-orange-600',
  danger: 'text-destructive',
};

export const SnapshotPrimaryCard = ({
  icon,
  title = 'Informations principales',
  statusBadge,
  metrics,
  details = [],
  footer,
}: SnapshotPrimaryCardProps) => {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          {statusBadge}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className={`grid gap-4 ${details.length > 0 ? 'lg:grid-cols-[minmax(0,1.2fr)_minmax(240px,0.8fr)]' : ''}`}>
          <div className={`grid gap-4 ${metrics.length > 1 ? 'sm:grid-cols-2' : ''}`}>
            {metrics.map((metric) => (
              <div key={metric.label} className="space-y-1">
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <div className={`text-2xl font-bold leading-none ${metricToneClassName[metric.tone || 'default']}`}>
                  {metric.value}
                </div>
                {metric.hint ? (
                  <div className="text-sm text-muted-foreground">{metric.hint}</div>
                ) : null}
              </div>
            ))}
          </div>

          {details.length > 0 ? (
            <div className="grid gap-x-4 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-1">
              {details.map((detail) => (
                <div key={detail.label} className="space-y-1">
                  <p className="text-sm text-muted-foreground">{detail.label}</p>
                  <div className="font-medium">{detail.value}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {footer ? <div className="border-t pt-4">{footer}</div> : null}
      </CardContent>
    </Card>
  );
};
