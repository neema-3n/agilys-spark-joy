import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AmountWithCurrencyCode } from '@/components/ui/amount-with-currency-code';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  color?: string;
  density?: 'default' | 'compact';
  showCurrencyCode?: boolean;
}

export const StatsCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendUp,
  color = 'text-primary',
  density = 'default',
  showCurrencyCode = false,
}: StatsCardProps) => {
  const isCompact = density === 'compact';

  return (
    <Card className="border-border/80 bg-card hover:shadow-primary transition-shadow">
      <CardHeader className={`flex flex-row items-start justify-between ${isCompact ? 'gap-2.5 pb-2 px-5 pt-5' : 'gap-3 pb-3'}`}>
        <CardTitle className={`font-medium text-muted-foreground ${isCompact ? 'text-[13px] leading-4' : 'text-sm leading-5'}`}>
          {title}
        </CardTitle>
        <div className={`flex shrink-0 items-center justify-center rounded-xl bg-muted/60 ${isCompact ? 'h-9 w-9' : 'h-10 w-10'}`}>
          <Icon className={`${isCompact ? 'h-4.5 w-4.5' : 'h-5 w-5'} ${color}`} />
        </div>
      </CardHeader>
      <CardContent className={isCompact ? 'px-5 pb-5 pt-0' : undefined}>
        <div className={`mb-1 font-semibold tracking-normal ${isCompact ? 'text-[24px] leading-7' : 'text-[32px] leading-9'}`}>
          {showCurrencyCode ? <AmountWithCurrencyCode amount={value} /> : value}
        </div>
        {trend && (
          <p className={`font-medium ${isCompact ? 'text-[11px] leading-4' : 'text-xs leading-4'} ${trendUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
