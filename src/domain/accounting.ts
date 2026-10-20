import { isPositiveAmount, type Money } from './money';
import type {
  Account,
  AccountType,
  JournalEntry,
  Posting,
  PostingSide,
  SimpleDirection,
  StatementLine,
} from './types';

/** The side on which each account type carries a positive balance. */
const NORMAL_SIDE: Record<AccountType, PostingSide> = {
  asset: 'dr',
  expense: 'dr',
  liability: 'cr',
  income: 'cr',
  equity: 'cr',
};

export function normalSide(type: AccountType): PostingSide {
  return NORMAL_SIDE[type];
}

export function totalFor(postings: Posting[], side: PostingSide): Money {
  return postings.reduce((sum, posting) => (posting.side === side ? sum + posting.amount : sum), 0);
}

export interface EntryValidation {
  isValid: boolean;
  errors: string[];
  debit: Money;
  credit: Money;
  difference: Money;
}

/**
 * An entry is only allowed to exist if debits equal credits, every amount is a
 * positive integer, and at least two accounts are involved.
 */
export function validatePostings(postings: Posting[]): EntryValidation {
  const errors: string[] = [];
  const debit = totalFor(postings, 'dr');
  const credit = totalFor(postings, 'cr');

  if (postings.length < 2) {
    errors.push('An entry needs at least two lines.');
  }
  if (postings.some((posting) => !isPositiveAmount(posting.amount))) {
    errors.push('Every line needs an amount greater than zero.');
  }
  if (postings.some((posting) => posting.accountId.length === 0)) {
    errors.push('Every line needs a ledger.');
  }
  if (new Set(postings.map((posting) => posting.accountId)).size < 2) {
    errors.push('An entry must touch two different ledgers.');
  }
  if (debit !== credit) {
    errors.push('Debits and credits must be equal.');
  }

  return { isValid: errors.length === 0, errors, debit, credit, difference: debit - credit };
}

/**
 * Turns a Khatabook-style "you gave / you got" tap into a balanced entry.
 *
 * `gave` means value left you and the party now owes you, so the party is
 * debited and the counter-account (usually Cash) is credited. `got` is the
 * mirror image.
 */
export function buildSimplePostings(
  partyAccountId: string,
  counterAccountId: string,
  direction: SimpleDirection,
  amount: Money,
): Posting[] {
  const partySide: PostingSide = direction === 'gave' ? 'dr' : 'cr';
  const counterSide: PostingSide = partySide === 'dr' ? 'cr' : 'dr';

  return [
    { accountId: partyAccountId, side: partySide, amount },
    { accountId: counterAccountId, side: counterSide, amount },
  ];
}

/** Signed balance in debit-positive terms: positive = debit, negative = credit. */
export function balanceOf(accountId: string, entries: JournalEntry[]): Money {
  return entries.reduce((balance, entry) => {
    return entry.postings.reduce((inner, posting) => {
      if (posting.accountId !== accountId) {
        return inner;
      }
      return posting.side === 'dr' ? inner + posting.amount : inner - posting.amount;
    }, balance);
  }, 0);
}

/** Debit-positive balances for every account in one pass over the journal. */
export function balancesByAccount(entries: JournalEntry[]): Map<string, Money> {
  const balances = new Map<string, Money>();
  for (const entry of entries) {
    for (const posting of entry.postings) {
      const current = balances.get(posting.accountId) ?? 0;
      const delta = posting.side === 'dr' ? posting.amount : -posting.amount;
      balances.set(posting.accountId, current + delta);
    }
  }
  return balances;
}

export function entriesForAccount(accountId: string, entries: JournalEntry[]): JournalEntry[] {
  return entries.filter((entry) =>
    entry.postings.some((posting) => posting.accountId === accountId),
  );
}

/** Oldest first, so a running balance can be accumulated forward. */
export function sortChronologically(entries: JournalEntry[]): JournalEntry[] {
  return [...entries].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date < b.date ? -1 : 1;
    }
    return a.createdAt < b.createdAt ? -1 : 1;
  });
}

/**
 * Builds a ledger statement, newest first, with the running balance already
 * accumulated in chronological order.
 */
export function buildStatement(accountId: string, entries: JournalEntry[]): StatementLine[] {
  const relevant = sortChronologically(entriesForAccount(accountId, entries));
  const lines: StatementLine[] = [];
  let runningBalance = 0;

  for (const entry of relevant) {
    const postings = entry.postings.filter((posting) => posting.accountId === accountId);
    const contraAccountIds = entry.postings
      .filter((posting) => posting.accountId !== accountId)
      .map((posting) => posting.accountId);

    for (const posting of postings) {
      runningBalance += posting.side === 'dr' ? posting.amount : -posting.amount;
      lines.push({ entry, posting, runningBalance, contraAccountIds });
    }
  }

  return lines.reverse();
}

export interface TrialBalanceRow {
  account: Account;
  debit: Money;
  credit: Money;
}

export interface TrialBalance {
  rows: TrialBalanceRow[];
  totalDebit: Money;
  totalCredit: Money;
  isBalanced: boolean;
}

export function buildTrialBalance(accounts: Account[], entries: JournalEntry[]): TrialBalance {
  const balances = balancesByAccount(entries);
  const rows: TrialBalanceRow[] = [];
  let totalDebit = 0;
  let totalCredit = 0;

  for (const account of accounts) {
    const balance = balances.get(account.id) ?? 0;
    if (balance === 0) {
      continue;
    }
    const debit = balance > 0 ? balance : 0;
    const credit = balance < 0 ? -balance : 0;
    totalDebit += debit;
    totalCredit += credit;
    rows.push({ account, debit, credit });
  }

  return { rows, totalDebit, totalCredit, isBalanced: totalDebit === totalCredit };
}

export interface SharedLedgerMemberSummary {
  accountId: string;
  /** Debit-positive total this member has been billed from this ledger. */
  billed: Money;
}

export interface SharedLedgerSummary {
  /** What this ledger has cost you — your own shares only. */
  yourSpend: Money;
  /** Total of every bill that passed through your book for this ledger. */
  billedTotal: Money;
  members: SharedLedgerMemberSummary[];
}

/**
 * Attributes a shared expense ledger across the people it was split with.
 *
 * Only entries that touch the ledger are counted, so this measures what each
 * member was *billed from this ledger* — not their current overall balance.
 * A repayment is a plain entry against their party ledger with no posting here,
 * so it deliberately does not reduce these figures.
 */
export function summariseSharedLedger(
  expenseAccountId: string,
  entries: JournalEntry[],
): SharedLedgerSummary {
  const billedByMember = new Map<string, Money>();
  let yourSpend = 0;
  let billedTotal = 0;

  for (const entry of entries) {
    const touchesLedger = entry.postings.some((posting) => posting.accountId === expenseAccountId);
    if (!touchesLedger) {
      continue;
    }

    billedTotal += totalFor(entry.postings, 'dr');

    for (const posting of entry.postings) {
      const signed = posting.side === 'dr' ? posting.amount : -posting.amount;
      if (posting.accountId === expenseAccountId) {
        yourSpend += signed;
        continue;
      }
      if (posting.side === 'dr') {
        billedByMember.set(
          posting.accountId,
          (billedByMember.get(posting.accountId) ?? 0) + posting.amount,
        );
      }
    }
  }

  const members = [...billedByMember.entries()]
    .map(([accountId, billed]) => ({ accountId, billed }))
    .sort((a, b) => b.billed - a.billed);

  return { yourSpend, billedTotal, members };
}

export interface PartyBalanceLabel {
  /** Copy shown under a party name, e.g. "You'll get". */
  label: string;
  /** Absolute amount to render. */
  amount: Money;
  tone: 'positive' | 'negative' | 'neutral';
}

/**
 * Translates a debit-positive balance into Khatabook wording. A debit balance
 * on a party ledger means they owe you.
 */
export function describePartyBalance(balance: Money): PartyBalanceLabel {
  if (balance > 0) {
    return { label: "You'll get", amount: balance, tone: 'positive' };
  }
  if (balance < 0) {
    return { label: "You'll give", amount: -balance, tone: 'negative' };
  }
  return { label: 'Settled', amount: 0, tone: 'neutral' };
}

/** Dr/Cr wording for a non-party ledger. */
export function describeAccountBalance(account: Account, balance: Money): PartyBalanceLabel {
  const side: PostingSide = balance >= 0 ? 'dr' : 'cr';
  const isNormal = side === normalSide(account.type);
  return {
    label: side === 'dr' ? 'Dr balance' : 'Cr balance',
    amount: Math.abs(balance),
    tone: balance === 0 ? 'neutral' : isNormal ? 'positive' : 'negative',
  };
}

export interface Settlement {
  /** Which way the money moves, from your side. */
  direction: SimpleDirection;
  postings: Posting[];
}

/**
 * The entry that pays off (all or part of) a party's balance through cash or
 * bank. If they owe you, they pay you — "got"; if you owe them, you pay —
 * "gave". Returns null when there is nothing to settle or the amount would
 * overshoot the balance.
 */
export function buildSettlement(
  partyAccountId: string,
  counterAccountId: string,
  balance: Money,
  amount: Money,
): Settlement | null {
  const outstanding = Math.abs(balance);
  if (balance === 0 || !isPositiveAmount(amount) || amount > outstanding) {
    return null;
  }
  const direction: SimpleDirection = balance > 0 ? 'got' : 'gave';
  return {
    direction,
    postings: buildSimplePostings(partyAccountId, counterAccountId, direction, amount),
  };
}

export interface StatementPeriods {
  /** Lines since the balance last stood at zero, newest first. */
  open: StatementLine[];
  /** Everything up to and including the line that brought it to zero. */
  settled: StatementLine[];
  /** Date the balance last reached zero. */
  settledOn?: string;
}

/**
 * Splits a newest-first statement at the most recent point the running
 * balance reached zero. What came before is closed business — useful as
 * history, but noise next to what is still open.
 */
export function splitAtLastSettlement(statement: StatementLine[]): StatementPeriods {
  const index = statement.findIndex((line) => line.runningBalance === 0);
  if (index === -1) {
    return { open: statement, settled: [] };
  }
  return {
    open: statement.slice(0, index),
    settled: statement.slice(index),
    settledOn: statement[index].entry.date,
  };
}

/**
 * The amounts that come up most with a ledger, most frequent first and the
 * more recent breaking ties — for one-tap amount chips.
 *
 * `share` counts what this ledger was posted (what a person gave or got);
 * `total` counts whole entries, which suits a shared bill split many ways.
 */
export function frequentAmounts(
  accountId: string,
  entries: JournalEntry[],
  measure: 'share' | 'total' = 'share',
  limit = 4,
): Money[] {
  const tally = new Map<Money, { count: number; lastSeen: string }>();

  for (const entry of entries) {
    const own = entry.postings.filter((posting) => posting.accountId === accountId);
    if (own.length === 0) {
      continue;
    }
    const amount =
      measure === 'total'
        ? totalFor(entry.postings, 'dr')
        : own.reduce((sum, posting) => sum + posting.amount, 0);
    const seen = `${entry.date}|${entry.createdAt}`;
    const current = tally.get(amount);
    tally.set(amount, {
      count: (current?.count ?? 0) + 1,
      lastSeen: current && current.lastSeen > seen ? current.lastSeen : seen,
    });
  }

  return [...tally.entries()]
    .sort(([, a], [, b]) =>
      b.count !== a.count ? b.count - a.count : b.lastSeen.localeCompare(a.lastSeen),
    )
    .slice(0, limit)
    .map(([amount]) => amount);
}
