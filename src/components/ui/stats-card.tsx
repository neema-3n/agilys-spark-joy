import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  color?: string;
}

export const StatsCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendUp,
  color = 'text-primary' 
}: StatsCardProps) => {
  return (
    <Card className="border-border/80 bg-card hover:shadow-primary transition-shadow">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <CardTitle className="text-sm font-medium leading-5 text-muted-foreground">
          {title}
        </CardTitle>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/60">
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-1 text-[32px] font-semibold leading-9 tracking-normal">{value}</div>
        {trend && (
          <p className={`text-xs font-medium leading-4 ${trendUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
