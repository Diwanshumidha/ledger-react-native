# Ledger

A Khatabook-style ledger app with a real double-entry accounting core, built with Expo Router for
Android and the web from one codebase. You record what you gave and what you got; every tap is
stored as a balanced journal entry, so the trial balance always tallies.

## Get started

```bash
npm install
npm start        # then press 'a' for Android, 'w' for web
```

Other scripts: `npm run android`, `npm run web`, `npm run lint`, `npx tsc --noEmit`.

## How the accounting works

Every ledger the user creates is a real account with one of the five classical types
(`asset`, `liability`, `income`, `expense`, `equity`). Balances are never stored — they are derived
from postings, which is what makes the book self-checking.

A quick entry is a two-tap interaction that expands into a balanced voucher:

```
User taps:  Ramesh → You gave → 5,000 → Cash

Stored as:  Dr  Ramesh   5,000
                Cr  Cash      5,000

User sees:  Ramesh · You'll get ₹5,000
```

`You gave` means value left you and the party now owes you, so the party is **debited** and the
counter-account is **credited**. `You got` is the mirror image. The Journal tab shows the same data
in raw double-entry form, and the *Journal entry* mode of the composer lets you post any number of
Dr/Cr lines by hand — it refuses to save until debits equal credits.

Party balances are translated into plain wording at the edge of the system:
a debit balance reads "You'll get", a credit balance reads "You'll give".

### Shared expenses (split with other people)

An expense ledger — a gym membership, say — can be marked as **shared** and remembers its members,
default split and usual payer, so recording a bill is just the amount and who paid.

Splitting is ordinary double-entry, not a parallel system. **When you pay**, the whole bill passes
through your book:

```
Gym ₹2,000, split equally with Rahul, paid from Cash

  Dr  Gym    (your share)    1,000
  Dr  Rahul  (owes you)      1,000
          Cr  Cash                2,000
```

**When a member pays**, only your share belongs to you — the other participants settle with *them*,
not with you, so recording those shares would invent receivables you do not hold:

```
Gym ₹900 three ways, paid by Rahul

  Dr  Gym    (your share)      300
          Cr  Rahul                 300
```

The composer states which of the two it is doing and previews the exact postings before saving.

Equal splits distribute leftover paise to the earliest participants, so ₹1,000 three ways becomes
333.34 / 333.33 / 333.33 and the entry still balances to the paisa. Exact-amount splits refuse to
save until the shares add up to the bill.

The shared ledger shows **your spend** (what it has cost you), **bills recorded** (what passed
through your book) and what each member was billed *from that ledger*. Repayments are ordinary
entries on the person's own ledger, so they reduce that person's balance but deliberately do not
rewrite the per-ledger billing history.

### Money

Amounts are stored as **integer minor units (paise)**. Floating point never touches a stored
amount — only display formatting, via `Intl.NumberFormat`. See `src/domain/money.ts`.

## Project layout

```
src/
  domain/       Pure accounting core — no React, no I/O
    money.ts        integer-paise money type, parsing and formatting
    types.ts        Account, Posting, JournalEntry, StatementLine
    accounting.ts   posting rules, validation, balances, statement, trial balance
    split.ts        share allocation and the postings a shared expense produces
    date.ts         calendar-date helpers ("Today", "Yesterday")
    seed.ts         the Cash and Bank ledgers every book starts with
  data/
    repository.ts   LedgerRepository port + AsyncStorage adapter
  state/
    ledger-store.tsx  React context, reducer, hydration and debounced persistence
  components/
    ui/             generic primitives (Button, Screen, Avatar, dialogs, chips)
    ledger/         domain-aware pieces (LedgerRow, StatementRow, DirectionToggle…)
  app/            Expo Router routes
    (tabs)/index.tsx    Ledgers list
    (tabs)/journal.tsx  Day book
    ledger/[id].tsx     Ledger statement
    ledger/new.tsx      Create ledger (modal)
    entry/new.tsx       Entry composer (modal) — quick and journal modes
    entry/split.tsx     Shared-expense composer (modal)
    entry/[id].tsx      Voucher detail (modal)
    ledger/split-group.tsx  Who a shared expense is split with (modal)
```

The domain layer is deliberately free of React and storage concerns, so the posting rules can be
tested and reused without a renderer.

## Persistence

Data is local-first and offline — there is no server and no login. The app talks only to the
`LedgerRepository` interface in `src/data/repository.ts`; the shipped adapter stores one JSON
snapshot in AsyncStorage, which is SQLite-backed on Android and `localStorage` on web. Writes are
debounced so rapid edits collapse into a single save.

To move to SQLite or add cloud sync later, implement `LedgerRepository` and pass it to
`<LedgerProvider repository={…}>` — no screen needs to change.

**Android storage ceiling:** AsyncStorage defaults to a 6 MB database on Android. That is many
thousands of entries, but if you expect very large books, either raise
`AsyncStorage_db_size_in_MB` in `android/gradle.properties` or swap in a SQLite adapter.

## Cross-platform notes

- **Tabs** — `app-tabs.tsx` uses native tabs on Android/iOS; `app-tabs.web.tsx` renders a floating
  top bar for the web.
- **Statement layout** — the ledger statement shows full `Date | Particulars | Debit | Credit |
  Balance` columns on wide viewports and collapses to a single tinted amount on phones
  (`WIDE_STATEMENT_BREAKPOINT`).
- **Dialogs** — `Alert.alert` is unreliable on react-native-web, so confirmations use a real
  `Modal` (`components/ui/confirm-dialog.tsx`).

## Animation

Transforms and opacity run on the UI thread through Reanimated: staggered `FadeInDown` list
entrances, `LinearTransition` when rows reorder, spring-scaled press feedback on every tappable
surface, a sliding indicator on the You gave / You got toggle, and a shake on a rejected amount.

The one deliberate exception is the balance count-up (`components/ui/animated-money.tsx`), which
runs on the JS thread with `requestAnimationFrame` — the animated value is *text* that must be
re-formatted through `Intl` on every frame, which cannot happen inside a worklet.

## Not built yet

Reports (trial balance report, P&L, per-ledger PDF/CSV export), editing an existing entry,
settle-up (a one-tap "Rahul clears his split balance"), weighted/percentage splits, attachments,
reminders, and multi-book support. The trial balance is already computed in
`domain/accounting.ts` and surfaced as a "Tallied / Off" indicator on the Journal tab.
