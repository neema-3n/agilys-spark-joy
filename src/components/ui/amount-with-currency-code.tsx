import { useMemo } from 'react';
import { useClient } from '@/contexts/ClientContext';
import { cn } from '@/lib/utils';

interface AmountWithCurrencyCodeProps {
  amount: string;
  className?: string;
  currencyClassName?: string;
}

export const AmountWithCurrencyCode = ({
  amount,
  className,
  currencyClassName,
}: AmountWithCurrencyCodeProps) => {
  const { currentClient } = useClient();

  const currencyCode = useMemo(() => {
    const code =
      currentClient?.moneyFormat?.currencyCode?.trim().toUpperCase() ||
      currentClient?.devise?.trim().toUpperCase() ||
      '';

    return code;
  }, [currentClient?.devise, currentClient?.moneyFormat?.currencyCode]);

  if (!currencyCode) {
    return <span className={className}>{amount}</span>;
  }

  return (
    <span className={cn('inline-flex items-end gap-2 whitespace-nowrap leading-none', className)}>
      <span className="leading-none">{amount}</span>
      <span
        className={cn(
          'pb-[0.03em] leading-none text-[0.32em] font-semibold uppercase tracking-[0.14em] text-muted-foreground',
          currencyClassName,
        )}
      >
        {currencyCode}
      </span>
    </span>
  );
};
