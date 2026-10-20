import type { Money } from './money';

/**
 * The five classical account types. Every ledger the user creates is one of
 * these, which is what makes a trial balance possible.
 */
export type AccountType = 'asset' | 'liability' | 'income' | 'expense' | 'equity';

/**
 * How a ledger behaves in the UI.
 * - `party`   — a customer or supplier, shown in the Khatabook-style list
 * - `cash`    — cash in hand, the default counter-account
 * - `bank`    — a bank account
 * - `category` — income/expense buckets used by the advanced composer
 */
export type AccountRole = 'party' | 'cash' | 'bank' | 'category';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  role: AccountRole;
  /** Optional contact number for party ledgers. */
  phone?: string;
  /** Their UPI ID (e.g. `name@okaxis`), so you can pay them from the app. */
  upiId?: string;
  note?: string;
  /** System ledgers (Cash, Bank) are seeded and cannot be deleted. */
  isSystem: boolean;
  /** Stable 0-359 hue used to colour the avatar. */
  hue: number;
  createdAt: string;
  archivedAt?: string;
  /**
   * Present on expense ledgers that are shared with other people, e.g. a gym
   * membership split with a friend. Remembers who splits it and how.
   */
  splitGroup?: SplitGroup;
}

export type SplitMethod = 'equal' | 'exact';

/** The people a shared expense ledger is split between, and the default rules. */
export interface SplitGroup {
  /** Party account ids of everyone other than you. */
  memberIds: string[];
  /** Whether you take a share of this expense. */
  includeSelf: boolean;
  method: SplitMethod;
  /** Account that usually funds the bill: cash, bank, or a member who pays. */
  defaultPayerId: string;
}

export type PostingSide = 'dr' | 'cr';

export interface Posting {
  accountId: string;
  side: PostingSide;
  /** Always a positive integer in minor units. */
  amount: Money;
}

export interface JournalEntry {
  id: string;
  /** Sequential, human-facing voucher number. */
  voucherNo: number;
  /** Calendar date of the transaction, `YYYY-MM-DD`. */
  date: string;
  narration: string;
  postings: Posting[];
  createdAt: string;
}

/** Direction of a simple Khatabook-style entry, from the user's point of view. */
export type SimpleDirection = 'gave' | 'got';

/** About the person keeping the book — used when asking others to pay. */
export interface Profile {
  /** Shown as the payee name in UPI apps. */
  name?: string;
  upiId?: string;
}

export interface LedgerSnapshot {
  version: number;
  accounts: Account[];
  entries: JournalEntry[];
  nextVoucherNo: number;
  /** Optional so books saved before it existed still load. */
  profile?: Profile;
}

/** A posting resolved against its entry, for rendering a ledger statement. */
export interface StatementLine {
  entry: JournalEntry;
  posting: Posting;
  /** Running balance after this line, positive = debit balance. */
  runningBalance: Money;
  /** The other side of the entry, used for the "via Cash" subtitle. */
  contraAccountIds: string[];
}
