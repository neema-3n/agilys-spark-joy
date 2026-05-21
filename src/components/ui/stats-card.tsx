import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AmountWithCurrencyCode } from '@/components/ui/amount-with-currency-code';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  color?: string;
  density?: 'default' | 'compact';
  showCurrencyCode?: boolean;
  borderTintClassName?: string;
  iconBgClassName?: string;
}

const getTintClasses = (color: string) => {
  if (color.includes('emerald') || color.includes('green') || color.includes('secondary')) {
    return {
      border: 'border-emerald-200/90',
      iconBg: 'bg-emerald-100/80',
    };
  }

  if (color.includes('red') || color.includes('rose') || color.includes('destructive')) {
    return {
      border: 'border-rose-200/90',
      iconBg: 'bg-rose-100/80',
    };
  }

  if (color.includes('orange') || color.includes('amber') || color.includes('yellow')) {
    return {
      border: 'border-amber-200/90',
      iconBg: 'bg-amber-100/80',
    };
  }

  if (color.includes('cyan')) {
    return {
      border: 'border-cyan-200/90',
      iconBg: 'bg-cyan-100/80',
    };
  }

  if (color.includes('primary') || color.includes('blue')) {
    return {
      border: 'border-blue-200/90',
      iconBg: 'bg-blue-100/80',
    };
  }

  if (color.includes('accent') || color.includes('violet') || color.includes('purple') || color.includes('indigo')) {
    return {
      border: 'border-violet-200/90',
      iconBg: 'bg-violet-100/80',
    };
  }

  if (color.includes('muted') || color.includes('slate') || color.includes('gray') || color.includes('grey')) {
    return {
      border: 'border-slate-200/90',
      iconBg: 'bg-slate-100/80',
    };
  }

  return {
    border: 'border-blue-200/90',
    iconBg: 'bg-blue-100/80',
  };
};

export const StatsCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendUp,
  color = 'text-primary',
  density = 'default',
  showCurrencyCode = false,
  borderTintClassName,
  iconBgClassName,
}: StatsCardProps) => {
  const isCompact = density === 'compact';
  const tintClasses = getTintClasses(color);
  const resolvedBorderClassName = borderTintClassName ?? tintClasses.border;
  const resolvedIconBgClassName = iconBgClassName ?? tintClasses.iconBg;

  return (
    <Card className={cn('bg-card transition-shadow hover:shadow-primary', resolvedBorderClassName)}>
      <CardHeader className={`flex flex-row items-start justify-between ${isCompact ? 'gap-2.5 pb-2 px-5 pt-5' : 'gap-3 pb-3'}`}>
        <CardTitle className={`font-medium text-muted-foreground ${isCompact ? 'text-[13px] leading-4' : 'text-sm leading-5'}`}>
          {title}
        </CardTitle>
        <div
          className={`flex shrink-0 items-center justify-center rounded-xl ${resolvedIconBgClassName} ${
            isCompact ? 'h-9 w-9' : 'h-10 w-10'
          }`}
        >
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
