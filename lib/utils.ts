import { clsx, type ClassValue } from 'clsx';
import {
  formatCurrency,
  type FormatCurrencyOptions,
} from '@/lib/currency/format';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Deterministic formatters to avoid SSR/CSR locale mismatches
export function formatNumber(value: number): string {
  try {
    return new Intl.NumberFormat('en-US').format(value);
  } catch {
    return String(value);
  }
}

/**
 * Format a price in the currency chosen in Admin → Settings → General → Currency.
 *
 * Historically named for the euro; it now delegates to the central formatter so
 * the symbol, grouping and placement all follow the site setting. Pass
 * `{ currency }` to override for a single call.
 */
export function formatEuroCurrency(
  value: number,
  options: FormatCurrencyOptions = {},
): string {
  return formatCurrency(value, options);
}

/**
 * Retained alias — still the most widely used price formatter in the codebase.
 * Despite the name it renders the configured currency, not Bangladeshi taka.
 */
export function formatBDTCurrency(
  value: number,
  options: FormatCurrencyOptions = {},
): string {
  return formatCurrency(value, options);
}

export function formatDhakaDate(input: string | number | Date): string {
  try {
    return new Intl.DateTimeFormat('en-BD', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      timeZone: 'Asia/Dhaka',
    }).format(new Date(input));
  } catch {
    const d = new Date(input);
    return d.toISOString().split('T')[0];
  }
}
