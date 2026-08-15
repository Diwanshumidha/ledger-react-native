/**
 * Money is stored everywhere as an integer number of minor units (paise).
 * Floating point never touches a stored amount — only display formatting.
 */

export type Money = number;

export const MINOR_UNITS_PER_MAJOR = 100;

const CURRENCY = 'INR';
const LOCALE = 'en-IN';

export const CurrencySymbol = '₹';

const compactFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: CURRENCY,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const preciseFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const plainFormatter = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formats minor units as currency, hiding `.00` on whole amounts. */
export function formatMoney(minor: Money): string {
  const major = minor / MINOR_UNITS_PER_MAJOR;
  const formatter = minor % MINOR_UNITS_PER_MAJOR === 0 ? compactFormatter : preciseFormatter;
  return formatter.format(major);
}

/** Formats minor units without a currency symbol, always with 2 decimals. */
export function formatAmount(minor: Money): string {
  return plainFormatter.format(minor / MINOR_UNITS_PER_MAJOR);
}

/**
 * Parses user input ("1,250.50", "1250", "") into minor units.
 * Returns 0 for anything unparseable so the caller can rely on validation instead.
 */
export function parseMoney(input: string): Money {
  const cleaned = input.replace(/[^0-9.]/g, '');
  if (cleaned.length === 0) {
    return 0;
  }
  const [whole, fraction = ''] = cleaned.split('.');
  const paise = `${fraction}00`.slice(0, 2);
  const major = Number.parseInt(whole || '0', 10);
  const minor = Number.parseInt(paise, 10);
  if (Number.isNaN(major) || Number.isNaN(minor)) {
    return 0;
  }
  return major * MINOR_UNITS_PER_MAJOR + minor;
}

export function isPositiveAmount(minor: Money): boolean {
  return Number.isInteger(minor) && minor > 0;
}
