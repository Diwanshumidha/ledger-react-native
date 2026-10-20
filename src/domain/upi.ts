import { MINOR_UNITS_PER_MAJOR, type Money } from './money';

/**
 * A UPI virtual payment address: a handle, "@", and the bank or app's
 * provider, e.g. `asha.k@okaxis` or `9876543210@ybl`.
 */
const UPI_ID_PATTERN = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/;

export function isValidUpiId(value: string): boolean {
  return UPI_ID_PATTERN.test(value.trim());
}

export interface UpiPaymentRequest {
  /** Who receives the money. */
  payeeUpiId: string;
  payeeName?: string;
  amount: Money;
  /** Shows in the payer's app and on both statements. */
  note?: string;
}

/**
 * A `upi://pay` deep link. Any UPI app on the phone (GPay, PhonePe, Paytm,
 * BHIM…) opens it with the payee and amount filled in; the payer still
 * confirms with their PIN, so nothing moves without them.
 */
export function buildUpiLink({ payeeUpiId, payeeName, amount, note }: UpiPaymentRequest): string {
  const params: [string, string][] = [
    ['pa', payeeUpiId.trim()],
    ['pn', payeeName?.trim() || payeeUpiId.trim()],
    ['am', (amount / MINOR_UNITS_PER_MAJOR).toFixed(2)],
    ['cu', 'INR'],
  ];
  if (note) {
    // UPI apps truncate long notes; keep it to what fits on a receipt.
    params.push(['tn', note.slice(0, 50)]);
  }
  // "@" stays literal: some UPI apps don't decode %40 in the payee address,
  // and UPI QR codes write it unescaped too.
  const query = params
    .map(([key, value]) => `${key}=${encodeURIComponent(value).replace(/%40/g, '@')}`)
    .join('&');
  return `upi://pay?${query}`;
}

/**
 * An https link to the hosted pay page for the same request. Chat apps make
 * https links tappable but not `upi://` ones; the page turns a tap into the
 * UPI app opening with everything filled in.
 */
export function buildPayPageLink(pageUrl: string, request: UpiPaymentRequest): string {
  const upi = buildUpiLink(request);
  // The page reads the same parameters as the UPI link.
  return `${pageUrl}${pageUrl.includes('?') ? '&' : '?'}${upi.slice(upi.indexOf('?') + 1)}`;
}
