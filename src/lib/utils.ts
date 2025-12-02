import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formate un montant en nombre avec séparateurs de milliers, SANS devise
 * IMPORTANT : Ne jamais afficher de symbole de devise (€, $, XAF, FCFA, etc.)
 * 
 * @param value - Le montant à formater
 * @param options - Options de formatage Intl.NumberFormat
 * @param locale - Locale pour le formatage (défaut: 'fr-FR')
 * @returns Le montant formaté SANS symbole de devise
 * 
 * @example
 * formatCurrency(1234567.89) // "1 234 568"
 * formatCurrency(1234567.89, { minimumFractionDigits: 2 }) // "1 234 567,89"
 */
export const formatCurrency = (
  value: number,
  options?: Intl.NumberFormatOptions,
  locale: string = 'fr-FR'
) =>
  new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options,
  }).format(value);
