import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isValidDate = (value: Date) => !Number.isNaN(value.getTime());

export const isDateOnlyString = (value: string): boolean => DATE_ONLY_PATTERN.test(value);

export const parseDateValue = (value?: string | Date | null): Date | undefined => {
  if (!value) return undefined;

  if (value instanceof Date) {
    return isValidDate(value) ? new Date(value.getTime()) : undefined;
  }

  if (isDateOnlyString(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const parsed = new Date(year, month - 1, day);
    return isValidDate(parsed) ? parsed : undefined;
  }

  const parsed = new Date(value);
  return isValidDate(parsed) ? parsed : undefined;
};

export const parseDateOnlyValue = (value?: string | null): Date | undefined => {
  if (!value || !isDateOnlyString(value)) return undefined;

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  return isValidDate(parsed) ? parsed : undefined;
};

export const formatDateValue = (
  value: string | Date | null | undefined,
  pattern: string = 'dd/MM/yyyy'
): string => {
  const parsed = parseDateValue(value);
  if (!parsed) return '-';

  return format(parsed, pattern, { locale: fr });
};

export const toDateOnlyString = (value: string | Date): string => {
  if (typeof value === 'string' && isDateOnlyString(value)) {
    return value;
  }

  const parsed = parseDateValue(value);
  if (!parsed) {
    throw new Error('Invalid date value');
  }

  return format(parsed, 'yyyy-MM-dd');
};

