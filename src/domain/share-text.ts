import { describePartyBalance } from './accounting';
import { formatDateShort } from './date';
import { formatMoney, type Money } from './money';
import type { Account, Profile, StatementLine } from './types';
import { buildPayPageLink, buildUpiLink, type UpiPaymentRequest } from './upi';

/** How many recent lines a shared statement lists before it summarises. */
const MAX_LINES = 8;

/**
 * Where the account stands, written from your side to the other person —
 * "you" is the reader, so a balance they owe you reads "You owe me".
 */
export function describeSharedBalance(account: Account, balance: Money): string {
  if (account.role !== 'party') {
    return `Balance ${formatMoney(Math.abs(balance))}`;
  }
  const summary = describePartyBalance(balance);
  if (summary.tone === 'positive') {
    return `You owe me ${formatMoney(summary.amount)}`;
  }
  if (summary.tone === 'negative') {
    return `I owe you ${formatMoney(summary.amount)}`;
  }
  return 'We are settled up';
}

export interface SharedLine {
  date: string;
  /** "I gave ₹1,500" / "You gave ₹400". */
  what: string;
  note?: string;
  /** True when the money went from you to them. */
  isOutgoing: boolean;
}

/**
 * The entries worth showing the other person, oldest first so they read as
 * the story of the account, plus how many earlier ones were left out.
 */
export function sharedLines(
  account: Account,
  /** Newest first, as `buildStatement` returns it. */
  statement: StatementLine[],
): { lines: SharedLine[]; hidden: number } {
  const isParty = account.role === 'party';
  const shown = statement.slice(0, MAX_LINES).reverse();

  return {
    hidden: Math.max(0, statement.length - MAX_LINES),
    lines: shown.map((line) => {
      const amount = formatMoney(line.posting.amount);
      // A debit on a party ledger is money you gave them.
      const isOutgoing = line.posting.side === 'dr';
      return {
        date: formatDateShort(line.entry.date),
        what: isParty
          ? `${isOutgoing ? 'I gave' : 'You gave'} ${amount}`
          : `${isOutgoing ? 'Dr' : 'Cr'} ${amount}`,
        note: line.entry.narration || undefined,
        isOutgoing,
      };
    }),
  };
}

/** What they owe you as a UPI request — when there is something to pay and somewhere to pay it. */
function paymentRequest(
  account: Account,
  balance: Money,
  profile: Profile,
): UpiPaymentRequest | null {
  if (account.role !== 'party' || balance <= 0 || !profile.upiId) {
    return null;
  }
  return {
    payeeUpiId: profile.upiId,
    payeeName: profile.name,
    amount: balance,
    note: 'Settling our account',
  };
}

/** The `upi://` link for the QR code on the shared image. */
export function upiLinkForBalance(
  account: Account,
  balance: Money,
  profile: Profile,
): string | null {
  const request = paymentRequest(account, balance, profile);
  return request ? buildUpiLink(request) : null;
}

/**
 * A plain-text statement for WhatsApp, SMS and the like. The balance is in
 * *asterisks*, which WhatsApp shows as bold. No raw `upi://` link: chat apps
 * do not make those tappable. Instead it links to the hosted pay page when
 * there is one, and always writes the UPI ID out to copy.
 */
export function buildShareText(
  account: Account,
  balance: Money,
  statement: StatementLine[],
  profile: Profile = {},
  /** Hosted pay page; when given, the message ends with a tappable link to it. */
  payPageUrl: string | null = null,
): string {
  const out: string[] = [];
  const isParty = account.role === 'party';

  out.push(isParty ? `Our account, ${account.name}` : `${account.name} ledger`);
  out.push(`*${describeSharedBalance(account, balance)}*`);

  const { lines, hidden } = sharedLines(account, statement);
  if (lines.length > 0) {
    out.push('');
    out.push(hidden > 0 ? `Recent entries (${hidden} earlier not shown)` : 'Entries');
    for (const line of lines) {
      out.push(`• ${line.date}: ${line.what}${line.note ? ` (${line.note})` : ''}`);
    }
  }

  const request = paymentRequest(account, balance, profile);
  if (request) {
    out.push('');
    if (payPageUrl) {
      // Chat apps turn an https address into a link; the page opens UPI.
      out.push(`Pay ${formatMoney(balance)} here: ${buildPayPageLink(payPageUrl, request)}`);
      out.push(`or by UPI to ${request.payeeUpiId}`);
    } else {
      out.push(`Pay ${formatMoney(balance)} by UPI to ${request.payeeUpiId}`);
    }
  }

  return out.join('\n');
}

/**
 * Just the ask: who, how much, and the UPI link that opens their UPI app with
 * everything filled in. Some chat apps show a `upi://` link as plain text, so
 * the hosted pay page's https link goes first when there is one, and the UPI
 * ID is always written out to copy.
 * Null when there is nothing they owe you or no UPI ID to pay.
 */
export function buildPaymentLinkText(
  account: Account,
  balance: Money,
  profile: Profile,
  payPageUrl: string | null,
): string | null {
  const request = paymentRequest(account, balance, profile);
  if (!request) {
    return null;
  }
  const lines = [
    `Hi ${account.name.split(/\s+/)[0]}, please pay ${formatMoney(balance)} to settle our account.`,
    '',
  ];
  if (payPageUrl) {
    lines.push(`Pay here: ${buildPayPageLink(payPageUrl, request)}`, '');
  }
  lines.push(`UPI link: ${buildUpiLink(request)}`, '', `UPI ID: ${request.payeeUpiId}`);
  return lines.join('\n');
}
