import { SNAPSHOT_VERSION } from '@/data/repository';

import type { Account, LedgerSnapshot } from './types';

export const CASH_ACCOUNT_ID = 'sys-cash';
export const BANK_ACCOUNT_ID = 'sys-bank';

/** Ledgers every book starts with, so a first entry always has a counter-side. */
export function systemAccounts(now: string): Account[] {
  return [
    {
      id: CASH_ACCOUNT_ID,
      name: 'Cash',
      type: 'asset',
      role: 'cash',
      isSystem: true,
      hue: 145,
      createdAt: now,
    },
    {
      id: BANK_ACCOUNT_ID,
      name: 'Bank',
      type: 'asset',
      role: 'bank',
      isSystem: true,
      hue: 210,
      createdAt: now,
    },
  ];
}

export function emptySnapshot(now: string): LedgerSnapshot {
  return {
    version: SNAPSHOT_VERSION,
    accounts: systemAccounts(now),
    entries: [],
    nextVoucherNo: 1,
  };
}

/** Re-adds any system ledger a stored snapshot is missing. */
export function withSystemAccounts(snapshot: LedgerSnapshot, now: string): LedgerSnapshot {
  const existingIds = new Set(snapshot.accounts.map((account) => account.id));
  const missing = systemAccounts(now).filter((account) => !existingIds.has(account.id));
  if (missing.length === 0) {
    return snapshot;
  }
  return { ...snapshot, accounts: [...missing, ...snapshot.accounts] };
}
