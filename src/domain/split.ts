import { isPositiveAmount, type Money } from './money';
import type { Posting } from './types';

/**
 * Stands in for you in a participant list. You are not an account — your share
 * of a shared expense is what lands on the expense ledger itself.
 */
export const SELF_PARTICIPANT = 'self';

export interface ParticipantShare {
  /** `SELF_PARTICIPANT` or a party account id. */
  participantId: string;
  amount: Money;
}

/**
 * Divides a total into `count` shares that add back up to exactly the total.
 *
 * Splitting ₹1,000.00 three ways gives 333.34 / 333.33 / 333.33 — the leftover
 * paise go to the earliest participants rather than being rounded away, so the
 * generated entry always balances.
 */
export function allocateEqually(total: Money, count: number): Money[] {
  if (count <= 0) {
    return [];
  }
  const base = Math.floor(total / count);
  const remainder = total - base * count;

  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

export interface SplitInput {
  expenseAccountId: string;
  /** Account that actually paid the bill: cash, bank, or a member. */
  payerAccountId: string;
  shares: ParticipantShare[];
}

export interface SplitValidation {
  isValid: boolean;
  errors: string[];
  /** Sum of every participant's share. */
  total: Money;
  selfShare: Money;
  /** True when a member footed the bill, so only your share is recorded. */
  payerIsMember: boolean;
}

export function validateSplit(input: SplitInput): SplitValidation {
  const errors: string[] = [];
  const shares = input.shares.filter((share) => share.amount !== 0);
  const total = shares.reduce((sum, share) => sum + share.amount, 0);
  const selfShare = shares
    .filter((share) => share.participantId === SELF_PARTICIPANT)
    .reduce((sum, share) => sum + share.amount, 0);
  // Only a participant with an actual share counts as "the member who paid".
  const payerIsMember = shares.some((share) => share.participantId === input.payerAccountId);

  if (shares.length === 0) {
    errors.push('Add at least one person to split this with.');
  }
  if (shares.some((share) => !isPositiveAmount(share.amount))) {
    errors.push('Every share must be greater than zero.');
  }
  if (input.expenseAccountId.length === 0) {
    errors.push('Choose the expense ledger.');
  }
  if (input.payerAccountId.length === 0) {
    errors.push('Choose who paid.');
  }
  if (payerIsMember && selfShare <= 0) {
    // Their bill, their share, none of it yours — nothing to record.
    errors.push('When a member pays, you need a share of your own to record.');
  }

  return { isValid: errors.length === 0, errors, total, selfShare, payerIsMember };
}

/**
 * Turns a split into a balanced entry.
 *
 * When you pay, the whole bill passes through your book: your share becomes an
 * expense, everyone else's share becomes money they owe you, and the payment
 * account is credited with the total.
 *
 * When a member pays, only your share belongs to you — the other participants
 * settle with that member directly, so recording their shares would invent
 * receivables you do not hold.
 */
export function buildSplitPostings(input: SplitInput): Posting[] {
  const validation = validateSplit(input);
  if (!validation.isValid) {
    throw new Error(validation.errors.join(' '));
  }

  const shares = input.shares.filter((share) => share.amount > 0);

  if (validation.payerIsMember) {
    return [
      { accountId: input.expenseAccountId, side: 'dr', amount: validation.selfShare },
      { accountId: input.payerAccountId, side: 'cr', amount: validation.selfShare },
    ];
  }

  const postings: Posting[] = [];

  if (validation.selfShare > 0) {
    postings.push({
      accountId: input.expenseAccountId,
      side: 'dr',
      amount: validation.selfShare,
    });
  }

  for (const share of shares) {
    if (share.participantId === SELF_PARTICIPANT) {
      continue;
    }
    postings.push({ accountId: share.participantId, side: 'dr', amount: share.amount });
  }

  postings.push({ accountId: input.payerAccountId, side: 'cr', amount: validation.total });

  return postings;
}

/** Human-readable summary of what a split will record, for the composer. */
export function describeSplit(
  validation: SplitValidation,
  payerName: string,
): string {
  if (validation.payerIsMember) {
    return `${payerName} paid. Only your share is recorded — the others settle with ${payerName} directly.`;
  }
  return `Paid from ${payerName}. Everyone else's share becomes money they owe you.`;
}
