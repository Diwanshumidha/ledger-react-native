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
 * Parses user input ("1,250.50", "1250", "") into minor units. A sum such as
 * "450+120+80" is worked out — see `evaluateAmount`.
 * Returns 0 for anything unparseable so the caller can rely on validation instead.
 */
export function parseMoney(input: string): Money {
  if (hasArithmetic(input)) {
    const result = evaluateAmount(input);
    return result !== null && result > 0 ? result : 0;
  }
  return parsePlainAmount(input);
}

/** One number, no arithmetic: "1,250.50" → 125050. */
function parsePlainAmount(input: string): Money {
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

/** The operators the amount calculator accepts, as typed or as shown. */
const OPERATOR = /[+\-*/×÷−]/;

/** True when the text is a sum to work out rather than a single number. */
export function hasArithmetic(input: string): boolean {
  // A digit then an operator: "450+…". A lone leading "-" is not a sum.
  return /[0-9.]\s*[+\-*/×÷−]/.test(input);
}

/**
 * Works out a small sum typed into an amount: "450+120+80", "1200÷4",
 * "350×3−50". × and ÷ bind tighter than + and −, as on a calculator.
 *
 * Amounts are added and subtracted in whole paise, so they stay exact; only
 * × and ÷ round, to the nearest paisa. A trailing operator ("450+") is
 * ignored so the total shows while the next number is still being typed.
 * Returns null when the text is not a sum it understands, or divides by 0.
 */
export function evaluateAmount(input: string): Money | null {
  const normalised = input
    .replace(/[,\s]/g, '')
    .replace(/[×xX]/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/[+\-*/]+$/, '');

  if (
    normalised.length === 0 ||
    !/^[0-9.+\-*/]+$/.test(normalised) ||
    OPERATOR.test(normalised[0])
  ) {
    return null;
  }

  const tokens = normalised.match(/[0-9]*\.?[0-9]+|[0-9]+\.?|[+\-*/]/g);
  if (!tokens || tokens.join('') !== normalised) {
    return null;
  }

  let total = 0;
  // The running term: an amount in paise, then scaled by any × and ÷.
  let term: number | null = null;
  let sign = 1;
  let pending: '*' | '/' | null = null;

  for (const token of tokens) {
    if (token === '+' || token === '-') {
      if (term === null || pending !== null) {
        return null;
      }
      total += sign * term;
      term = null;
      sign = token === '+' ? 1 : -1;
    } else if (token === '*' || token === '/') {
      if (term === null || pending !== null) {
        return null;
      }
      pending = token;
    } else if (term === null) {
      term = parsePlainAmount(token);
    } else if (pending !== null) {
      // The right side of × or ÷ is a plain quantity: "450×3" is ₹450 three times.
      const factor = Number(token);
      if (pending === '/' && factor === 0) {
        return null;
      }
      term = Math.round(pending === '*' ? term * factor : term / factor);
      pending = null;
    } else {
      return null;
    }
  }

  if (term === null || pending !== null) {
    return null;
  }
  return total + sign * term;
}
