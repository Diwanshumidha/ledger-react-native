import AsyncStorage from '@react-native-async-storage/async-storage';

import type { LedgerSnapshot } from '@/domain/types';

const STORAGE_KEY = 'ledger.snapshot.v1';

export const SNAPSHOT_VERSION = 1;

/**
 * The persistence seam. The app only ever talks to this interface, so the
 * AsyncStorage implementation below can be swapped for SQLite or a sync
 * backend without touching a screen.
 */
export interface LedgerRepository {
  load(): Promise<LedgerSnapshot | null>;
  save(snapshot: LedgerSnapshot): Promise<void>;
  clear(): Promise<void>;
}

function isSnapshot(value: unknown): value is LedgerSnapshot {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<LedgerSnapshot>;
  return Array.isArray(candidate.accounts) && Array.isArray(candidate.entries);
}

/**
 * AsyncStorage is backed by SQLite on Android and localStorage on web, which
 * covers both targets with one implementation. Note the Android default
 * database ceiling of 6 MB — see README if you expect very large journals.
 */
export class AsyncStorageLedgerRepository implements LedgerRepository {
  async load(): Promise<LedgerSnapshot | null> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return null;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      return isSnapshot(parsed) ? parsed : null;
    } catch {
      // A corrupted blob should not brick the app; start fresh instead.
      return null;
    }
  }

  async save(snapshot: LedgerSnapshot): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
  }
}

export const ledgerRepository: LedgerRepository = new AsyncStorageLedgerRepository();
