import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { MoneyFormatSettings } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type MoneyRenderTarget = 'screen' | 'pdf' | 'csv' | 'print';

type FormatMontantOptions = Intl.NumberFormatOptions & {
  renderTarget?: MoneyRenderTarget;
};

const DEFAULT_MONEY_FORMAT: Required<MoneyFormatSettings> = {
  locale: 'fr-FR',
  thousandsSeparator: 'space',
  decimalSeparator: 'comma',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
};

let activeMoneyFormat: Required<MoneyFormatSettings> = DEFAULT_MONEY_FORMAT;

const thousandsSeparatorMap: Record<NonNullable<MoneyFormatSettings['thousandsSeparator']>, string> = {
  space: ' ',
  dot: '.',
  comma: ',',
  apostrophe: "'",
  none: '',
};

const decimalSeparatorMap: Record<NonNullable<MoneyFormatSettings['decimalSeparator']>, string> = {
  comma: ',',
  dot: '.',
};

const normalizeMoneyFormat = (
  settings?: MoneyFormatSettings | null,
): Required<MoneyFormatSettings> => ({
  locale: settings?.locale || DEFAULT_MONEY_FORMAT.locale,
  thousandsSeparator: settings?.thousandsSeparator || DEFAULT_MONEY_FORMAT.thousandsSeparator,
  decimalSeparator: settings?.decimalSeparator || DEFAULT_MONEY_FORMAT.decimalSeparator,
  minimumFractionDigits:
    settings?.minimumFractionDigits ?? DEFAULT_MONEY_FORMAT.minimumFractionDigits,
  maximumFractionDigits:
    settings?.maximumFractionDigits ?? DEFAULT_MONEY_FORMAT.maximumFractionDigits,
});

export const setMoneyFormatSettings = (settings?: MoneyFormatSettings | null) => {
  activeMoneyFormat = normalizeMoneyFormat(settings);
};

export const getMoneyFormatSettings = (): Required<MoneyFormatSettings> => activeMoneyFormat;

const renderFormattedAmount = (
  montant: number,
  settings: Required<MoneyFormatSettings>,
  options?: FormatMontantOptions,
  locale?: string,
): string => {
  const { renderTarget: _renderTarget = 'screen', ...intlOptions } = options ?? {};

  const formatter = new Intl.NumberFormat(locale || settings.locale, {
    minimumFractionDigits: settings.minimumFractionDigits,
    maximumFractionDigits: settings.maximumFractionDigits,
    ...intlOptions,
  });

  return formatter
    .formatToParts(montant)
    .filter((part) => part.type !== 'currency')
    .map((part) => {
      if (part.type === 'group') {
        return thousandsSeparatorMap[settings.thousandsSeparator];
      }

      if (part.type === 'decimal') {
        return decimalSeparatorMap[settings.decimalSeparator];
      }

      if (part.type === 'literal') {
        return part.value.replace(/\u00A0|\u202F/g, ' ');
      }

      return part.value;
    })
    .join('')
    .trim();
};

export const formatMontantParts = (
  montant: number,
  options?: FormatMontantOptions,
  locale?: string,
): string => renderFormattedAmount(montant, getMoneyFormatSettings(), options, locale);

export const formatMontantWithSettings = (
  montant: number,
  settings?: MoneyFormatSettings | null,
  options?: FormatMontantOptions,
  locale?: string,
): string => renderFormattedAmount(montant, normalizeMoneyFormat(settings), options, locale);

/**
 * Formate un montant en nombre avec séparateurs de milliers, SANS devise
 * IMPORTANT : Ne jamais afficher de symbole de devise (€, $, XAF, FCFA, etc.)
 *
 * @param montant - Le montant à formater
 * @param options - Options de formatage Intl.NumberFormat
 * @param locale - Locale pour le formatage (défaut: 'fr-FR')
 * @returns Le montant formaté SANS symbole de devise
 *
 * @example
 * formatMontant(1234567.89) // "1 234 568"
 * formatMontant(1234567.89, { minimumFractionDigits: 2 }) // "1 234 567,89"
 */
export const formatMontant = (
  montant: number,
  options?: FormatMontantOptions,
  locale?: string
): string => formatMontantParts(montant, options, locale);

export const formatMontantForPdf = (
  montant: number,
  options?: Intl.NumberFormatOptions,
  locale?: string,
): string => formatMontant(montant, { ...options, renderTarget: 'pdf' }, locale);

// Legacy alias for backward compatibility
export const formatCurrency = formatMontant;
