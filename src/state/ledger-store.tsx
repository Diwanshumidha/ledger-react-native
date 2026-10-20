import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';

import { ledgerRepository, SNAPSHOT_VERSION, type LedgerRepository } from '@/data/repository';
import { validatePostings } from '@/domain/accounting';
import { today } from '@/domain/date';
import { emptySnapshot, withSystemAccounts } from '@/domain/seed';
import type { Account, JournalEntry, LedgerSnapshot, Posting, Profile } from '@/domain/types';

const PERSIST_DEBOUNCE_MS = 250;

function createId(prefix: string): string {
  const stamp = Date.now().toString(36);
  const noise = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${stamp}${noise}`;
}

interface LedgerState {
  snapshot: LedgerSnapshot;
  isHydrated: boolean;
}

type LedgerAction =
  | { type: 'hydrated'; snapshot: LedgerSnapshot }
  | { type: 'accountAdded'; account: Account }
  | { type: 'accountUpdated'; id: string; changes: Partial<Account> }
  | { type: 'accountDeleted'; id: string }
  | { type: 'entryAdded'; entry: JournalEntry }
  | {
      type: 'entryUpdated';
      id: string;
      changes: Pick<JournalEntry, 'date' | 'narration' | 'postings'>;
    }
  | { type: 'entryDeleted'; id: string }
  | { type: 'profileUpdated'; profile: Profile }
  | { type: 'reset'; snapshot: LedgerSnapshot };

function reducer(state: LedgerState, action: LedgerAction): LedgerState {
  switch (action.type) {
    case 'hydrated':
      return { snapshot: action.snapshot, isHydrated: true };

    case 'reset':
      return { snapshot: action.snapshot, isHydrated: true };

    case 'accountAdded':
      return {
        ...state,
        snapshot: {
          ...state.snapshot,
          accounts: [...state.snapshot.accounts, action.account],
        },
      };

    case 'accountUpdated':
      return {
        ...state,
        snapshot: {
          ...state.snapshot,
          accounts: state.snapshot.accounts.map((account) =>
            account.id === action.id ? { ...account, ...action.changes, id: account.id } : account,
          ),
        },
      };

    case 'accountDeleted':
      return {
        ...state,
        snapshot: {
          ...state.snapshot,
          accounts: state.snapshot.accounts.filter((account) => account.id !== action.id),
          // Removing a ledger must remove its postings too, or the journal
          // would keep references to an account that no longer exists.
          entries: state.snapshot.entries.filter(
            (entry) => !entry.postings.some((posting) => posting.accountId === action.id),
          ),
        },
      };

    case 'entryAdded':
      return {
        ...state,
        snapshot: {
          ...state.snapshot,
          entries: [...state.snapshot.entries, action.entry],
          nextVoucherNo: Math.max(state.snapshot.nextVoucherNo, action.entry.voucherNo + 1),
        },
      };

    case 'entryUpdated':
      return {
        ...state,
        snapshot: {
          ...state.snapshot,
          // Voucher number and creation time stay: an edit corrects the
          // record, it does not make a new one.
          entries: state.snapshot.entries.map((entry) =>
            entry.id === action.id ? { ...entry, ...action.changes } : entry,
          ),
        },
      };

    case 'profileUpdated':
      return {
        ...state,
        snapshot: { ...state.snapshot, profile: action.profile },
      };

    case 'entryDeleted':
      return {
        ...state,
        snapshot: {
          ...state.snapshot,
          entries: state.snapshot.entries.filter((entry) => entry.id !== action.id),
        },
      };
  }
}

export interface NewAccountInput {
  name: string;
  type: Account['type'];
  role: Account['role'];
  phone?: string;
  upiId?: string;
  note?: string;
}

export interface NewEntryInput {
  date?: string;
  narration: string;
  postings: Posting[];
}

export interface LedgerActions {
  addAccount(input: NewAccountInput): Account;
  updateAccount(id: string, changes: Partial<Account>): void;
  deleteAccount(id: string): void;
  /** Throws if the postings are unbalanced — the invariant is enforced here. */
  addEntry(input: NewEntryInput): JournalEntry;
  /** Replaces an entry's date, narration and postings. Throws if unbalanced. */
  updateEntry(id: string, input: NewEntryInput): void;
  deleteEntry(id: string): void;
  updateProfile(profile: Profile): void;
  resetBook(): void;
}

interface LedgerContextValue extends LedgerState {
  actions: LedgerActions;
}

const LedgerContext = createContext<LedgerContextValue | null>(null);

interface LedgerProviderProps {
  children: ReactNode;
  repository?: LedgerRepository;
}

export function LedgerProvider({ children, repository = ledgerRepository }: LedgerProviderProps) {
  const [state, dispatch] = useReducer(reducer, {
    snapshot: emptySnapshot(new Date().toISOString()),
    isHydrated: false,
  });

  useEffect(() => {
    let cancelled = false;

    repository
      .load()
      .then((stored) => {
        if (cancelled) {
          return;
        }
        const now = new Date().toISOString();
        const snapshot = stored ? withSystemAccounts(stored, now) : emptySnapshot(now);
        dispatch({ type: 'hydrated', snapshot: { ...snapshot, version: SNAPSHOT_VERSION } });
      })
      .catch(() => {
        if (!cancelled) {
          dispatch({ type: 'hydrated', snapshot: emptySnapshot(new Date().toISOString()) });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [repository]);

  // Debounced write-behind: rapid edits collapse into a single save.
  const pendingSave = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!state.isHydrated) {
      return;
    }
    if (pendingSave.current !== null) {
      clearTimeout(pendingSave.current);
    }
    const snapshot = state.snapshot;
    pendingSave.current = setTimeout(() => {
      void repository.save(snapshot);
    }, PERSIST_DEBOUNCE_MS);

    return () => {
      if (pendingSave.current !== null) {
        clearTimeout(pendingSave.current);
      }
    };
  }, [repository, state.isHydrated, state.snapshot]);

  const nextVoucherNo = state.snapshot.nextVoucherNo;

  const addAccount = useCallback((input: NewAccountInput): Account => {
    const account: Account = {
      id: createId('acc'),
      name: input.name.trim(),
      type: input.type,
      role: input.role,
      phone: input.phone?.trim() || undefined,
      upiId: input.upiId?.trim() || undefined,
      note: input.note?.trim() || undefined,
      isSystem: false,
      hue: Math.floor(Math.random() * 360),
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'accountAdded', account });
    return account;
  }, []);

  const updateAccount = useCallback((id: string, changes: Partial<Account>) => {
    dispatch({ type: 'accountUpdated', id, changes });
  }, []);

  const deleteAccount = useCallback((id: string) => {
    dispatch({ type: 'accountDeleted', id });
  }, []);

  const addEntry = useCallback(
    (input: NewEntryInput): JournalEntry => {
      const validation = validatePostings(input.postings);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(' '));
      }
      const entry: JournalEntry = {
        id: createId('ent'),
        voucherNo: nextVoucherNo,
        date: input.date ?? today(),
        narration: input.narration.trim(),
        postings: input.postings,
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: 'entryAdded', entry });
      return entry;
    },
    [nextVoucherNo],
  );

  const updateEntry = useCallback((id: string, input: NewEntryInput) => {
    const validation = validatePostings(input.postings);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(' '));
    }
    dispatch({
      type: 'entryUpdated',
      id,
      changes: {
        date: input.date ?? today(),
        narration: input.narration.trim(),
        postings: input.postings,
      },
    });
  }, []);

  const deleteEntry = useCallback((id: string) => {
    dispatch({ type: 'entryDeleted', id });
  }, []);

  const updateProfile = useCallback((profile: Profile) => {
    dispatch({ type: 'profileUpdated', profile });
  }, []);

  const resetBook = useCallback(() => {
    dispatch({ type: 'reset', snapshot: emptySnapshot(new Date().toISOString()) });
  }, []);

  const value = useMemo<LedgerContextValue>(
    () => ({
      snapshot: state.snapshot,
      isHydrated: state.isHydrated,
      actions: {
        addAccount,
        updateAccount,
        deleteAccount,
        addEntry,
        updateEntry,
        deleteEntry,
        updateProfile,
        resetBook,
      },
    }),
    [
      state.snapshot,
      state.isHydrated,
      addAccount,
      updateAccount,
      deleteAccount,
      addEntry,
      updateEntry,
      deleteEntry,
      updateProfile,
      resetBook,
    ],
  );

  return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>;
}

function useLedgerContext(): LedgerContextValue {
  const context = useContext(LedgerContext);
  if (context === null) {
    throw new Error('useLedger must be used inside a LedgerProvider.');
  }
  return context;
}

export function useLedger() {
  const { snapshot, isHydrated } = useLedgerContext();
  return { accounts: snapshot.accounts, entries: snapshot.entries, isHydrated };
}

export function useLedgerActions(): LedgerActions {
  return useLedgerContext().actions;
}

export function useProfile(): Profile {
  return useLedgerContext().snapshot.profile ?? {};
}

export function useAccount(id: string | undefined): Account | undefined {
  const { snapshot } = useLedgerContext();
  return snapshot.accounts.find((account) => account.id === id);
}
